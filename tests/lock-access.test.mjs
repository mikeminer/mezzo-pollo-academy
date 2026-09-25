import test from 'node:test';
import assert from 'node:assert/strict';
import { createLockAccess, livesForRawAmount } from '../lock-access.mjs';
import { ACCESS_POLICY } from '../access-policy.mjs';

const A = '11111111111111111111111111111111';
const B = '22222222222222222222222222222222';
const START = 2_000_000_000;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
async function settle() { for (let i = 0; i < 15; i++) await Promise.resolve(); }
function fakeClock() {
  let seconds = START, nextId = 0;
  const queue = new Map();
  return {
    now: () => seconds,
    timers: {
      setTimeout(fn, ms) { const id = ++nextId; queue.set(id, { at: seconds + ms / 1000, fn }); return id; },
      clearTimeout(id) { queue.delete(id); },
    },
    async advance(amount) {
      const target = seconds + amount;
      while (true) {
        const entry = [...queue].filter(([, item]) => item.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        seconds = entry[1].at; queue.delete(entry[0]); entry[1].fn(); await settle();
      }
      seconds = target; await settle();
    },
    set(value) { seconds = value; },
    pending: () => queue.size,
  };
}
function provider() {
  const listeners = new Map();
  return {
    publicKey: A, isConnected: false, isPhantom: true, calls: 0,
    async connect() { this.calls++; this.isConnected = true; this.emit('connect', this.publicKey); return { publicKey: this.publicKey }; },
    async disconnect() { this.isConnected = false; this.emit('disconnect'); },
    on(event, fn) { const set = listeners.get(event) ?? new Set(); set.add(fn); listeners.set(event, set); },
    removeListener(event, fn) { listeners.get(event)?.delete(fn); },
    emit(event, key) {
      if (event === 'accountChanged') this.publicKey = key;
      for (const fn of [...(listeners.get(event) ?? [])]) fn(key);
    },
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}
const lock = (address, amount = '1000000000000', unlockAt = START + 600, wallet = A) => ({
  address, depositor: wallet, mint: ACCESS_POLICY.mint, amount, createdAt: START - 100, unlockAt,
});
const evidence = (locks = [lock('one')], wallet = A, ts = START) => ({ wallet, mint: ACCESS_POLICY.mint, ts, activeLocks: locks });
const ok = data => ({ ok: true, status: 200, json: async () => data });
function setup(fetchImpl, wallet = provider()) {
  const clock = fakeClock(), changes = [], requests = [];
  const fetcher = fetchImpl ?? (async () => ok(evidence([lock('one', '1000000000000', Math.floor(clock.now()) + 600)], A, Math.floor(clock.now()))));
  let currentProvider = wallet;
  const access = createLockAccess({ getProvider: () => currentProvider, onChange: state => changes.push(state),
    fetchImpl: (...args) => { requests.push(args); return fetcher(...args); }, now: clock.now, timers: clock.timers });
  return { access, wallet, clock, changes, requests, setProvider: value => { currentProvider = value; } };
}

test('policy uses the verified mint and exact million-token threshold', () => {
  assert.equal(ACCESS_POLICY.mint, 'Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump');
  assert.equal(ACCESS_POLICY.minimumRaw, 10n ** 12n);
  assert.equal(ACCESS_POLICY.rawPerLife, 10n ** 12n);
  assert.equal(ACCESS_POLICY.decimals, 6);
  assert.ok(Object.isFrozen(ACCESS_POLICY));
});

test('lives equal complete millions only, with no base lives or arbitrary cap', async t => {
  for (const [raw, expected] of [['999999999999', 0], ['1000000000000', 1], ['1999999000000', 1], ['1999999999999', 1], ['2000000000000', 2], ['1000000000000000', 1000]]) {
    await t.test(`${raw} raw gives ${expected} lives`, async () => {
      const h = setup(async () => ok(evidence([lock('one', raw)])));
      const state = await h.access.connect();
      assert.equal(state.livesPerGame, expected);
      assert.equal(state.eligible, expected > 0);
      h.access.destroy();
    });
  }
});

test('lives conversion remains exact and rejects unsafe integer counts', () => {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  assert.equal(livesForRawAmount(max * ACCESS_POLICY.rawPerLife), Number.MAX_SAFE_INTEGER);
  assert.throws(() => livesForRawAmount((max + 1n) * ACCESS_POLICY.rawPerLife), RangeError);
  assert.throws(() => livesForRawAmount(-1n), TypeError);
  assert.throws(() => livesForRawAmount(1000000000000), TypeError);
});

test('fractional same-wallet locks aggregate before life calculation and expiry reduces the next game', async () => {
  const h = setup(async () => ok(evidence([lock('a', '999999999999', START + 1), lock('b', '1000000000001')])));
  assert.equal((await h.access.connect()).livesPerGame, 2);
  await h.clock.advance(1);
  assert.equal(h.access.getState().eligible, true);
  assert.equal(h.access.getState().livesPerGame, 1);
  await h.access.disconnect();
  assert.equal(h.access.getState().livesPerGame, 0);
});

test('no provider detection or requests before a connect gesture; late Phantom works', async () => {
  const h = setup(undefined, null);
  assert.equal(h.access.getState().status, 'disconnected');
  assert.equal(h.access.getState().livesPerGame, 0);
  await h.access.refresh(); await h.clock.advance(1000);
  assert.equal(h.requests.length, 0);
  assert.equal((await h.access.connect()).status, 'missing-wallet');
  h.setProvider(provider());
  assert.equal((await h.access.connect()).status, 'eligible');
  assert.equal(h.requests.length, 1);
  const [url, options] = h.requests[0];
  assert.equal(new URL(url).searchParams.get('mint'), ACCESS_POLICY.mint);
  assert.equal(new URL(url).searchParams.get('wallet'), A);
  assert.equal(options.credentials, 'omit');
  assert.ok(Object.isFrozen(h.access.getState()));
  h.access.destroy();
});

test('non-Phantom providers and invalid returned keys cannot grant access', async () => {
  const notPhantom = provider(); notPhantom.isPhantom = false;
  const h = setup(undefined, notPhantom);
  assert.equal((await h.access.connect()).status, 'missing-wallet');
  assert.equal(notPhantom.calls, 0);
  const invalid = provider(); invalid.publicKey = 'not a Solana address';
  h.setProvider(invalid);
  assert.equal((await h.access.connect()).eligible, false);
  assert.equal(h.requests.length, 0);
  h.access.destroy();
});

test('same-wallet locks sum exactly and one raw unit below minimum denies', async () => {
  let data = evidence([lock('one', '400000000000'), lock('two', '600000000000')]);
  const h = setup(async () => ok(data));
  assert.equal((await h.access.connect()).eligible, true);
  assert.equal(h.access.getState().totalRaw, '1000000000000');
  assert.equal(h.access.getState().livesPerGame, 1);
  data = evidence([lock('one', '999999999999')]);
  assert.equal((await h.access.refresh()).status, 'insufficient');
  assert.equal(h.access.getState().totalRaw, '999999999999');
  assert.equal(h.access.getState().livesPerGame, 0);
  h.access.destroy();
});

test('any active duration counts and partial expiry revokes at the exact second', async () => {
  const h = setup(async () => ok(evidence([lock('long', '600000000000'), lock('short', '400000000000', START + 1)])));
  await h.access.connect();
  assert.equal(h.access.getState().nextCheckAt, START + 1);
  await h.clock.advance(0.999);
  assert.equal(h.access.getState().eligible, true);
  await h.clock.advance(0.001);
  assert.equal(h.access.getState().status, 'insufficient');
  assert.equal(h.access.getState().totalRaw, '600000000000');
  assert.equal(h.requests.length, 1);
  h.access.destroy();
});

test('foreign, duplicate, stale and malformed evidence always fails closed', async t => {
  for (const [name, data] of Object.entries({
    wallet: { ...evidence(), wallet: B }, mint: { ...evidence(), mint: B },
    owner: evidence([{ ...lock('one'), depositor: B }]),
    lockMint: evidence([{ ...lock('one'), mint: B }]),
    duplicate: evidence([lock('one'), lock('one')]),
    stale: evidence(undefined, A, START - 91), future: evidence(undefined, A, START + 6),
    numericAmount: evidence([{ ...lock('one'), amount: 1000000000000 }]),
    missingTs: { ...evidence(), ts: undefined },
  })) await t.test(name, async () => {
    const h = setup(async () => ok(data));
    assert.equal((await h.access.connect()).status, 'unavailable');
    assert.equal(h.access.getState().eligible, false);
    assert.equal(h.access.getState().livesPerGame, 0);
    h.access.destroy();
  });
});

test('freshness deadline is enforced while a refresh hangs, even if fetch ignores abort', async () => {
  let calls = 0;
  const h = setup(() => ++calls === 1 ? Promise.resolve(ok(evidence(undefined, A, START - 80))) : new Promise(() => {}));
  await h.access.connect();
  const refresh = h.access.refresh();
  await h.clock.advance(10);
  assert.equal(h.access.getState().eligible, true);
  await h.clock.advance(1);
  assert.equal(h.access.getState().status, 'unavailable');
  assert.equal(h.access.getState().livesPerGame, 0);
  await h.clock.advance(4);
  await refresh;
  assert.equal(h.access.getState().eligible, false);
  h.access.destroy();
});

test('request timeout covers both fetch and JSON decoding', async t => {
  for (const [name, fetcher] of Object.entries({
    fetch: () => new Promise(() => {}),
    json: async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) }),
  })) await t.test(name, async () => {
    const h = setup(fetcher);
    const connecting = h.access.connect(); await settle();
    await h.clock.advance(15);
    assert.equal((await connecting).status, 'unavailable');
    assert.equal(h.requests[0][1].signal.aborted, true);
    h.access.destroy();
  });
});

