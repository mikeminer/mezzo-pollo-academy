import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ArcadeError, POLICY, TIERS, SYSTEM_PROGRAM, MEMO_PROGRAM, encode58, decode58, digest, requestSecret, loadConfig } from '../server/arcade-config.mjs';
import { buildTransaction, verifyTransaction, SolanaRpc, memoFor } from '../server/arcade-chain.mjs';
import { ArcadeService } from '../server/arcade-service.mjs';
import { createHandler } from '../api/arcade.mjs';
import { arcadeMessage } from '../arcade-transaction.mjs';

const PAYER = 'Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump';
const HASH = encode58(Buffer.alloc(32, 2));
const SIGNATURE = encode58(Buffer.alloc(64, 7));
const clone = structuredClone;
const walletFixture = JSON.parse(readFileSync(new URL('./fixtures/arcade-wallet-finalized.json', import.meta.url), 'utf8'));
function intent(tier = 'god') {
  return { intentId: randomUUID(), payer: PAYER, tier, ...TIERS[tier], reference: encode58(Buffer.alloc(32, 3)),
    secretHash: digest('a'.repeat(43)), status: 'pending', revision: 0, prepared: null, createdAt: 1 };
}
function paidTransaction(record) {
  const data = Buffer.alloc(12); data.writeUInt32LE(2); data.writeBigUInt64LE(BigInt(record.lamports), 4);
  return { slot: 42, version: 'legacy', meta: { err: null, fee: 5000, innerInstructions: [],
    preBalances: [1e9, 100, 0, 1, 1], postBalances: [1e9 - record.lamports - 5000, 100 + record.lamports, 0, 1, 1] },
  transaction: { signatures: [SIGNATURE], message: {
    header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 3 },
    accountKeys: [record.payer, POLICY.recipient, record.reference, SYSTEM_PROGRAM, MEMO_PROGRAM],
    recentBlockhash: HASH, instructions: [
      { programIdIndex: 3, accounts: [0, 1, 2], data: encode58(data) },
      { programIdIndex: 4, accounts: [0], data: encode58(Buffer.from(memoFor(record.intentId))) },
    ],
  } } };
}

class MemoryStore {
  records = new Map(); requests = new Map(); signatures = new Map();
  async ready() {}
  async rateLimit() {}
  async get(id) { return clone(this.records.get(id) || null); }
  async create(requestId, candidate) {
    if (this.requests.has(requestId)) return this.get(this.requests.get(requestId));
    this.requests.set(requestId, candidate.intentId); this.records.set(candidate.intentId, clone(candidate)); return clone(candidate);
  }
  async transition(id, action, data) {
    const record = this.records.get(id);
    if (!record) throw new ArcadeError('intent_not_found', 404);
    if (action === 'prepare') {
      if (record.status !== 'pending' || record.revision !== data.revision) return { record: clone(record), changed: false };
      record.prepared = data.prepared;
    } else if (action === 'paid') {
      if (record.status !== 'pending') {
        if (record.signature !== data.signature) throw new ArcadeError('payment_conflict', 409);
        return { record: clone(record), changed: false };
      }
      if (this.signatures.has(data.signature) && this.signatures.get(data.signature) !== id) throw new ArcadeError('payment_already_used', 409);
      this.signatures.set(data.signature, id); Object.assign(record, { status: 'paid', signature: data.signature, slot: data.slot });
    } else if (action === 'start') {
      if (record.status === 'started') {
        if (record.runId !== data.runId) throw new ArcadeError('payment_already_used', 409);
        return { record: clone(record), changed: false };
      }
      if (record.status !== 'paid') throw new ArcadeError('payment_required', 409);
      Object.assign(record, { status: 'started', runId: data.runId });
    }
    record.revision += 1; return { record: clone(record), changed: true };
  }
}
function harness() {
  const store = new MemoryStore();
  const rpc = { assertMainnet: async () => {}, recipientReady: async () => {},
    latest: async () => ({ blockhash: HASH, lastValidBlockHeight: 100 }),
    finalizedContext: async () => ({ height: 50, slot: 120 }), signatures: async () => [], transaction: async () => null };
  const service = new ArcadeService({ store, rpc });
  return { store, rpc, service, create: async (tier = 'god') => service.create({ payer: PAYER, tier, requestId: randomUUID() }) };
}

