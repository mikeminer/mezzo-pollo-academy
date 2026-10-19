import test from 'node:test';
import assert from 'node:assert/strict';
import { createArcadeClient } from '../arcade-client.mjs';
import {
  ARCADE_RECIPIENT, ARCADE_TIERS, arcadeMessage, decode58, encode58,
  sendArcadePayment, validateIntent,
} from '../arcade-transaction.mjs';
import { buildTransaction } from '../server/arcade-chain.mjs';

// Every wallet, transport and storage operation below is an in-memory fake.
// No RPC calls, signatures, real wallets or SOL transfers are made by this suite.
const PAYER = encode58(new Uint8Array(32).fill(11));
const OTHER_PAYER = encode58(new Uint8Array(32).fill(12));
const REFERENCE = encode58(new Uint8Array(32).fill(21));
const OTHER_REFERENCE = encode58(new Uint8Array(32).fill(22));
const BLOCKHASH = encode58(new Uint8Array(32).fill(31));
const SIGNATURE = encode58(new Uint8Array(64).fill(41));
const INTENT = '00000000-0000-4000-8000-000000000010';
const SECRET = 'a'.repeat(43);
const KEY = 'mp_arcade_pending_v1';
const clone = value => structuredClone(value);

function intent(tier = 'hard') {
  return {
    intentId: INTENT, payer: PAYER, reference: REFERENCE, tier,
    recipient: ARCADE_RECIPIENT, network: 'mainnet-beta',
    lamports: ARCADE_TIERS[tier].lamports, lives: ARCADE_TIERS[tier].lives,
    status: 'pending', signature: null, runId: null,
    blockhash: BLOCKHASH, lastValidBlockHeight: 1234,
  };
}

function memoryStorage({ failRead = false, failWriteAt = Infinity, failRemove = false } = {}) {
  const values = new Map();
  let writes = 0;
  return {
    values,
    getItem(key) { if (failRead) throw Error('storage_unavailable'); return values.get(key) ?? null; },
    setItem(key, value) { if (++writes === failWriteAt) throw Error('storage_unavailable'); values.set(key, value); },
    removeItem(key) { if (failRemove) throw Error('storage_unavailable'); values.delete(key); },
  };
}

