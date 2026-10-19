// Explicit opt-in: run against an isolated Neon branch with the schema already installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { PostgresStore } from '../server/arcade-store.mjs';
import { digest, encode58, TIERS } from '../server/arcade-config.mjs';

if (!process.env.ARCADE_TEST_DATABASE_URL) throw new Error('ARCADE_TEST_DATABASE_URL must identify the isolated test branch.');
const sql = neon(process.env.ARCADE_TEST_DATABASE_URL);
const store = new PostgresStore(sql);
const createdIds = [];
function candidate(tier = 'god') {
  const intentId = randomUUID(); createdIds.push(intentId);
  return { intentId, payer: 'Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump', reference: encode58(randomBytes(32)),
    tier, ...TIERS[tier], status: 'pending', revision: 0, secretHash: digest(randomUUID()), createdAt: Date.now(), prepared: null };
}
async function create(tier) { return store.create(randomUUID(), candidate(tier)); }
async function pay(record, signature = encode58(randomBytes(64))) { return store.transition(record.intentId, 'paid', { signature, slot: 1, now: Date.now() }); }

test('actual Postgres atomic ledger and durable recovery', async t => {
  try {
    await store.ready();
    await t.test('parallel retries create one durable intent', async () => {
      const requestId = randomUUID();
      const records = await Promise.all(Array.from({ length: 12 }, () => store.create(requestId, candidate('easy'))));
      assert.equal(new Set(records.map(record => record.intentId)).size, 1);
      assert.equal(records[0].lives, 9);
    });
    await t.test('parallel preparations have one CAS winner', async () => {
      const record = await create('medium');
      const results = await Promise.all(Array.from({ length: 12 }, (_, index) => store.transition(record.intentId, 'prepare', {
        revision: 0, prepared: { blockhash: encode58(randomBytes(32)), lastValidBlockHeight: 100 + index },
      })));
      assert.equal(results.filter(result => result.changed).length, 1);
      assert.equal(new Set(results.map(result => result.record.prepared.blockhash)).size, 1);
    });
    await t.test('one signature cannot pay two intents concurrently', async () => {
      const first = await create('hard'), second = await create('hard'), signature = encode58(randomBytes(64));
      const results = await Promise.allSettled([pay(first, signature), pay(second, signature)]);
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal(results.find(result => result.status === 'rejected').reason.code, 'payment_already_used');
    });
    await t.test('twenty simultaneous start requests admit exactly once', async () => {
      const record = await create('god'); await pay(record); const runId = randomUUID();
      const results = await Promise.all(Array.from({ length: 20 }, () => store.transition(record.intentId, 'start', { runId, now: Date.now() })));
      assert.equal(results.filter(result => result.changed).length, 1);
      assert.ok(results.every(result => result.record.runId === runId && result.record.lives === 32));
      await assert.rejects(store.transition(record.intentId, 'start', { runId: randomUUID(), now: Date.now() }), { code: 'payment_already_used' });
      const recovered = await new PostgresStore(neon(process.env.ARCADE_TEST_DATABASE_URL)).get(record.intentId);
      assert.equal(recovered.status, 'started'); assert.equal(recovered.runId, runId);
    });
    await t.test('unpaid start and mismatched tier values fail closed', async () => {
      const record = await create('easy');
      await assert.rejects(store.transition(record.intentId, 'start', { runId: randomUUID(), now: Date.now() }), { code: 'payment_required' });
      const invalid = candidate('hard'); invalid.lives = 999;
      await assert.rejects(store.create(randomUUID(), invalid), { code: 'storage_unavailable' });
    });
  } finally {
    // Exact generated IDs only. Never truncate, reset or delete pre-existing ledger data.
    if (createdIds.length) await sql.query('DELETE FROM public.mezzopollo_arcade_intents WHERE intent_id = ANY($1::uuid[])', [createdIds]);
  }
});