for (const [tier, policy] of Object.entries(TIERS)) {
  test(`exact ${tier} price and lives are verified and serialized`, async () => {
    const record = intent(tier);
    assert.deepEqual(verifyTransaction(paidTransaction(record), record, SIGNATURE), { signature: SIGNATURE, slot: 42 });
    const wire = Buffer.from(buildTransaction(record, HASH), 'base64');
    assert.equal(wire[0], 1); assert.ok(wire.subarray(1, 65).every(byte => byte === 0));
    assert.deepEqual([...wire.subarray(65, 69)], [1, 0, 3, 5]);
    assert.equal(wire.readBigUInt64LE(272), BigInt(policy.lamports));
    assert.deepEqual(wire.subarray(65), Buffer.from(arcadeMessage({ ...record, recipient: POLICY.recipient, network: POLICY.network, blockhash: HASH })));
    const { create } = harness(); const created = await create(tier);
    assert.equal(created.lamports, policy.lamports); assert.equal(created.lives, policy.lives); assert.equal(created.tier, tier);
  });
}

const mutations = {
  'failed transaction': tx => { tx.meta.err = { InstructionError: [0, 'Custom'] }; },
  'missing metadata': tx => { tx.meta = null; },
  'wrong recipient': tx => { tx.transaction.message.accountKeys[1] = PAYER; },
  'wrong payer': tx => { tx.transaction.message.accountKeys[0] = POLICY.recipient; },
  'wrong reference': tx => { tx.transaction.message.accountKeys[2] = HASH; },
  'wrong program': tx => { tx.transaction.message.accountKeys[3] = MEMO_PROGRAM; },
  'reference outside transfer': tx => { tx.transaction.message.instructions[0].accounts = [0, 1]; },
  'unsigned memo': tx => { tx.transaction.message.instructions[1].accounts = []; },
  'wrong memo': tx => { tx.transaction.message.instructions[1].data = encode58(Buffer.from(memoFor(randomUUID()))); },
  'extra debit instruction': tx => { tx.transaction.message.instructions.push(clone(tx.transaction.message.instructions[0])); },
  'inner instructions': tx => { tx.meta.innerInstructions = [{ index: 0, instructions: [{}] }]; },
  'wrong signer count': tx => { tx.transaction.message.header.numRequiredSignatures = 2; },
  'reference writable': tx => { tx.transaction.message.header.numReadonlyUnsignedAccounts = 2; },
  'wrong signature': tx => { tx.transaction.signatures[0] = encode58(Buffer.alloc(64, 8)); },
  'versioned transaction': tx => { tx.version = 0; },
  'recipient not credited': tx => { tx.meta.postBalances[1] -= 1; },
  'extra payer debit': tx => { tx.meta.postBalances[0] -= 1; },
  'unsafe balance number': tx => { tx.meta.preBalances[0] = Number.MAX_SAFE_INTEGER + 1; },
  'underpayment': tx => { const data = decode58(tx.transaction.message.instructions[0].data, 12); data.writeBigUInt64LE(9_999_999n, 4); tx.transaction.message.instructions[0].data = encode58(data); },
  'overpayment': tx => { const data = decode58(tx.transaction.message.instructions[0].data, 12); data.writeBigUInt64LE(10_000_001n, 4); tx.transaction.message.instructions[0].data = encode58(data); },
};
for (const [name, mutate] of Object.entries(mutations)) test(`rejects ${name}`, () => {
  const record = intent(); const tx = paidTransaction(record); mutate(tx);
  assert.throws(() => verifyTransaction(tx, record, SIGNATURE), error => error.code === 'payment_mismatch');
});

