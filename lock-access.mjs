import { ACCESS_POLICY } from './access-policy.mjs';
import { evaluateTimelocks } from './timelock-gate.mjs';

const BASE_STATE = Object.freeze({
  status: 'disconnected', wallet: null, eligible: false, totalRaw: '0', livesPerGame: 0,
  checkedAt: null, nextCheckAt: null,
});

// Each complete million contributes one life; fractional millions add no life.
export function livesForRawAmount(totalRaw) {
  if (typeof totalRaw !== 'bigint' || totalRaw < 0n) throw new TypeError('Use a nonnegative raw token amount');
  const lives = totalRaw / ACCESS_POLICY.rawPerLife;
  if (lives > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Life count exceeds exact JavaScript integers');
  return Number(lives);
}

// The shop evaluates fresh evidence only after an explicit connect/check gesture.
// A successful result is a session entitlement, not a continuously checked lease.
// This browser state is not wallet authentication or score proof.
export function createLockAccess({
  getProvider, onChange = () => {}, fetchImpl = globalThis.fetch,
  now, timers = globalThis,
} = {}) {
  if (typeof getProvider !== 'function') throw new TypeError('A Phantom provider getter is required');
  const wallStart = Date.now() / 1000;
  const monotonicStart = globalThis.performance?.now() ?? 0;
  const clock = now ?? (() => Math.max(Date.now() / 1000,
    wallStart + ((globalThis.performance?.now() ?? monotonicStart) - monotonicStart) / 1000));
  let lastTime = clock();
  const currentTime = () => (lastTime = Math.max(lastTime, clock()));
  const unixTime = () => Math.floor(currentTime());
  const setTimer = (fn, ms) => timers.setTimeout(fn, ms);
  const clearTimer = id => { if (id !== null) timers.clearTimeout(id); };

  let state = BASE_STATE, settledState = BASE_STATE, provider = null, destroyed = false;
  let generation = 0, connectionAttempt = 0, connectionRequest = null;
  let pending = null, backoffUntil = 0, handlers = null;

  function publish(next) {
    if (destroyed) return state;
    state = Object.freeze({ ...next });
    if (!['connecting', 'checking'].includes(state.status)) settledState = state;
    onChange(state);
    return state;
  }

  function invalidate() {
    generation += 1;
    connectionAttempt += 1;
    const prompt = connectionRequest, request = pending;
    connectionRequest = null;
    pending = null;
    prompt?.cancel();
    request?.cancel();
  }

  function publicKey(value) {
    const candidate = value?.publicKey ?? value;
    const address = typeof candidate === 'string' ? candidate : candidate?.toBase58?.() ?? candidate?.toString?.();
    return typeof address === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) ? address : null;
  }

  function evaluate(evidence, wallet) {
    const result = evaluateTimelocks(evidence, { ...ACCESS_POLICY, wallet }, unixTime());
    const livesPerGame = result.eligible ? livesForRawAmount(result.totalRaw) : 0;
    return publish({ status: result.eligible ? 'eligible' : 'insufficient', wallet,
      eligible: result.eligible, totalRaw: result.totalRaw.toString(), livesPerGame,
      checkedAt: evidence.ts, nextCheckAt: null });
  }

  function unavailable(retryAfterSeconds) {
    return publish({ ...BASE_STATE, wallet: state.wallet, status: 'unavailable',
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}) });
  }

  function retryDelay(response) {
    const value = response.headers?.get?.('retry-after');
    const seconds = /^\d+$/.test(value ?? '') ? Number(value) : (Date.parse(value) / 1000 - currentTime());
    return Math.min(60, Math.max(30, Number.isFinite(seconds) ? Math.ceil(seconds) : 30));
  }

  // This function is called only by a shop gesture. It never schedules a retry.
  async function refresh() {
    if (destroyed || !state.wallet) return state;
    if (provider?.isConnected === false) return selectWallet(null);
    const currentWallet = publicKey(provider?.publicKey);
    if (currentWallet !== state.wallet) selectWallet(currentWallet);
    if (!state.wallet) return state;
    if (pending) return pending.promise;
    if (currentTime() < backoffUntil) {
      return publish({ ...state, retryAfterSeconds: Math.max(1, Math.ceil(backoffUntil - currentTime())) });
    }
    const wallet = state.wallet, requestGeneration = generation;
    publish({ ...state, status: 'checking' });
    const abort = new AbortController();
    let timeoutId = null, rejectCancelled;
    const cancellation = new Promise((_, reject) => { rejectCancelled = reject; });
    const request = {
      promise: null,
      cancel() { abort.abort(); rejectCancelled(new Error('Lock check cancelled')); },
    };
    pending = request;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimer(() => {
        reject(new Error('Lock check timed out'));
        abort.abort();
      }, ACCESS_POLICY.requestTimeoutMs);
    });
    const fetchEvidence = async () => {
      const url = `${ACCESS_POLICY.apiBase}?wallet=${encodeURIComponent(wallet)}&mint=${encodeURIComponent(ACCESS_POLICY.mint)}`;
      const response = await fetchImpl(url, { signal: abort.signal, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) {
        const error = new Error(`Lock lookup failed (${response.status})`);
        if (response.status === 429) error.retryAfterSeconds = retryDelay(response);
        throw error;
      }
      return response.json();
    };
    request.promise = (async () => {
      try {
        const result = await Promise.race([fetchEvidence(), timeout, cancellation]);
        if (destroyed || generation !== requestGeneration || state.wallet !== wallet) return state;
        // Also catch providers that changed account without emitting accountChanged.
        if (provider?.isConnected === false || publicKey(provider?.publicKey) !== wallet) {
          return selectWallet(provider?.isConnected === false ? null : provider?.publicKey);
        }
        backoffUntil = 0;
        evaluate(result, wallet);
      } catch (error) {
        if (destroyed || generation !== requestGeneration || state.wallet !== wallet) return state;
        const retry = error.retryAfterSeconds;
        if (retry) backoffUntil = currentTime() + retry;
        unavailable(retry);
      } finally {
        clearTimer(timeoutId);
        if (pending === request) pending = null;
      }
      return state;
    })();
    return request.promise;
  }

  // Wallet events revoke future entitlement but never initiate a lookup.
  function selectWallet(value) {
    if (destroyed) return state;
    const wallet = publicKey(value);
    if (wallet && wallet === state.wallet) return state;
    invalidate();
    backoffUntil = 0;
    return publish(wallet ? { ...BASE_STATE, wallet, status: 'connected' } : BASE_STATE);
  }

  function detachProvider() {
    if (provider && handlers) {
      const remove = provider.removeListener ?? provider.off;
      for (const [event, handler] of Object.entries(handlers)) remove?.call(provider, event, handler);
    }
    handlers = null;
    provider = null;
  }

  function attachProvider(nextProvider) {
    detachProvider();
    provider = nextProvider;
    handlers = {
      // The explicit connect promise below owns its lookup. A late event after
      // closing the shop may select a wallet, but can never grant entitlement.
      connect: key => { if (!connectionRequest) selectWallet(key ?? provider?.publicKey); },
      accountChanged: key => { selectWallet(key); },
      disconnect: () => { invalidate(); backoffUntil = 0; publish(BASE_STATE); },
    };
    for (const [event, handler] of Object.entries(handlers)) provider.on?.(event, handler);
  }

  async function connect() {
    if (destroyed) return state;
    if (connectionRequest) return connectionRequest.promise;
    let candidate;
    try { candidate = getProvider(); } catch { candidate = null; }
    if (!candidate || candidate.isPhantom !== true || typeof candidate.connect !== 'function') {
      invalidate(); detachProvider(); backoffUntil = 0;
      return publish({ ...BASE_STATE, status: 'missing-wallet' });
    }
    if (candidate !== provider) {
      invalidate(); attachProvider(candidate); backoffUntil = 0; publish(BASE_STATE);
    }
    if (candidate.isConnected === true && publicKey(candidate.publicKey)) {
      selectWallet(candidate.publicKey);
      return refresh();
    }
    publish({ ...state, status: 'connecting' });
    const attempt = ++connectionAttempt;
    let rejectCancelled;
    const cancellation = new Promise((_, reject) => { rejectCancelled = reject; });
    const request = { promise: null, cancel() { rejectCancelled(new Error('Wallet connection cancelled')); } };
    connectionRequest = request;
    request.promise = (async () => {
      try {
        const connectProvider = Promise.resolve().then(() => {
          if (destroyed || attempt !== connectionAttempt) throw new Error('Wallet connection cancelled');
          return candidate.connect();
        });
        const result = await Promise.race([connectProvider, cancellation]);
        if (destroyed || candidate !== provider || attempt !== connectionAttempt) return state;
        const wallet = publicKey(candidate.publicKey ?? result);
        if (!wallet) throw new Error('Phantom did not provide a Solana public key');
        connectionRequest = null;
        selectWallet(wallet);
        return await refresh();
      } catch (error) {
        if (destroyed || candidate !== provider || attempt !== connectionAttempt) return state;
        invalidate();
        return publish({ ...BASE_STATE, status: Number(error?.code) === 4001 ? 'rejected' : 'unavailable' });
      } finally { if (connectionRequest === request) connectionRequest = null; }
    })();
    return request.promise;
  }

  function cancelPending() {
    if (destroyed || (!pending && !connectionRequest)) return state;
    const previous = settledState;
    invalidate();
    return publish(previous);
  }

  async function disconnect() {
    if (destroyed) return state;
    const previousProvider = provider;
    invalidate(); detachProvider(); backoffUntil = 0;
    publish(BASE_STATE);
    try { await previousProvider?.disconnect?.(); } catch { /* Future entitlement is already revoked. */ }
    return state;
  }

  function destroy() {
    if (destroyed) return;
    invalidate(); detachProvider();
    state = BASE_STATE; settledState = BASE_STATE;
    destroyed = true;
  }

  return Object.freeze({ connect, disconnect, refresh, cancelPending, destroy, getState: () => state });
}
