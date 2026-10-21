import { ARCADE_TIERS, AVAILABLE_ARCADE_TIERS, isUuid, validateIntent, decode58, sendArcadePayment } from './arcade-transaction.mjs';

export function arcadePaymentState(record) {
  if (record?.status === 'paid') return 'ready';
  if (record?.status === 'started') return 'consumed';
  if (record?.signature || record?.confirming) return 'pending';
  // Preparing unsigned bytes is not a wallet handoff. Keep that durable
  // evidence for receipt recovery without warning on the first checkout.
  return record?.attempted || (record?.recoveryRequired && record?.prepared !== true) ? 'recovery' : 'connecting';
}

function hasPaymentEvidence(record) {
  return Boolean(record?.recoveryRequired || record?.attempted || record?.signature || record?.runId
    || record?.prepared || record?.confirming || record?.status === 'paid' || record?.status === 'started');
}

export function createArcadeClient({ request, storage, getProvider, notify = () => {}, uuid = () => crypto.randomUUID(), send = sendArcadePayment, withLock = operation => operation(), canReleaseDraft = false }) {
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
    // Keep evidence across retries even if a later response omits or regresses it.
    save({ ...record, ...result, recoveryRequired: hasPaymentEvidence(record) || hasPaymentEvidence(result) });
    notify(arcadePaymentState(record));
    return result;
  }
  async function restore(releaseDraft = false) {
    record = read();
    if (!record) return null;
    const hadPaymentEvidence = hasPaymentEvidence(record);
    if (!record.intentId) {
      let result;
      try { result = await request({ action: 'create', requestId: record.requestId, payer: record.payer, tier: record.tier }); }
      catch (error) {
        // The retired-tier response is authoritative: the server/native ledger
        // looked up this original request and found no existing intent. Release
        // only a never-handed-off draft, while holding the checkout lock.
        if (releaseDraft && canReleaseDraft && record.tier === 'hard' && !hadPaymentEvidence
          && (error?.code || error?.message) === 'invalid_tier') {
          clear(); notify('connecting'); return null;
        }
        throw error;
      }
      if (typeof result.secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(result.secret)) throw Error('payment_mismatch');
      accept(result);
    }
    const result = accept(await request({ action: 'status', ...credentials() }));
    if (result.status === 'started') clear();
    // Only a fresh, unprepared server draft is safe to forget. Hold the same
    // cross-tab lock as pay(), and never discard an ambiguous wallet handoff.
    if (releaseDraft && canReleaseDraft && !hadPaymentEvidence && !hasPaymentEvidence(record) && result.status === 'pending'
      && result.prepared === false && result.confirming === false && !result.signature && !result.runId) {
      clear();
      notify('connecting');
      return null;
    }
    return result;
  }
  return Object.freeze({
    get busy() { return busy; },
    get pending() { return record && { ...record }; },
    get state() { return arcadePaymentState(record); },
    recover: () => single(() => restore(true)),
    check: () => single(() => restore(true)),
    pay: (tier, sessionProvider) => single(async () => {
      if (!Object.hasOwn(ARCADE_TIERS,tier)) throw Error('invalid_tier');
      const recovered = await restore();
      if (recovered?.status === 'paid') return recovered;
      if (!record && !Object.hasOwn(AVAILABLE_ARCADE_TIERS, tier)) throw Error('invalid_tier');
      if (record && record.tier !== tier) throw Error('pending_tier');
      const provider = sessionProvider || getProvider();
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
      // The account can change while the server prepares the transaction.
      if (provider.isConnected === false || provider.publicKey?.toString() !== payer) throw Error('payer_mismatch');
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