test('wallet receipt shape accepts reordered keys, compute fees and read-only Lighthouse guards', () => {
  assert.equal(walletFixture.synthetic, true);
  assert.deepEqual(verifyTransaction(walletFixture.json, walletFixture.intent, walletFixture.signature),
    { signature: walletFixture.signature, slot: walletFixture.json.slot });
  assert.deepEqual(walletFixture.base64.meta, walletFixture.json.meta);
  assert.equal(walletFixture.base64.transaction[1], 'base64');
});

for (const [tier, policy] of Object.entries(TIERS)) test(`wallet-added protection preserves the exact ${tier} price and lives`, () => {
  const record = { ...walletFixture.intent, tier, ...policy }, tx = clone(walletFixture.json);
  const data = decode58(tx.transaction.message.instructions[0].data, 12);
  data.writeBigUInt64LE(BigInt(policy.lamports), 4);
  tx.transaction.message.instructions[0].data = encode58(data);
  tx.meta.postBalances[0] = tx.meta.preBalances[0] - policy.lamports - tx.meta.fee;
  tx.meta.postBalances[1] = tx.meta.preBalances[1] + policy.lamports;
  assert.equal(verifyTransaction(tx, record, walletFixture.signature).slot, tx.slot);
  assert.throws(() => verifyTransaction(tx, { ...record, lives: policy.lives + 1 }, walletFixture.signature), { code: 'payment_mismatch' });
});

function replaceGuard(tx, bytes) { tx.transaction.message.instructions[4].data = encode58(Buffer.from(bytes)); }
const walletMutations = {
  'unknown wallet program': tx => { tx.transaction.message.accountKeys[5] = HASH; },
  'extra signer': tx => { tx.transaction.message.header.numRequiredSignatures = 2; },
  'extra writable account': tx => { tx.transaction.message.header.numReadonlyUnsignedAccounts--; },
  'changed reference': tx => { tx.transaction.message.accountKeys[4] = HASH; },
  'memo without payer signer': tx => { tx.transaction.message.instructions[1].accounts = []; },
  'another transfer': tx => { tx.transaction.message.instructions.push(clone(tx.transaction.message.instructions[0])); },
  'additional fee/debit': tx => { tx.meta.postBalances[0]--; },
  'readonly balance change': tx => { tx.meta.postBalances[4]++; },
  'inner side effect': tx => { tx.meta.innerInstructions = [{ index: 4, instructions: [{}] }]; },
  'loaded account': tx => { tx.meta.loadedAddresses = { readonly: [HASH], writable: [] }; },
  'duplicate compute budget': tx => { tx.transaction.message.instructions.push(clone(tx.transaction.message.instructions[2])); },
  'compute accounts': tx => { tx.transaction.message.instructions[2].accounts = [0]; },
  'unknown compute opcode': tx => { tx.transaction.message.instructions[2].data = encode58(Buffer.from([1, 0, 128, 0, 0])); },
  'zero compute limit': tx => { tx.transaction.message.instructions[2].data = encode58(Buffer.from([2, 0, 0, 0, 0])); },
  'excess compute limit': tx => { const data = Buffer.alloc(5); data[0] = 2; data.writeUInt32LE(1_400_001, 1); tx.transaction.message.instructions[2].data = encode58(data); },
  'truncated compute price': tx => { tx.transaction.message.instructions[3].data = encode58(Buffer.from([3, 1])); },
  'memory write': tx => replaceGuard(tx, [0, 0, 0]),
  'memory close': tx => replaceGuard(tx, [1, 0, 0]),
  'unknown assertion': tx => replaceGuard(tx, [5, 0, 8]),
  'invalid log ordinal': tx => replaceGuard(tx, [5, 7, 5, 1, 0]),
  'truncated assertion': tx => replaceGuard(tx, [5, 0, 0, 1]),
  'trailing assertion data': tx => replaceGuard(tx, [5, 0, 5, 1, 0, 0]),
  'nonboolean assertion': tx => replaceGuard(tx, [5, 0, 5, 2, 0]),
  'unknown known owner': tx => replaceGuard(tx, [5, 0, 3, 9, 0]),
  'invalid integer operator': tx => replaceGuard(tx, [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8]),
  'invalid equality operator': tx => replaceGuard(tx, [5, 0, 5, 1, 2]),
  'noncanonical assertion count': tx => replaceGuard(tx, [6, 0, 129, 0, 5, 1, 0]),
  'too many assertions': tx => replaceGuard(tx, [6, 0, 9, ...Array(9).fill([5, 1, 0]).flat()]),
  'wrong assertion target': tx => { tx.transaction.message.instructions[4].accounts = [4]; },
  'extra assertion target': tx => { tx.transaction.message.instructions[4].accounts = [0, 1]; },
  'too many guard instructions': tx => { tx.transaction.message.instructions.push(...Array(3).fill(tx.transaction.message.instructions[4]).map(value => clone(value))); },
};
for (const [name, mutate] of Object.entries(walletMutations)) test(`wallet compatibility still rejects ${name}`, () => {
  const tx = clone(walletFixture.json); mutate(tx);
  assert.throws(() => verifyTransaction(tx, walletFixture.intent, walletFixture.signature), { code: 'payment_mismatch' });
});

