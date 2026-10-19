import { ARCADE_TIERS, isUuid, validateIntent, decode58, sendArcadePayment } from './arcade-transaction.mjs';

export function createArcadeClient({ request, storage, getProvider, notify = () => {}, uuid = () => crypto.randomUUID(), send = sendArcadePayment, withLock = operation => operation() }) {
  const key = 'mp_arcade_pending_v1';
  let busy = false, record = null;
  function read() {
    const value = storage.getItem(key);
    if (!value) return null;
    const pending = JSON.parse(value);
    if (!isUuid(pending.requestId) || !Object.hasOwn(ARCADE_TIERS,pending.tier)) throw Error('invalid_intent');
    decode58(pending.payer);
    if (pending.intentId) validateIntent(pending);
    return pending;
  }
  function save(value) {
    // Abort before requesting a signature when durable browser storage is unavailable.
    storage.setItem(key, JSON.stringify(value));
    record = value;
  }
  function clear() { storage.removeItem(key); record = null; }
  async function single(operation) {
    if (busy) throw Error('payment_busy');
    busy = true; notify('checking');
    try { return await withLock(operation); } finally { busy = false; }
  }
  function credentials() { return { intentId: record.intentId, secret: record.secret, ...(record.signature ? { signature: record.signature } : {}) }; }
  function accept(result) {
    validateIntent(result, record);
    if (!['pending', 'paid', 'started'].includes(result.status)) throw Error('payment_mismatch');
    save({ ...record, ...result });
    notify(result.status === 'paid' ? 'ready' : result.status === 'started' ? 'consumed' : 'pending');
    return result;
  }
  async function restore() {
    record = read();
    if (!record) return null;
    if (!record.intentId) {
      const result = await request({ action: 'create', requestId: record.requestId, payer: record.payer, tier: record.tier });
      if (typeof result.secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(result.secret)) throw Error('payment_mismatch');
      accept(result);
    }
    const result = accept(await request({ action: 'status', ...credentials() }));
    if (result.status === 'started') clear();
    return result;
  }
  return Object.freeze({
    get busy() { return busy; },
    get pending() { return record && { ...record }; },
    recover: () => single(restore),
    check: () => single(restore),
    pay: tier => single(async () => {
      if (!Object.hasOwn(ARCADE_TIERS,tier)) throw Error('invalid_tier');
      const recovered = await restore();
      if (recovered?.status === 'paid') return recovered;
      if (record && record.tier !== tier) throw Error('pending_tier');
      const provider = getProvider();
      if (!provider || typeof provider.connect !== 'function') throw Error('missing_wallet');
      // Readiness is checked before wallet approval. Native uses only its local ledger and Solana RPC.
      await request({ action: 'config' });
      notify('connecting');
      const connected = await provider.connect();
      const payer = (connected?.publicKey || provider.publicKey)?.toString();
      decode58(payer);
      if (record && record.payer !== payer) throw Error('payer_mismatch');
      if (!record) save({ requestId: uuid(), tier, payer });
      if (!record.intentId) {
        const result = await request({ action: 'create', requestId: record.requestId, payer, tier });
        if (typeof result.secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(result.secret)) throw Error('payment_mismatch');
        accept(result);
      }
      const prepared = accept(await request({ action: 'prepare', ...credentials() }));
      if (prepared.status === 'paid') return prepared;
      if (prepared.canPay !== true) { notify('pending'); return prepared; }
      // Save the intent and attempted payment BEFORE entering the wallet. Unknown failures recover this same intent.
      const previouslyAttempted = Boolean(record.attempted);
      save({ ...record, attempted: true });
      notify('signing');
      let response;
      try { response = await send(provider, prepared); }
      catch (error) {
        if (error?.code === 4001 || error?.code === 'USER_REJECTED') {
          if (!previouslyAttempted) clear();
          notify(previouslyAttempted ? 'recovery' : 'rejected');
        }
        throw error;
      }
      decode58(response?.signature, 64);
      save({ ...record, signature: response.signature });
      notify('pending');
      return accept(await request({ action: 'status', ...credentials() }));
    }),
    start: () => single(async () => {
      const current = await restore();
      if (!current || current.status !== 'paid') throw Error(current?.status === 'started' ? 'already_started' : 'payment_pending');
      const runId = record.runId || uuid();
      save({ ...record, runId });
      const result = accept(await request({ action: 'start', ...credentials(), runId }));
      if (result.status !== 'started' || result.admitted !== true) { if (result.status === 'started') clear(); throw Error('already_started'); }
      // Clear before returning admission: a reload/retry cannot reuse it.
      clear();
      return Object.freeze({ tier: result.tier, lives: result.lives, runId, signature: result.signature });
    }),
  });
}
