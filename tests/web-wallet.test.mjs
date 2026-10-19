import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWebWallet, supportsMobileWallet } from '../web-wallet.mjs';
import { arcadeMessage, ARCADE_RECIPIENT, ARCADE_TIERS, encode58 } from '../arcade-transaction.mjs';

const A = encode58(Uint8Array.from({ length: 32 }, () => 7));
const B = encode58(Uint8Array.from({ length: 32 }, () => 8));
const address = value => Buffer.alloc(32, value).toString('base64');
const signature = Buffer.alloc(64, 9).toString('base64');
const deferred = () => { let resolve, reject; const promise = new Promise((ok, no) => { resolve = ok; reject = no; }); return { promise, resolve, reject }; };
function intent(tier = 'hard', payer = A) {
  return { tier, payer, intentId: 'c9d91f78-a5b3-4f2b-a3ce-f66c19e401d9', network: 'mainnet-beta',
    recipient: ARCADE_RECIPIENT, lamports: ARCADE_TIERS[tier].lamports, lives: ARCADE_TIERS[tier].lives,
    reference: encode58(Buffer.alloc(32, 4)), blockhash: encode58(Buffer.alloc(32, 5)) };
}
function setup(overrides = {}) {
  const calls = [], events = [], sends = [];
  const wallet = {
    async authorize(input) { calls.push(['authorize', input]); return { accounts: [{ address: address(7), chains: ['solana:mainnet'] }], auth_token: 'memory-only-token' }; },
    async signAndSendTransactions(input) { sends.push(input); return { signatures: [signature] }; },
    ...overrides.wallet,
  };
  const adapter = createWebWallet({ mobileSupported: true, onChange: () => events.push('change'),
    transact: callback => { calls.push(['transact']); return callback(wallet); }, ...overrides.options });
  return { adapter, wallet, calls, events, sends };
}

test('detects only supported secure Android Chrome, never iOS or desktop', () => {
  assert.equal(supportsMobileWallet('Mozilla Android Chrome/130 Mobile Safari/537.36'), true);
  for (const ua of ['Chrome/130 Windows', 'iPhone CriOS/130', 'Android Firefox/130', 'Android Chrome/130 EdgA/130', 'Android Chrome/130 SamsungBrowser/27', 'Android Chrome/130 OPR/88']) assert.equal(supportsMobileWallet(ua), false);
  assert.equal(supportsMobileWallet('Android Chrome/130', false), false);
});

test('provider preference preserves native and injected Phantom, including legacy injection', () => {
  let native = { isMezzoMobile: true, connect() {} }, phantom = { isPhantom: true, connect() {} }, legacy = { isPhantom: true, connect() {} };
  const { adapter, calls } = setup({ options: { nativeProvider: () => native, phantomProvider: () => phantom, legacyProvider: () => legacy } });
  assert.equal(adapter.getProvider(), native);
  native = null; assert.equal(adapter.getProvider(), phantom);
  phantom = null; assert.equal(adapter.getProvider(), legacy);
  legacy = { connect() {} }; assert.equal(adapter.getProvider().isMezzoWebWallet, true);
  assert.deepEqual(calls, []);
});

test('initialization and provider lookup never authorize or submit; unsupported browsers fail clearly', async () => {
  const h = setup(); h.adapter.getProvider(); assert.deepEqual(h.calls, []);
  const unsupported = createWebWallet({ mobileSupported: false });
  assert.equal(unsupported.getProvider(), null);
  await assert.rejects(unsupported.connect(), { code: 'missing_wallet' });
});