test('bounded read-only account-info assertions accept their audited serialized variants', () => {
  const assertions = [
    [0, ...Buffer.alloc(8), 4], [1, ...Buffer.alloc(8), 0], [4, ...Buffer.alloc(8), 7],
    [2, ...decode58(SYSTEM_PROGRAM, 32), 0], [3, 8, 1], [5, 1, 0], [6, 0, 1], [7, 0, 0],
  ];
  for (const assertion of assertions) {
    const tx = clone(walletFixture.json); replaceGuard(tx, [5, 0, ...assertion]);
    assert.equal(verifyTransaction(tx, walletFixture.intent, walletFixture.signature).slot, tx.slot);
  }
  const tx = clone(walletFixture.json);
  replaceGuard(tx, [6, 6, assertions.length, ...assertions.flat()]);
  assert.equal(verifyTransaction(tx, walletFixture.intent, walletFixture.signature).slot, tx.slot);
});

test('tier cannot be escalated through client lives or reused request ID', async () => {
  const { service } = harness(); const requestId = randomUUID();
  const first = await service.create({ payer: PAYER, tier: 'hard', lives: 999, lamports: 0, requestId });
  assert.equal(first.lives, 1); assert.equal(first.lamports, 1_000_000);
  assert.equal((await service.create({ payer: PAYER, tier: 'hard', requestId })).intentId, first.intentId);
  await assert.rejects(service.create({ payer: PAYER, tier: 'god', requestId }), { code: 'tier_mismatch' });
  for (const tier of [undefined, 'HARD', '__proto__', 'toString']) await assert.rejects(service.create({ payer: PAYER, tier, requestId: randomUUID() }), { code: 'invalid_tier' });
});
test('intent capability blocks public receipt lookup and wallet changes', async () => {
  const { create, service } = harness(); const created = await create();
  await assert.rejects(service.status({ ...created, secret: 'x'.repeat(43) }), { code: 'intent_not_found' });
  await assert.rejects(service.status({ intentId: created.intentId }), { code: 'intent_not_found' });
  assert.equal((await service.status(created)).status, 'pending');
});
test('prepared bytes remain identical before blockhash expiration', async () => {
  const { create, service, rpc } = harness(); const created = await create();
  const first = await service.prepare(created);
  rpc.latest = () => { throw new Error('must not replace a live transaction'); };
  const retry = await service.prepare(created);
  assert.equal(first.transaction, retry.transaction); assert.equal(retry.canPay, true);
});
test('unfinalized observation blocks another payment', async () => {
  const { create, service, rpc } = harness(); const created = await create();
  await service.prepare(created); rpc.signatures = async () => [{ signature: SIGNATURE, err: null }];
  rpc.latest = () => { throw new Error('must not make another payment'); };
  const pending = await service.prepare(created); assert.equal(pending.canPay, false); assert.equal(pending.confirming, true);
});
test('expired transaction repeats reference scan at the finalized context before replacement', async () => {
  const { create, service, rpc } = harness(); const created = await create();
  await service.prepare(created); rpc.finalizedContext = async () => ({ height: 101, slot: 200 });
  const scans = []; rpc.signatures = async (reference, minContextSlot) => { scans.push(minContextSlot); return []; };
  rpc.latest = async () => ({ blockhash: encode58(Buffer.alloc(32, 9)), lastValidBlockHeight: 200 });
  const retry = await service.prepare(created);
  assert.deepEqual(scans, [undefined, 200]); assert.equal(retry.lastValidBlockHeight, 200); assert.equal(retry.canPay, true);
});
test('payment landing between first history scan and expiry check is recovered without second charge', async () => {
  const { create, service, rpc, store } = harness(); const created = await create();
  await service.prepare(created); rpc.finalizedContext = async () => ({ height: 101, slot: 200 });
  rpc.signatures = async (reference, minContextSlot) => minContextSlot ? [{ signature: SIGNATURE, err: null }] : [];
  rpc.transaction = async () => paidTransaction(await store.get(created.intentId));
  rpc.latest = () => { throw new Error('must recover original payment'); };
  const paid = await service.prepare(created); assert.equal(paid.status, 'paid'); assert.equal(paid.canPay, false);
});
test('a returned but never-landed signature is retained until safe expiry, then replacement is allowed', async () => {
  const { create, service, rpc } = harness(); const created = await create(); await service.prepare(created);
  const pending = { ...created, signature: SIGNATURE };
  assert.equal((await service.status(pending)).signature, SIGNATURE);
  assert.equal((await service.prepare(pending)).canPay, false);
  rpc.finalizedContext = async () => ({ height: 101, slot: 200 });
  rpc.latest = async () => ({ blockhash: encode58(Buffer.alloc(32, 9)), lastValidBlockHeight: 200 });
  const retry = await service.prepare(pending);
  assert.equal(retry.canPay, true); assert.equal(retry.signature, null); assert.equal(retry.lastValidBlockHeight, 200);
});
test('reference-observed but unfinalized signature remains pending even after blockhash expiry', async () => {
  const { create, service, rpc } = harness(); const created = await create(); await service.prepare(created);
  rpc.finalizedContext = async () => ({ height: 101, slot: 200 });
  rpc.signatures = async () => [{ signature: SIGNATURE, err: null }];
  rpc.latest = () => { throw new Error('must not replace potentially settled payment'); };
  assert.equal((await service.prepare({ ...created, signature: SIGNATURE })).canPay, false);
});
test('wallet signature loss recovers by reference and each credit grants only one run', async () => {
  const { create, service, rpc, store } = harness(); const created = await create('easy');
  rpc.signatures = async () => [{ signature: SIGNATURE, err: null }];
  rpc.transaction = async () => paidTransaction(await store.get(created.intentId));
  assert.equal((await service.status(created)).status, 'paid');
  const runId = randomUUID();
  const results = await Promise.all(Array.from({ length: 12 }, () => service.start({ ...created, runId })));
  assert.equal(results.filter(result => result.admitted).length, 1);
  assert.ok(results.every(result => result.runId === runId && result.lives === 9));
  await assert.rejects(service.start({ ...created, runId: randomUUID() }), { code: 'payment_already_used' });
});
test('unpaid credit and unrelated signatures cannot grant a run', async () => {
  const { create, service, rpc } = harness(); const created = await create();
  await assert.rejects(service.start({ ...created, runId: randomUUID() }), { code: 'payment_required' });
  rpc.transaction = async () => paidTransaction(intent());
  await assert.rejects(service.status({ ...created, signature: SIGNATURE }), { code: 'payment_mismatch' });
});
test('chain/RPC failure fails closed before checkout', async () => {
  const { service, rpc } = harness(); rpc.assertMainnet = async () => { throw new ArcadeError('wrong_network', 503); };
  await assert.rejects(service.create({ requestId: randomUUID(), payer: PAYER, tier: 'god' }), { code: 'wrong_network' });
  const wrong = new SolanaRpc('https://rpc.example', async () => ({ ok: true, json: async () => ({ result: 'devnet' }) }));
  await assert.rejects(wrong.assertMainnet(), { code: 'wrong_network' });
});
test('mainnet readiness requires the full RPC genesis hash, not a shortened CAIP chain identifier', async () => {
  const rpc = value => new SolanaRpc('https://rpc.example', async () => ({ ok: true, json: async () => ({ result: value }) }));
  await rpc('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d').assertMainnet();
  await assert.rejects(rpc('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp').assertMainnet(), { code: 'wrong_network' });
  assert.equal(decode58(POLICY.genesisHash, 32).length, 32);
});
test('RPC uses finalized transactions and bounded reference lookup', async () => {
  const calls = []; const rpc = new SolanaRpc('https://rpc.example', async (url, options) => {
    const body = JSON.parse(options.body); calls.push(body); return { ok: true, json: async () => ({ result: body.method === 'getTransaction' ? null : [] }) };
  });
  await rpc.transaction(SIGNATURE); await rpc.signatures(HASH, 555);
  assert.equal(calls[0].params[1].commitment, 'finalized');
  assert.deepEqual(calls[1].params[1], { commitment: 'confirmed', limit: 20, minContextSlot: 555 });
});
test('missing environment never enables payments', () => {
  for (const env of [{}, { ARCADE_ENABLED: 'true' }, { ARCADE_ENABLED: 'false', DATABASE_URL: 'postgres://u:p@a.neon.tech/db', ARCADE_SOLANA_RPC_URL: 'https://rpc.example' }]) {
    assert.throws(() => loadConfig(env), { code: 'arcade_unavailable' });
  }
});

