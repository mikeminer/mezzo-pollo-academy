import { randomBytes, randomUUID } from 'node:crypto';
import { ArcadeError, POLICY, AVAILABLE_TIERS, SYSTEM_PROGRAM, MEMO_PROGRAM, UUID, decode58, encode58, digest, requestSecret, authorized, tierPolicy } from './arcade-config.mjs';
import { buildTransaction, verifyTransaction } from './arcade-chain.mjs';

function validateId(value) { if (typeof value !== 'string' || !UUID.test(value)) throw new ArcadeError('invalid_intent'); }

export function publicIntent(record) {
  return {
    intentId: record.intentId, payer: record.payer, reference: record.reference, status: record.status,
    recipient: POLICY.recipient, tier: record.tier, lamports: record.lamports, lives: record.lives, network: POLICY.network,
    signature: record.signature || null, runId: record.runId || null,
    canPay: record.status === 'pending' && !record.prepared,
    prepared: Boolean(record.prepared), createdAt: record.createdAt,
  };
}

export class ArcadeService {
  constructor({ store, rpc, now = Date.now, uuid = randomUUID, bytes = randomBytes }) { Object.assign(this, { store, rpc, now, uuid, bytes }); }
  async ready() { await Promise.all([this.store.ready(), this.rpc.assertMainnet(), this.rpc.recipientReady()]); }
  async read(input) {
    validateId(input.intentId);
    if (typeof input.secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(input.secret)) throw new ArcadeError('intent_not_found', 404);
    const record = await this.store.get(input.intentId);
    if (!record) throw new ArcadeError('intent_not_found', 404);
    authorized(record, input.secret);
    return record;
  }
  async create(input) {
    validateId(input.requestId);
    const tier = tierPolicy(input.tier);
    decode58(input.payer, 32);
    if ([POLICY.recipient, SYSTEM_PROGRAM, MEMO_PROGRAM].includes(input.payer)) throw new ArcadeError('invalid_address');
    // Resolve old idempotency keys without creating any new retired-tier credit.
    if (!Object.hasOwn(AVAILABLE_TIERS, input.tier)) {
      const existing = await this.store.getByRequest(input.requestId);
      if (!existing) throw new ArcadeError('invalid_tier');
      if (existing.payer !== input.payer) throw new ArcadeError('payer_mismatch', 409);
      if (existing.tier !== input.tier) throw new ArcadeError('tier_mismatch', 409);
      const secret = requestSecret(input.requestId);
      authorized(existing, secret);
      return { ...publicIntent(existing), secret };
    }
    // Resolve storage/chain/recipient configuration before offering a payment.
    await this.ready();
    const secret = requestSecret(input.requestId);
    const candidate = {
      intentId: this.uuid(), payer: input.payer, reference: encode58(this.bytes(32)), secretHash: digest(secret),
      tier: input.tier, lamports: tier.lamports, lives: tier.lives,
      status: 'pending', revision: 0, prepared: null, createdAt: this.now(),
    };
    const record = await this.store.create(input.requestId, candidate);
    if (record.payer !== input.payer) throw new ArcadeError('payer_mismatch', 409);
    if (record.tier !== input.tier) throw new ArcadeError('tier_mismatch', 409);
    authorized(record, secret);
    return { ...publicIntent(record), secret };
  }
  async reconcile(record, suppliedSignature, minContextSlot, ignoreDroppedSignature = false) {
    if (record.status !== 'pending') return { record, observed: false };
    await this.rpc.assertMainnet();
    if (suppliedSignature !== undefined && suppliedSignature !== null) decode58(suppliedSignature, 64);
    const rows = await this.rpc.signatures(record.reference, minContextSlot);
    // A caller may supply a freshly returned wallet signature before the reference index catches up.
    const referenced = new Set(rows.filter(row => !row.err).map(row => row.signature));
    const signatures = new Set(referenced);
    if (suppliedSignature) signatures.add(suppliedSignature);
    let unresolved = false;
    for (const signature of signatures) {
      const transaction = await this.rpc.transaction(signature);
      if (!transaction) {
        // Only after finalized expiry + a fresh context-bound reference scan can an
        // absent, never-landed supplied signature be treated as dropped.
        if (!ignoreDroppedSignature || referenced.has(signature)) unresolved = true;
        continue;
      }
      if (transaction.meta?.err) continue;
      let receipt;
      try { receipt = verifyTransaction(transaction, record, signature); }
      catch (error) {
        // Strangers can attach a public reference to an unrelated transfer. It earns no credit.
        if (error.code === 'payment_mismatch' && signature !== suppliedSignature) continue;
        throw error;
      }
      const updated = await this.store.transition(record.intentId, 'paid', { ...receipt, now: this.now() });
      return { record: updated.record, observed: false };
    }
    return { record, observed: unresolved };
  }
  async status(input) {
    const { record, observed } = await this.reconcile(await this.read(input), input.signature);
    return { ...publicIntent(record), signature: record.signature || input.signature || null, confirming: observed };
  }
  async prepare(input) {
    const reconciled = await this.reconcile(await this.read(input), input.signature);
    let record = reconciled.record;
    if (record.status !== 'pending') return publicIntent(record);
    if (reconciled.observed && !record.prepared) return { ...publicIntent(record), signature: input.signature || null, canPay: false, confirming: true };
    if (record.prepared) {
      const { height, slot } = await this.rpc.finalizedContext();
      if (height <= record.prepared.lastValidBlockHeight) {
        if (reconciled.observed) return { ...publicIntent(record), signature: input.signature || null, canPay: false, confirming: true };
        return this.preparedResponse(record);
      }
      // Repeat the scan AFTER observing expiry, at a context at least as fresh as that
      // finalized block. A payment may have landed between the first scan and this height.
      const afterExpiry = await this.reconcile(record, input.signature, slot, true);
      record = afterExpiry.record;
      if (record.status !== 'pending') return publicIntent(record);
      if (afterExpiry.observed) return { ...publicIntent(record), signature: input.signature || null, canPay: false, confirming: true };
    }
    await this.rpc.recipientReady();
    const latest = await this.rpc.latest();
    const prepared = { blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight };
    const result = await this.store.transition(record.intentId, 'prepare', { revision: record.revision, prepared });
    record = result.record;
    if (record.status !== 'pending') return publicIntent(record);
    return this.preparedResponse(record);
  }
  preparedResponse(record) {
    if (!record.prepared) throw new ArcadeError('payment_busy', 409);
    return { ...publicIntent(record), ...record.prepared, canPay: true, transaction: buildTransaction(record, record.prepared.blockhash) };
  }
  async start(input) {
    validateId(input.runId);
    const { record } = await this.reconcile(await this.read(input), input.signature);
    const result = await this.store.transition(record.intentId, 'start', { runId: input.runId, now: this.now() });
    // A duplicate HTTP request retrieves the receipt but never grants another run.
    return { ...publicIntent(result.record), admitted: result.changed };
  }
}