test('connect starts transport synchronously and emits connect only on first authorization', async () => {
  const h = setup(), provider = h.adapter.getProvider(), events = [];
  provider.on('connect', value => events.push(['connect', value]));
  provider.on('accountChanged', value => events.push(['accountChanged', value]));
  const pending = h.adapter.connect();
  assert.equal(h.calls[0][0], 'transact');
  assert.deepEqual(await pending, { publicKey: A });
  assert.equal(provider.publicKey, A); assert.equal(provider.isConnected, true);
  assert.deepEqual(events, [['connect', A]]); assert.equal(h.sends.length, 0);
  assert.equal(h.calls[1][1].chain, 'solana:mainnet');
  assert.deepEqual(h.calls[1][1].identity, { name: 'MezzoPollo', uri: 'https://mezzopollo.it' });
});

test('one live payment session holds authorization across asynchronous preparation and signs exact canonical transaction', async () => {
  const h = setup(); let stillRunning = false;
  const result = h.adapter.withPaymentSession(async provider => {
    assert.deepEqual(await provider.connect(), { publicKey: A });
    await new Promise(resolve => setImmediate(resolve)); stillRunning = true;
    return provider.payArcade({ ...intent('god'), transaction: 'untrusted-server-bytes' });
  });
  assert.equal(h.calls[0][0], 'transact');
  assert.deepEqual(await result, { signature: encode58(Buffer.alloc(64, 9)) });
  assert.equal(stillRunning, true); assert.equal(h.calls.filter(([name]) => name === 'transact').length, 1);
  const bytes = Buffer.from(h.sends[0].payloads[0], 'base64');
  assert.equal(bytes[0], 1); assert.deepEqual(bytes.subarray(1, 65), Buffer.alloc(64));
  assert.deepEqual(bytes.subarray(65), Buffer.from(arcadeMessage(intent('god'))));
  assert.deepEqual(h.sends[0].options, { commitment: 'confirmed' });
});

test('account switch emits accountChanged and refuses payment for previous payer', async () => {
  const h = setup(), changes = []; await h.adapter.connect();
  h.adapter.getProvider().on('accountChanged', key => changes.push(key));
  h.wallet.authorize = async () => ({ accounts: [{ address: address(8) }], auth_token: 'changed' });
  await assert.rejects(h.adapter.withPaymentSession(provider => provider.payArcade(intent())), { code: 'payer_mismatch' });
  assert.deepEqual(changes, [B]); assert.equal(h.sends.length, 0);
});

test('tampered payment data is refused before wallet signing', async () => {
  for (const changed of [{ lamports: 1 }, { recipient: B }, { lives: 999 }, { blockhash: 'bad' }, { network: 'devnet' }]) {
    const h = setup();
    await assert.rejects(h.adapter.withPaymentSession(provider => provider.payArcade({ ...intent(), ...changed })));
    assert.equal(h.sends.length, 0);
  }
});

test('disconnect clears only memory and makes subsequent explicit authorization fresh', async () => {
  const h = setup(), provider = h.adapter.getProvider(), events = [];
  provider.on('disconnect', () => events.push('disconnect'));
  await h.adapter.connect(); await h.adapter.connect();
  assert.equal(h.calls.filter(([name]) => name === 'authorize')[1][1].auth_token, 'memory-only-token');
  const previousCalls = h.calls.length;
  await provider.disconnect();
  assert.equal(provider.publicKey, null); assert.equal(provider.isConnected, false);
  assert.deepEqual(events, ['disconnect']); assert.equal(h.calls.length, previousCalls);
  await h.adapter.connect(); assert.equal(h.calls.at(-1)[1].auth_token, undefined);
});

test('disconnect during authorization ignores the late account and cannot submit', async () => {
  const auth = deferred(), h = setup({ wallet: { authorize: () => auth.promise } });
  const pending = h.adapter.withPaymentSession(provider => provider.payArcade(intent()));
  await h.adapter.getProvider().disconnect();
  auth.resolve({ accounts: [{ address: address(7) }], auth_token: 'late' });
  await assert.rejects(pending, { code: 'wallet_disconnected' });
  assert.equal(h.adapter.getProvider().publicKey, null); assert.equal(h.sends.length, 0);
});