test('transient errors revoke previously eligible access and recover on a later check', async () => {
  let fails = false;
  const h = setup(async () => { if (fails) throw new Error('offline'); return ok(evidence()); });
  await h.access.connect(); fails = true;
  assert.equal((await h.access.refresh()).status, 'unavailable');
  fails = false;
  assert.equal((await h.access.refresh()).eligible, true);
  h.access.destroy();
});

test('429 backoff is bounded, applies to manual refreshes, and stops on disconnect', async () => {
  const h = setup(async () => ({ ok: false, status: 429, headers: { get: () => '120' } }));
  assert.equal((await h.access.connect()).retryAfterSeconds, 60);
  await h.access.refresh(); await h.clock.advance(59); await h.access.refresh();
  assert.equal(h.requests.length, 1);
  assert.equal(h.access.getState().retryAfterSeconds, 1);
  await h.clock.advance(1);
  assert.equal(h.requests.length, 2);
  await h.access.disconnect(); await h.clock.advance(600);
  assert.equal(h.requests.length, 2);
  assert.equal(h.clock.pending(), 0);
});

test('checks coalesce and use one periodic refresh every 60 seconds', async () => {
  const gate = deferred(); let first = true;
  const h = setup(() => first ? (first = false, gate.promise) : Promise.resolve(ok(evidence(undefined, A, Math.floor(h.clock.now())))));
  const connecting = h.access.connect(); await settle();
  const a = h.access.refresh(), b = h.access.refresh();
  assert.equal(h.requests.length, 1);
  gate.resolve(ok(evidence())); await Promise.all([connecting, a, b]);
  await h.clock.advance(59.999); assert.equal(h.requests.length, 1);
  await h.clock.advance(0.001); assert.equal(h.requests.length, 2);
  assert.equal(h.access.getState().eligible, true);
  h.access.destroy();
});

