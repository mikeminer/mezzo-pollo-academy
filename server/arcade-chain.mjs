import { ArcadeError, POLICY, SYSTEM_PROGRAM, MEMO_PROGRAM, decode58, UUID, tierPolicy } from './arcade-config.mjs';

export const memoFor = id => `mezzopollo:arcade:${id}`;

/** A legacy transaction with one exact transfer and a signed, intent-bound memo. */
export function buildTransaction(intent, blockhash) {
  if (!UUID.test(intent.intentId)) throw new ArcadeError('invalid_intent');
  const tier = tierPolicy(intent.tier);
  if (tier.lamports !== intent.lamports || tier.lives !== intent.lives) throw new ArcadeError('invalid_tier');
  const keys = [intent.payer, POLICY.recipient, intent.reference, SYSTEM_PROGRAM, MEMO_PROGRAM].map(key => decode58(key, 32));
  if (new Set(keys.map(key => key.toString('hex'))).size !== 5) throw new ArcadeError('invalid_address');
  const transfer = Buffer.alloc(12);
  transfer.writeUInt32LE(2);
  transfer.writeBigUInt64LE(BigInt(intent.lamports), 4);
  const memo = Buffer.from(memoFor(intent.intentId), 'utf8');
  // All vectors are below 128 entries, so their shortvec prefix is exactly one byte.
  const message = Buffer.concat([
    Buffer.from([1, 0, 3, 5]), ...keys, decode58(blockhash, 32), Buffer.from([2]),
    Buffer.from([3, 3, 0, 1, 2, transfer.length]), transfer,
    Buffer.from([4, 1, 0, memo.length]), memo,
  ]);
  return Buffer.concat([Buffer.from([1]), Buffer.alloc(64), message]).toString('base64');
}

/** Only finalized RPC responses enter this validator. No client-supplied transaction data is accepted. */
export function verifyTransaction(result, intent, signature) {
  const reject = () => { throw new ArcadeError('payment_mismatch', 422); };
  const tier = tierPolicy(intent.tier);
  if (tier.lamports !== intent.lamports || tier.lives !== intent.lives) reject();
  if (!result || result.meta?.err !== null || !Number.isSafeInteger(result.slot) || result.slot < 1) reject();
  if (result.version !== undefined && result.version !== 'legacy') reject();
  const transaction = result.transaction;
  const message = transaction?.message;
  if (!message || transaction.signatures?.length !== 1 || transaction.signatures[0] !== signature) reject();
  const expectedKeys = [intent.payer, POLICY.recipient, intent.reference, SYSTEM_PROGRAM, MEMO_PROGRAM];
  const header = message.header;
  if (!header || header.numRequiredSignatures !== 1 || header.numReadonlySignedAccounts !== 0 || header.numReadonlyUnsignedAccounts !== 3) reject();
  if (message.accountKeys?.length !== 5 || message.accountKeys.some((key, index) => key !== expectedKeys[index])) reject();
  if (message.addressTableLookups?.length || result.meta.innerInstructions?.some(item => item.instructions?.length)) reject();
  const instructions = message.instructions;
  if (instructions?.length !== 2) reject();
  const [transfer, memo] = instructions;
  if (transfer.programIdIndex !== 3 || JSON.stringify(transfer.accounts) !== '[0,1,2]') reject();
  if (memo.programIdIndex !== 4 || JSON.stringify(memo.accounts) !== '[0]') reject();
  try {
    const data = decode58(transfer.data, 12);
    if (data.readUInt32LE() !== 2 || data.readBigUInt64LE(4) !== BigInt(intent.lamports)) reject();
    const memoBytes = decode58(memo.data, Buffer.byteLength(memoFor(intent.intentId)));
    if (memoBytes.toString('utf8') !== memoFor(intent.intentId)) reject();
    decode58(signature, 64);
    decode58(message.recentBlockhash, 32);
  } catch { reject(); }
  // Exact net receipt also rejects a transfer that did not credit the requested wallet.
  const pre = result.meta.preBalances, post = result.meta.postBalances;
  if (pre?.length !== 5 || post?.length !== 5 || !pre.every(Number.isSafeInteger) || !post.every(Number.isSafeInteger)) reject();
  if (post[1] - pre[1] !== intent.lamports || !Number.isSafeInteger(result.meta.fee) || result.meta.fee < 0 || pre[0] - post[0] !== intent.lamports + result.meta.fee) reject();
  for (const index of [2, 3, 4]) if (pre[index] !== post[index]) reject();
  return { signature, slot: result.slot };
}

export class SolanaRpc {
  constructor(url, fetchImpl = fetch) { this.url = url; this.fetch = fetchImpl; }
  async call(method, params = []) {
    let body;
    try {
      const response = await this.fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('RPC HTTP');
      body = await response.json();
    } catch { throw new ArcadeError('chain_unavailable', 503); }
    if (body.error || !Object.hasOwn(body, 'result')) throw new ArcadeError('chain_unavailable', 503);
    return body.result;
  }
  async assertMainnet() {
    if (await this.call('getGenesisHash') !== POLICY.genesisHash) throw new ArcadeError('wrong_network', 503);
  }
  async latest() {
    const result = await this.call('getLatestBlockhash', [{ commitment: 'finalized' }]);
    const value = result?.value;
    if (!value || !Number.isSafeInteger(value.lastValidBlockHeight)) throw new ArcadeError('chain_unavailable', 503);
    decode58(value.blockhash, 32);
    return value;
  }
  async finalizedContext() {
    const slot = await this.call('getSlot', [{ commitment: 'finalized' }]);
    const height = await this.call('getBlockHeight', [{ commitment: 'finalized', minContextSlot: slot }]);
    if (!Number.isSafeInteger(slot) || slot < 1 || !Number.isSafeInteger(height) || height < 1) throw new ArcadeError('chain_unavailable', 503);
    return { slot, height };
  }
  async signatures(reference, minContextSlot) {
    const options = { commitment: 'confirmed', limit: 20 };
    if (minContextSlot !== undefined) options.minContextSlot = minContextSlot;
    const rows = await this.call('getSignaturesForAddress', [reference, options]);
    if (!Array.isArray(rows) || rows.length >= 20) throw new ArcadeError('payment_needs_review', 409);
    return rows;
  }
  async transaction(signature) {
    decode58(signature, 64);
    return this.call('getTransaction', [signature, { encoding: 'json', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]);
  }
  async recipientReady() {
    const account = (await this.call('getAccountInfo', [POLICY.recipient, { encoding: 'base64', commitment: 'finalized' }]))?.value;
    if (account && (account.executable || account.owner !== SYSTEM_PROGRAM || !Array.isArray(account.data) || account.data[0] !== '')) {
      throw new ArcadeError('recipient_unavailable', 503);
    }
  }
}
