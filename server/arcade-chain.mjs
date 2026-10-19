import { ArcadeError, POLICY, SYSTEM_PROGRAM, MEMO_PROGRAM, decode58, encode58, UUID, tierPolicy } from './arcade-config.mjs';

export const memoFor = id => `mezzopollo:arcade:${id}`;
export const COMPUTE_BUDGET_PROGRAM = 'ComputeBudget111111111111111111111111111111';
export const LIGHTHOUSE_PROGRAM = 'L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95';

function instructionBytes(value) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  if (typeof value !== 'string' || !value.length || value.length > 420) throw new Error('invalid instruction');
  let number = 0n;
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error('invalid instruction');
    number = number * 58n + BigInt(digit);
  }
  let hex = number.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const bytes = Buffer.concat([Buffer.alloc(value.match(/^1*/)[0].length), number ? Buffer.from(hex, 'hex') : Buffer.alloc(0)]);
  if (bytes.length > 300 || encode58(bytes) !== value) throw new Error('invalid instruction');
  return bytes;
}

/** Lighthouse has state-writing instructions too: allow only bounded account-info assertions.
 * Audited source: github.com/Jac0xb/lighthouse, instruction.rs and processor/assert_target_account.rs.
 * The Borsh log-level enum is serialized by variant ordinal (0..6), not its Rust repr value.
 */
function validLighthouseAssertion(data) {
  let offset = 0;
  const byte = () => { if (offset >= data.length) throw new Error('truncated assertion'); return data[offset++]; };
  const skip = length => { offset += length; if (offset > data.length) throw new Error('truncated assertion'); };
  const opcode = byte();
  if (![5, 6].includes(opcode) || byte() > 6) return false;
  // Bound the LEB128 array to eight assertions, so a canonical count fits in one byte.
  const count = opcode === 6 ? byte() : 1;
  if (count < 1 || count > 8) return false;
  for (let index = 0; index < count; index++) {
    const kind = byte();
    if ([0, 1, 4].includes(kind)) { skip(8); if (byte() > 7) return false; }
    else if (kind === 2) { skip(32); if (byte() > 1) return false; }
    else if (kind === 3) { if (byte() > 8 || byte() > 1) return false; }
    else if ([5, 6, 7].includes(kind)) { if (byte() > 1 || byte() > 1) return false; }
    else return false;
  }
  return offset === data.length;
}

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
  const allowedKeys = new Set([...expectedKeys, COMPUTE_BUDGET_PROGRAM, LIGHTHOUSE_PROGRAM]);
  const keys = message.accountKeys;
  const header = message.header;
  if (!Array.isArray(keys) || keys.length < 5 || keys.length > 7 || new Set(keys).size !== keys.length ||
      keys.some(key => !allowedKeys.has(key)) || expectedKeys.some(key => !keys.includes(key))) reject();
  // Solana places signers first, then writable unsigned accounts. These flags guarantee
  // that only the payer and recipient can be modified, regardless of read-only key order.
  if (!header || header.numRequiredSignatures !== 1 || header.numReadonlySignedAccounts !== 0 ||
      header.numReadonlyUnsignedAccounts !== keys.length - 2 || keys[0] !== intent.payer || keys[1] !== POLICY.recipient) reject();
  if (message.addressTableLookups?.length || result.meta.innerInstructions?.some(item => item.instructions?.length)) reject();
  if (result.meta.loadedAddresses?.writable?.length || result.meta.loadedAddresses?.readonly?.length) reject();
  const instructions = message.instructions;
  if (!Array.isArray(instructions) || instructions.length < 2 || instructions.length > 7) reject();
  try {
    let transfers = 0, memos = 0, lighthouse = 0;
    const computeKinds = new Set();
    for (const instruction of instructions) {
      if (!Number.isInteger(instruction.programIdIndex) || instruction.programIdIndex < 0 || instruction.programIdIndex >= keys.length ||
          !Array.isArray(instruction.accounts) || instruction.accounts.some(index => !Number.isInteger(index) || index < 0 || index >= keys.length)) reject();
      const program = keys[instruction.programIdIndex], accounts = instruction.accounts;
      if (program === SYSTEM_PROGRAM) {
        if (++transfers !== 1 || accounts.length !== 3 || accounts[0] !== 0 || accounts[1] !== 1 || keys[accounts[2]] !== intent.reference) reject();
        const data = decode58(instruction.data, 12);
        if (data.readUInt32LE() !== 2 || data.readBigUInt64LE(4) !== BigInt(intent.lamports)) reject();
      } else if (program === MEMO_PROGRAM) {
        if (++memos !== 1 || accounts.length !== 1 || accounts[0] !== 0) reject();
        const data = decode58(instruction.data, Buffer.byteLength(memoFor(intent.intentId)));
        if (!data.equals(Buffer.from(memoFor(intent.intentId)))) reject();
      } else if (program === COMPUTE_BUDGET_PROGRAM) {
        const data = instructionBytes(instruction.data), kind = data[0];
        if (accounts.length || computeKinds.has(kind)) reject();
        if (kind === 2) { if (data.length !== 5 || data.readUInt32LE(1) < 1 || data.readUInt32LE(1) > 1_400_000) reject(); }
        else if (kind === 3) { if (data.length !== 9) reject(); }
        else reject();
        computeKinds.add(kind);
      } else if (program === LIGHTHOUSE_PROGRAM) {
        if (++lighthouse > 3 || accounts.length !== 1 || ![0, 1].includes(accounts[0]) || !validLighthouseAssertion(instructionBytes(instruction.data))) reject();
      } else reject();
    }
    if (transfers !== 1 || memos !== 1) reject();
    decode58(signature, 64);
    decode58(message.recentBlockhash, 32);
    for (const key of keys) decode58(key, 32);
  } catch { reject(); }
  // Exact net receipt also rejects a transfer that did not credit the requested wallet.
  const pre = result.meta.preBalances, post = result.meta.postBalances;
  if (!Array.isArray(pre) || !Array.isArray(post) || pre.length !== keys.length || post.length !== keys.length ||
      !pre.every(value => Number.isSafeInteger(value) && value >= 0) || !post.every(value => Number.isSafeInteger(value) && value >= 0)) reject();
  if (post[1] - pre[1] !== intent.lamports || !Number.isSafeInteger(result.meta.fee) || result.meta.fee < 0 || pre[0] - post[0] !== intent.lamports + result.meta.fee) reject();
  for (let index = 2; index < keys.length; index++) if (pre[index] !== post[index]) reject();
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