test('account switch immediately revokes old access and ignores the old response', async () => {
  const old = deferred(), next = deferred();
  const h = setup(url => new URL(url).searchParams.get('wallet') === A ? old.promise : next.promise);
  const connecting = h.access.connect(); await settle();
  h.wallet.emit('accountChanged', B); await settle();
  assert.equal(h.access.getState().wallet, B);
  assert.equal(h.access.getState().eligible, false);
  old.resolve(ok(evidence())); await connecting; await settle();
  assert.equal(h.access.getState().wallet, B);
  assert.equal(h.access.getState().eligible, false);
  next.resolve(ok(evidence([lock('b', '1000000000000', START + 600, B)], B))); await settle();
  assert.equal(h.access.getState().eligible, true);
  h.wallet.emit('accountChanged', null); await settle();
  assert.equal(h.access.getState().status, 'disconnected');
  assert.equal(h.clock.pending(), 0);
  h.access.destroy();
});

test('disconnect cancels an ignored-abort fetch and its late result cannot grant access', async () => {
  const remote = deferred(); const h = setup(() => remote.promise);
  const connecting = h.access.connect(); await settle();
  await h.access.disconnect(); await connecting;
  remote.resolve(ok(evidence())); await settle();
  assert.equal(h.access.getState().status, 'disconnected');
  assert.equal(h.requests[0][1].signal.aborted, true);
  assert.equal(h.clock.pending(), 0);
  assert.equal(h.wallet.listenerCount(), 0);
});

test('wallet rejection does not retry and a later user gesture can reconnect', async () => {
  const wallet = provider(), normalConnect = wallet.connect;
  wallet.connect = function () { this.calls++; throw Object.assign(new Error('Rejected'), { code: 4001 }); };
  const h = setup(undefined, wallet);
  assert.equal((await h.access.connect()).status, 'rejected');
  await h.clock.advance(600); assert.equal(wallet.calls, 1); assert.equal(h.requests.length, 0);
  wallet.connect = normalConnect;
  assert.equal((await h.access.connect()).eligible, true);
  h.access.destroy();
});

test('disconnect during a pending wallet prompt invalidates its eventual success', async () => {
  const prompt = deferred(), wallet = provider();
  wallet.connect = () => prompt.promise;
  const h = setup(undefined, wallet);
  const connecting = h.access.connect(); await settle();
  await h.access.disconnect();
  prompt.resolve({ publicKey: A }); await connecting;
  assert.equal(h.access.getState().status, 'disconnected');
  assert.equal(h.requests.length, 0);
});

test('foreground revalidation and monotonic time never revive expired evidence', async () => {
  const h = setup(async () => ok(evidence([lock('short', '1000000000000', START + 2)])));
  await h.access.connect(); h.clock.set(START + 2);
  assert.equal(h.access.revalidate().eligible, false);
  h.clock.set(START);
  assert.equal(h.access.revalidate().eligible, false);
  h.access.destroy();
});

test('destroy revokes access, removes listeners and leaves no polling', async () => {
  const h = setup(); await h.access.connect();
  h.access.destroy();
  assert.equal(h.access.getState().eligible, false);
  assert.equal(h.wallet.listenerCount(), 0);
  assert.equal(h.clock.pending(), 0);
  await h.clock.advance(600); await h.access.refresh(); await h.access.connect();
  assert.equal(h.requests.length, 1);
});
