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

// This is a browser admission control, not wallet authentication or score proof.
// now() is Unix seconds; injectable timers make expiry/race tests deterministic.
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

  let state = BASE_STATE, provider = null, evidence = null, destroyed = false;
  let generation = 0, connectionAttempt = 0, connectionRequest = null;
  let pending = null, boundaryTimer = null, refreshTimer = null, backoffUntil = 0;
  let handlers = null;

  function publish(next) {
    if (destroyed) return state;
    state = Object.freeze({ ...next });
    onChange(state);
    return state;
  }

  function clearSchedules() {
    clearTimer(boundaryTimer); boundaryTimer = null;
    clearTimer(refreshTimer); refreshTimer = null;
  }

  function invalidate() {
    generation += 1;
    connectionAttempt += 1;
    connectionRequest = null;
    evidence = null;
    backoffUntil = 0;
    clearSchedules();
    const request = pending;
    pending = null;
    request?.cancel();
  }

  function publicKey(value) {
    const candidate = value?.publicKey ?? value;
    const address = typeof candidate === 'string' ? candidate : candidate?.toBase58?.() ?? candidate?.toString?.();
    return typeof address === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) ? address : null;
  }

  function scheduleRefresh(seconds = ACCESS_POLICY.refreshSeconds) {
    clearTimer(refreshTimer); refreshTimer = null;
    if (destroyed || !state.wallet) return;
    refreshTimer = setTimer(() => { refreshTimer = null; void refresh(); }, seconds * 1000);
  }

  function scheduleBoundary(at) {
    clearTimer(boundaryTimer); boundaryTimer = null;
    if (destroyed || !state.wallet || !evidence) return;
    boundaryTimer = setTimer(() => {
      boundaryTimer = null;
      revalidate();
    }, Math.max(1, Math.ceil((at - currentTime()) * 1000)));
  }

  function evaluate() {
    const result = evaluateTimelocks(evidence, { ...ACCESS_POLICY, wallet: state.wallet }, unixTime());
    const livesPerGame = result.eligible ? livesForRawAmount(result.totalRaw) : 0;
    publish({ status: result.eligible ? 'eligible' : 'insufficient', wallet: state.wallet,
      eligible: result.eligible, totalRaw: result.totalRaw.toString(), livesPerGame,
      checkedAt: evidence.ts, nextCheckAt: result.nextCheckAt });
    scheduleBoundary(result.nextCheckAt);
    return state;
  }

  function unavailable(retryAfterSeconds) {
    evidence = null;
    clearTimer(boundaryTimer); boundaryTimer = null;
    return publish({ ...BASE_STATE, wallet: state.wallet, status: 'unavailable',
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}) });
  }

  function revalidate() {
    if (destroyed || !state.wallet || !evidence) return state;
    try { return evaluate(); } catch { return unavailable(); }
  }

  function retryDelay(response) {
    const value = response.headers?.get?.('retry-after');
    const seconds = /^\d+$/.test(value ?? '') ? Number(value) : (Date.parse(value) / 1000 - currentTime());
    return Math.min(60, Math.max(30, Number.isFinite(seconds) ? Math.ceil(seconds) : 30));
  }

  async function refresh() {
    if (destroyed || !state.wallet) return state;
    revalidate();
    if (pending) return pending.promise;
    if (currentTime() < backoffUntil) {
      return publish({ ...state, retryAfterSeconds: Math.max(1, Math.ceil(backoffUntil - currentTime())) });
    }
    const wallet = state.wallet, requestGeneration = generation;
    clearTimer(refreshTimer); refreshTimer = null;
    if (!state.eligible) publish({ ...BASE_STATE, wallet, status: 'checking' });
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
        evidence = result;
        backoffUntil = 0;
        evaluate();
        scheduleRefresh();
      } catch (error) {
        if (destroyed || generation !== requestGeneration || state.wallet !== wallet) return state;
        const retry = error.retryAfterSeconds;
        if (retry) backoffUntil = currentTime() + retry;
        unavailable(retry);
        scheduleRefresh(retry ?? ACCESS_POLICY.refreshSeconds);
      } finally {
        clearTimer(timeoutId);
        if (pending === request) pending = null;
      }
      return state;
    })();
    return request.promise;
  }

  function selectWallet(value) {
    if (destroyed) return Promise.resolve(state);
    const wallet = publicKey(value);
    if (!wallet) {
      invalidate();
      publish(BASE_STATE);
      return Promise.resolve(state);
    }
    if (wallet === state.wallet) return refresh();
    invalidate();
    publish({ ...BASE_STATE, wallet, status: 'checking' });
    return refresh();
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
      connect: key => { void selectWallet(key ?? provider?.publicKey); },
      accountChanged: key => { void selectWallet(key); },
      disconnect: () => { invalidate(); publish(BASE_STATE); },
    };
    for (const [event, handler] of Object.entries(handlers)) provider.on?.(event, handler);
  }

  async function connect() {
    if (destroyed) return state;
    if (connectionRequest) return connectionRequest.promise;
    let candidate;
    try { candidate = getProvider(); } catch { candidate = null; }
    if (!candidate || candidate.isPhantom !== true || typeof candidate.connect !== 'function') {
      invalidate(); detachProvider();
      return publish({ ...BASE_STATE, status: 'missing-wallet' });
    }
    if (candidate !== provider) { invalidate(); attachProvider(candidate); }
    if (state.wallet && candidate.isConnected !== false) return refresh();
    publish({ ...BASE_STATE, status: 'connecting' });
    const attempt = ++connectionAttempt;
    const request = { promise: null };
    connectionRequest = request;
    request.promise = (async () => {
      try {
        const result = await candidate.connect();
        if (destroyed || candidate !== provider || attempt !== connectionAttempt) return pending?.promise ?? state;
        const wallet = publicKey(candidate.publicKey ?? result);
        if (!wallet) throw new Error('Phantom did not provide a Solana public key');
        return await selectWallet(wallet);
      } catch (error) {
        if (destroyed || candidate !== provider || attempt !== connectionAttempt) return state;
        invalidate();
        return publish({ ...BASE_STATE, status: Number(error?.code) === 4001 ? 'rejected' : 'unavailable' });
      } finally { if (connectionRequest === request) connectionRequest = null; }
    })();
    return request.promise;
  }

  async function disconnect() {
    if (destroyed) return state;
    const previousProvider = provider;
    invalidate(); detachProvider();
    publish(BASE_STATE);
    try { await previousProvider?.disconnect?.(); } catch { /* Local access is already revoked. */ }
    return state;
  }

  function destroy() {
    if (destroyed) return;
    invalidate(); detachProvider();
    state = BASE_STATE;
    destroyed = true;
  }

  return Object.freeze({ connect, disconnect, refresh, revalidate, destroy, getState: () => state });
}
