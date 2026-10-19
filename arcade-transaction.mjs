// Fixed, reviewed SOL transfer. Neither a server response nor page copy can change its destination or price.
export const ARCADE_RECIPIENT = 'AXomB2bpJ7F3EFVPQwrwBV4yVE7bazshZaVa64KhGCfE';
export const ARCADE_TIERS = Object.freeze({
  hard: Object.freeze({ lives: 1, lamports: 1_000_000, price: '0.001' }),
  medium: Object.freeze({ lives: 3, lamports: 2_000_000, price: '0.002' }),
  easy: Object.freeze({ lives: 9, lamports: 3_000_000, price: '0.003' }),
  god: Object.freeze({ lives: 32, lamports: 10_000_000, price: '0.01' }),
});
const SYSTEM = '11111111111111111111111111111111';
const MEMO = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export function encode58(bytes) {
  let n = 0n, out = '';
  for (const byte of bytes) n = n * 256n + BigInt(byte);
  while (n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
  for (const byte of bytes) { if (byte) break; out = '1' + out; }
  return out;
}
export function decode58(value, length = 32) {
  if (typeof value !== 'string' || value.length > 100 || !value.length) throw Error('invalid_address');
  let n = 0n;
  for (const char of value) { const digit = ALPHABET.indexOf(char); if (digit < 0) throw Error('invalid_address'); n = n * 58n + BigInt(digit); }
  const bytes = [];
  while (n) { bytes.unshift(Number(n % 256n)); n /= 256n; }
  for (const char of value) { if (char !== '1') break; bytes.unshift(0); }
  if (bytes.length !== length) throw Error('invalid_address');
  return Uint8Array.from(bytes);
}
export function validateIntent(record, expected = {}) {
  const tier = record && Object.hasOwn(ARCADE_TIERS, record.tier) ? ARCADE_TIERS[record.tier] : null;
  if (!tier || !isUuid(record.intentId) || record.network !== 'mainnet-beta' || record.recipient !== ARCADE_RECIPIENT || record.lamports !== tier.lamports || record.lives !== tier.lives) throw Error('payment_mismatch');
  for (const key of ['payer', 'reference']) decode58(record[key]);
  if (new Set([record.payer, record.reference, ARCADE_RECIPIENT, SYSTEM, MEMO]).size !== 5) throw Error('payment_mismatch');
  for (const key of ['payer', 'tier', 'intentId', 'reference']) if (expected[key] && record[key] !== expected[key]) throw Error('payment_mismatch');
  return record;
}
export function arcadeMessage(record) {
  validateIntent(record);
  const blockhash = decode58(record.blockhash);
  const memo = new TextEncoder().encode(`mezzopollo:arcade:${record.intentId}`);
  const amount = new Uint8Array(12);
  const view = new DataView(amount.buffer);
  view.setUint32(0, 2, true); // SystemInstruction::Transfer
  view.setBigUint64(4, BigInt(ARCADE_TIERS[record.tier].lamports), true);
  // All vector lengths fit in one short-u16 byte. One signer, two writable accounts.
  return Uint8Array.from([
    1, 0, 3, 5,
    ...decode58(record.payer), ...decode58(ARCADE_RECIPIENT), ...decode58(record.reference), ...decode58(SYSTEM), ...decode58(MEMO),
    ...blockhash, 2,
    3, 3, 0, 1, 2, 12, ...amount,
    4, 1, 0, memo.length, ...memo,
  ]);
}
export async function sendArcadePayment(provider, record) {
  const message = arcadeMessage(record);
  // Native constructs this same pinned transaction in Kotlin and checks its local intent.
  if (provider?.isMezzoMobile && typeof provider.payArcade === 'function') {
    return provider.payArcade({ payer: record.payer, blockhash: record.blockhash, reference: record.reference, intentId: record.intentId, tier: record.tier });
  }
  // Web MWA owns an already-open wallet session and builds the same canonical wire transaction.
  if (provider?.isMezzoWebWallet === true && typeof provider.payArcade === 'function') return provider.payArcade(record);
  if (provider?.isPhantom !== true || typeof provider.request !== 'function') throw Error('missing_wallet');
  // Official Phantom legacy request API: sign and send exactly this canonical message.
  return provider.request({ method: 'signAndSendTransaction', params: { message: encode58(message) } });
}