test('session provider expires after callback and cannot sign later', async () => {
  const h = setup(); let captured;
  await h.adapter.withPaymentSession(provider => { captured = provider; });
  assert.equal(captured.isConnected, false);
  await assert.rejects(captured.payArcade(intent()), { code: 'wallet_disconnected' });
  assert.equal(h.sends.length, 0);
});

test('one session permits at most one signing attempt, including after an ambiguous failure', async () => {
  const h = setup({ wallet: { async signAndSendTransactions() { throw Object.assign(Error('dropped'), { code: 'ERROR_SESSION_CLOSED' }); } } });
  await h.adapter.withPaymentSession(async provider => {
    await assert.rejects(provider.payArcade(intent()), { code: 'ERROR_SESSION_CLOSED' });
    await assert.rejects(provider.payArcade(intent()), { code: 'payment_busy' });
  });
});

test('parallel clicks cannot open overlapping mobile sessions', async () => {
  const auth = deferred(), h = setup({ wallet: { authorize: () => auth.promise } });
  const pending = h.adapter.connect();
  await assert.rejects(h.adapter.connect(), { code: 'payment_busy' });
  auth.resolve({ accounts: [{ address: address(7) }], auth_token: 'one' }); await pending;
  assert.equal(h.calls.filter(([name]) => name === 'transact').length, 1);
});

test('explicit rejections map to cancellation while timeouts and unknown submission remain ambiguous', async () => {
  for (const code of [-1, -3, 'ERROR_ASSOCIATION_CANCELLED', 'ERROR_SESSION_TIMEOUT', 'ERROR_SESSION_CLOSED', -4]) {
    const h = setup({ wallet: { async signAndSendTransactions() { throw Object.assign(Error('wallet'), { code }); } } });
    await assert.rejects(h.adapter.withPaymentSession(provider => provider.payArcade(intent())), { code: [-1, -3, 'ERROR_ASSOCIATION_CANCELLED'].includes(code) ? 'USER_REJECTED' : code });
    assert.equal(h.calls.filter(([name]) => name === 'transact').length, 1);
  }
});

test('invalid account and signature encodings fail closed', async () => {
  for (const malformed of ['!', address(7).slice(0, -1), Buffer.alloc(31).toString('base64')]) {
    const h = setup({ wallet: { authorize: async () => ({ accounts: [{ address: malformed }], auth_token: 'bad' }) } });
    await assert.rejects(h.adapter.connect(), { code: 'invalid_wallet_response' });
  }
  for (const signatures of [[], ['!'], [signature, signature], [Buffer.alloc(63).toString('base64')]]) {
    const h = setup({ wallet: { signAndSendTransactions: async () => ({ signatures }) } });
    await assert.rejects(h.adapter.withPaymentSession(provider => provider.payArcade(intent())), { code: 'invalid_wallet_response' });
  }
});

test('injected providers connect immediately and their wallet events refresh the UI once', async () => {
  const events = new Map(); let connected = false, changed = 0;
  const phantom = { isPhantom: true, on(name, callback) { events.set(name, callback); }, connect() { connected = true; return Promise.resolve({ publicKey: A }); } };
  const adapter = createWebWallet({ phantomProvider: () => phantom, onChange: () => changed++ });
  const promise = adapter.connect(); assert.equal(connected, true); await promise;
  adapter.getProvider(); assert.equal(events.size, 3);
  events.get('accountChanged')(B); assert.equal(changed, 1);
  assert.equal(await adapter.withPaymentSession(provider => provider), phantom);
});

test('official adapter is bundled locally and credentials are never persisted by the facade', async () => {
  const bundle = await readFile(new URL('../vendor/mwa.mjs', import.meta.url), 'utf8');
  assert.match(bundle, /mobile-wallet-adapter-protocol 3\.0\.1/);
  assert.ok(bundle.length > 10000); assert.doesNotMatch(bundle, /from\s*["'](?:https?:|@solana)/);
  const source = await readFile(new URL('../web-wallet.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\(/);
});