function harness(options = {}) {
  const storage = options.storage || memoryStorage();
  const calls = [], notifications = [], sends = [], connects = [];
  let state = null, sequence = 0;
  const provider = {
    isPhantom: true, publicKey: PAYER,
    async connect() { connects.push(this.publicKey); return { publicKey: this.publicKey }; },
  };
  const api = async input => {
    calls.push(clone(input));
    if (options.failAction === input.action) throw Error('arcade_unavailable');
    let result;
    if (input.action === 'config') result = { enabled: true };
    else if (input.action === 'create') {
      if (!state) state = { ...intent(input.tier), payer: input.payer };
      result = { ...state, secret: SECRET };
    } else {
      assert.ok(state, 'An intent must exist before payment operations');
      assert.equal(input.intentId, state.intentId);
      assert.equal(input.secret, SECRET);
      if (input.action === 'prepare') result = { ...state, canPay: options.canPay !== false };
      else if (input.action === 'status') result = { ...state };
      else if (input.action === 'start') {
        const admitted = state.status === 'paid';
        if (admitted) state = { ...state, status: 'started', runId: input.runId };
        result = { ...state, admitted };
      } else throw Error('Unexpected action: ' + input.action);
    }
    return options.transform ? options.transform(input.action, clone(result)) : clone(result);
  };
  const send = async (wallet, prepared) => {
    // Exercise the production canonical-message checks before the fake transport.
    arcadeMessage(prepared);
    sends.push(clone(prepared));
    assert.equal(wallet, provider);
    if (options.send) return options.send({ prepared, paid, state: () => state });
    if (options.confirmed !== false) paid();
    return { signature: SIGNATURE };
  };
  function paid() { state = { ...state, status: 'paid', signature: SIGNATURE }; }
  function makeClient() {
    return createArcadeClient({ request: api, storage, getProvider: () => provider,
      notify: value => notifications.push(value), send, withLock: options.withLock,
      uuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` });
  }
  return { client: makeClient(), makeClient, storage, calls, sends, connects, notifications, provider,
    paid, state: () => clone(state) };
}

for (const [tier, expected] of Object.entries({
  hard: { lives: 1, lamports: 1_000_000 }, medium: { lives: 3, lamports: 2_000_000 },
  easy: { lives: 9, lamports: 3_000_000 }, god: { lives: 32, lamports: 10_000_000 },
})) {
  test(`${tier}: browser canonical bytes match the server's exact payment transaction`, () => {
    const record = intent(tier);
    assert.equal(record.lives, expected.lives);
    assert.equal(record.lamports, expected.lamports);
    const wire = Buffer.from(buildTransaction(record, BLOCKHASH), 'base64');
    assert.equal(wire[0], 1);
    assert.deepEqual(wire.subarray(1, 65), Buffer.alloc(64));
    assert.deepEqual(Buffer.from(arcadeMessage(record)), wire.subarray(65));
    assert.equal(encode58(decode58(record.recipient)), ARCADE_RECIPIENT);
  });
}

test('Phantom signs only the locally constructed payment message, never server transaction bytes', async () => {
  const record = { ...intent('god'), transaction: 'untrusted-server-transaction' };
  const calls = [];
  const result = await sendArcadePayment({ isPhantom: true, async request(input) {
    calls.push(input); return { signature: SIGNATURE };
  } }, record);
  assert.equal(result.signature, SIGNATURE);
  assert.deepEqual(calls, [{ method: 'signAndSendTransaction', params: { message: encode58(arcadeMessage(record)) } }]);
});

test('native wallet receives only the bounded intent and tier, never arbitrary transaction bytes or destination', async () => {
  const record = intent('medium'), calls = [];
  await sendArcadePayment({ isMezzoMobile: true, async payArcade(input) {
    calls.push(input); return { signature: SIGNATURE };
  } }, record);
  assert.deepEqual(calls, [{ payer: PAYER, blockhash: BLOCKHASH, reference: REFERENCE, intentId: INTENT, tier: 'medium' }]);
});

test('concurrent payment, recovery and start cannot prompt a second transfer', async () => {
  let releaseSend, enteredSend;
  const entered = new Promise(resolve => { enteredSend = resolve; });
  const blocked = new Promise(resolve => { releaseSend = resolve; });
  const h = harness({ send: async ({ paid }) => { enteredSend(); await blocked; paid(); return { signature: SIGNATURE }; } });
  const first = h.client.pay('easy');
  await entered;
  assert.equal(h.client.busy, true);
  await assert.rejects(h.client.pay('easy'), /payment_busy/);
  await assert.rejects(h.client.check(), /payment_busy/);
  await assert.rejects(h.client.start(), /payment_busy/);
  releaseSend();
  assert.equal((await first).status, 'paid');
  assert.equal(h.client.busy, false);
  assert.equal(h.sends.length, 1);
  assert.equal(h.calls.filter(call => call.action === 'create').length, 1);
});

test('fresh explicit wallet cancellation releases the unpaid selection and grants no run', async () => {
  const rejected = Object.assign(Error('user cancelled'), { code: 4001 });
  const h = harness({ send: async () => { throw rejected; } });
  await assert.rejects(h.client.pay('hard'), error => error === rejected);
  assert.equal(h.storage.getItem(KEY), null);
  assert.equal(h.client.pending, null);
  assert.ok(h.notifications.includes('rejected'));
  const reloaded = h.makeClient();
  assert.equal(await reloaded.recover(), null);
  await assert.rejects(reloaded.start(), /payment_pending/);
  assert.equal(h.sends.length, 1);
  assert.equal(h.calls.some(call => call.action === 'start'), false);
});

test('cancellation after an unknown earlier attempt retains its recovery evidence', async () => {
  let attempts = 0;
  const h = harness({ send: async () => {
    if (++attempts === 1) throw Error('wallet channel closed');
    throw Object.assign(Error('user cancelled'), { code: 4001 });
  } });
  await assert.rejects(h.client.pay('hard'), /wallet channel closed/);
  const saved = JSON.parse(h.storage.getItem(KEY));
  await assert.rejects(h.client.pay('hard'), /user cancelled/);
  assert.equal(JSON.parse(h.storage.getItem(KEY)).intentId, saved.intentId);
  assert.equal(h.client.pending.attempted, true);
  assert.ok(h.notifications.includes('recovery'));
  assert.equal(h.calls.filter(call => call.action === 'create').length, 1);
});

test('shared cross-tab lock makes simultaneous clients recover one purchase instead of paying twice', async () => {
  let tail = Promise.resolve();
  const withLock = operation => {
    const result = tail.then(operation);
    tail = result.catch(() => {});
    return result;
  };
  const h = harness({ withLock });
  const secondTab = h.makeClient();
  const [first, second] = await Promise.all([h.client.pay('hard'), secondTab.pay('hard')]);
  assert.equal(first.intentId, second.intentId);
  assert.equal(first.status, 'paid');
  assert.equal(second.status, 'paid');
  assert.equal(h.connects.length, 1);
  assert.equal(h.sends.length, 1);
  assert.equal(h.calls.filter(call => call.action === 'create').length, 1);
});

test('unknown wallet failure after broadcast recovers payment without another transfer', async () => {
  const h = harness({ send: async ({ paid }) => { paid(); throw Error('wallet channel closed'); } });
  await assert.rejects(h.client.pay('god'), /wallet channel closed/);
  const pending = JSON.parse(h.storage.getItem(KEY));
  assert.equal(pending.attempted, true);
  assert.equal(pending.signature, null);
  const reloaded = h.makeClient();
  const recovered = await reloaded.recover();
  assert.equal(recovered.status, 'paid');
  assert.equal(recovered.signature, SIGNATURE);
  assert.equal((await reloaded.start()).lives, 32);
  assert.equal(h.sends.length, 1);
});

test('lost create response recovers by the persisted request ID without creating another purchase', async () => {
  let loseResponse = true;
  const h = harness({ transform(action, result) {
    if (action === 'create' && loseResponse) { loseResponse = false; throw Error('response lost'); }
    return result;
  } });
  await assert.rejects(h.client.pay('medium'), /response lost/);
  const stored = JSON.parse(h.storage.getItem(KEY));
  assert.ok(stored.requestId);
  assert.equal(stored.intentId, undefined);
  const reloaded = h.makeClient();
  assert.equal((await reloaded.recover()).intentId, INTENT);
  const creates = h.calls.filter(call => call.action === 'create');
  assert.equal(creates.length, 2);
  assert.equal(creates[0].requestId, creates[1].requestId);
  assert.equal(h.sends.length, 0);
});

test('storage failure before wallet handoff prevents sending any payment', async t => {
  for (const failWriteAt of [1, 2, 3, 4]) await t.test(`write ${failWriteAt}`, async () => {
    const h = harness({ storage: memoryStorage({ failWriteAt }) });
    await assert.rejects(h.client.pay('easy'), /storage_unavailable/);
    assert.equal(h.sends.length, 0);
    assert.equal(h.calls.some(call => call.action === 'start'), false);
  });
  await t.test('storage unreadable', async () => {
    const h = harness({ storage: memoryStorage({ failRead: true }) });
    await assert.rejects(h.client.pay('easy'), /storage_unavailable/);
    assert.equal(h.sends.length, 0);
    assert.equal(h.connects.length, 0);
  });
});

test('failed signature persistence recovers the broadcast payment using the saved intent', async () => {
  const h = harness({ storage: memoryStorage({ failWriteAt: 5 }) });
  await assert.rejects(h.client.pay('medium'), /storage_unavailable/);
  assert.equal(h.sends.length, 1);
  assert.equal((await h.makeClient().recover()).status, 'paid');
  assert.equal(h.sends.length, 1);
});

test('pending confirmation blocks new-tier payments and account substitution', async () => {
  const h = harness({ confirmed: false });
  assert.equal((await h.client.pay('hard')).status, 'pending');
  await assert.rejects(h.client.pay('god'), /pending_tier/);
  h.provider.publicKey = OTHER_PAYER;
  await assert.rejects(h.client.pay('hard'), /payer_mismatch/);
  assert.equal(h.sends.length, 1);
  assert.equal(h.calls.filter(call => call.action === 'create').length, 1);
});

test('prepare canPay=false never opens the wallet signing prompt', async () => {
  const h = harness({ canPay: false });
  assert.equal((await h.client.pay('medium')).status, 'pending');
  assert.equal(h.sends.length, 0);
  await assert.rejects(h.client.start(), /payment_pending/);
});

test('paid intent starts exactly once and cannot be replayed after reload', async () => {
  const h = harness();
  await h.client.pay('easy');
  const beforeStart = h.storage.getItem(KEY);
  const admission = await h.client.start();
  assert.equal(admission.lives, 9);
  assert.equal(admission.tier, 'easy');
  assert.equal(admission.signature, SIGNATURE);
  assert.equal(Object.isFrozen(admission), true);
  assert.equal(h.storage.getItem(KEY), null);
  await assert.rejects(h.client.start(), /payment_pending/);
  // Even restoring an old browser backup must not grant the consumed token again.
  h.storage.setItem(KEY, beforeStart);
  const reloaded = h.makeClient();
  assert.equal((await reloaded.recover()).status, 'started');
  assert.equal(h.storage.getItem(KEY), null);
  await assert.rejects(reloaded.start(), /payment_pending/);
  assert.equal(h.calls.filter(call => call.action === 'start').length, 1);
  assert.equal(h.sends.length, 1);
});

test('failed API operations never return run admission', async t => {
  for (const action of ['config', 'create', 'prepare', 'status']) await t.test(action, async () => {
    const h = harness({ failAction: action });
    await assert.rejects(h.client.pay('hard'), /arcade_unavailable/);
    assert.equal(h.calls.some(call => call.action === 'start'), false);
    if (action !== 'status') assert.equal(h.sends.length, 0);
  });
  await t.test('start', async () => {
    const h = harness({ failAction: 'start' });
    await h.client.pay('medium');
    await assert.rejects(h.client.start(), /arcade_unavailable/);
    assert.equal(h.client.pending.status, 'paid');
  });
});

test('mismatched payment responses fail before any wallet transfer', async t => {
  const mutations = {
    recipient: OTHER_PAYER, lamports: 42, lives: 999, network: 'devnet',
    payer: OTHER_PAYER, tier: 'god', intentId: '00000000-0000-4000-8000-000000000099',
    reference: OTHER_REFERENCE,
  };
  for (const [key, value] of Object.entries(mutations)) await t.test(key, async () => {
    const h = harness({ transform: (action, result) => action === 'prepare' ? { ...result, [key]: value } : result });
    await assert.rejects(h.client.pay('hard'), /payment_mismatch/);
    assert.equal(h.sends.length, 0);
  });
});

test('only the four own tier names are accepted before wallet connection', async t => {
  for (const tier of ['unknown', 'toString', 'constructor', '__proto__']) await t.test(tier, async () => {
    const h = harness();
    await assert.rejects(h.client.pay(tier), /invalid_tier/);
    assert.equal(h.connects.length, 0);
    assert.equal(h.sends.length, 0);
  });
});

test('an inherited property cannot masquerade as a valid payment policy', () => {
  assert.throws(() => validateIntent({ ...intent(), tier: 'toString', lamports: undefined, lives: undefined }), /payment_mismatch/);
});