async function apiRequest(handler, request) {
  const headers = {}; let output = '';
  const response = { setHeader: (key, value) => { headers[key] = value; }, end: value => { output = value || ''; } };
  await handler(request, response); return { status: response.statusCode, headers, body: output ? JSON.parse(output) : null };
}
test('API rejects foreign origins, form requests and oversized bodies before service work', async () => {
  const handler = createHandler({ env: {}, makeService: () => { throw new Error('must not run'); } });
  assert.equal((await apiRequest(handler, { method: 'POST', headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await apiRequest(handler, { method: 'GET', headers: {} })).status, 503);
  const allowed = await apiRequest(handler, { method: 'OPTIONS', headers: { origin: 'https://mezzopollo.it' } });
  assert.equal(allowed.status, 204); assert.equal(allowed.headers['Access-Control-Allow-Origin'], 'https://mezzopollo.it');
  const { service } = harness();
  const configured = createHandler({ env: { ARCADE_ENABLED: 'true', DATABASE_URL: 'postgres://u:p@a.neon.tech/db', ARCADE_SOLANA_RPC_URL: 'https://rpc.example' }, makeService: () => service });
  assert.equal((await apiRequest(configured, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: {} })).status, 415);
  assert.equal((await apiRequest(configured, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '5000' }, body: {} })).status, 413);
  assert.equal((await apiRequest(configured, { method: 'POST', headers: { 'content-type': 'application/json' }, body: { action: 'unknown' } })).status, 400);
  const config = await apiRequest(configured, { method: 'GET', headers: {} });
  assert.equal(config.status, 200); assert.deepEqual(config.body.tiers, TIERS);
});
test('base58 handles canonical leading zeros and rejects malformed addresses', () => {
  for (const buffer of [Buffer.alloc(32), Buffer.alloc(32, 255), Buffer.concat([Buffer.alloc(31), Buffer.from([1])])]) assert.deepEqual(decode58(encode58(buffer), 32), buffer);
  for (const value of ['', '0'.repeat(32), '1'.repeat(31), '1'.repeat(33)]) assert.throws(() => decode58(value, 32));
  assert.equal(requestSecret(randomUUID()).length, 43);
});
