import { createHash, timingSafeEqual } from 'node:crypto';

export const POLICY = Object.freeze({
  game: 'mezzopollo-arcade-v1', network: 'mainnet-beta',
  recipient: 'AXomB2bpJ7F3EFVPQwrwBV4yVE7bazshZaVa64KhGCfE',
  // Full getGenesisHash value, not the shortened CAIP-2 chain reference.
  genesisHash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
});
export const TIERS = Object.freeze({
  hard: Object.freeze({ lamports: 1_000_000, lives: 1 }),
  medium: Object.freeze({ lamports: 2_000_000, lives: 3 }),
  easy: Object.freeze({ lamports: 3_000_000, lives: 9 }),
  god: Object.freeze({ lamports: 10_000_000, lives: 32 }),
});
export function tierPolicy(name) {
  if (typeof name !== 'string' || !Object.hasOwn(TIERS, name)) throw new ArcadeError('invalid_tier');
  return TIERS[name];
}
export const SYSTEM_PROGRAM = '11111111111111111111111111111111';
export const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export class ArcadeError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function encode58(bytes) {
  let number = BigInt(`0x${Buffer.from(bytes).toString('hex') || '0'}`);
  let value = '';
  while (number) { value = ALPHABET[Number(number % 58n)] + value; number /= 58n; }
  for (const byte of bytes) { if (byte) break; value = '1' + value; }
  return value;
}
export function decode58(value, length) {
  if (typeof value !== 'string' || !value.length || value.length > 100) throw new ArcadeError('invalid_address');
  let number = 0n;
  for (const character of value) {
    const digit = ALPHABET.indexOf(character);
    if (digit < 0) throw new ArcadeError('invalid_address');
    number = number * 58n + BigInt(digit);
  }
  let hex = number.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const leading = value.match(/^1*/)[0].length;
  const bytes = Buffer.concat([Buffer.alloc(leading), number ? Buffer.from(hex, 'hex') : Buffer.alloc(0)]);
  if (bytes.length !== length || encode58(bytes) !== value) throw new ArcadeError('invalid_address');
  return bytes;
}
export const digest = value => createHash('sha256').update(value).digest('hex');
export const requestSecret = requestId => createHash('sha256').update(`${POLICY.game}:secret:${requestId}`).digest('base64url');
export function authorized(intent, secret) {
  const actual = Buffer.from(digest(typeof secret === 'string' ? secret : ''), 'hex');
  const expected = Buffer.from(intent.secretHash, 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new ArcadeError('intent_not_found', 404);
}
export function loadConfig(env = process.env) {
  const databaseUrl = env.ARCADE_DATABASE_URL || env.DATABASE_URL;
  const rpcUrl = env.ARCADE_SOLANA_RPC_URL || env.SOLANA_RPC_URL;
  if (env.ARCADE_ENABLED !== 'true' || !databaseUrl || !rpcUrl) {
    throw new ArcadeError('arcade_unavailable', 503);
  }
  for (const endpoint of [rpcUrl]) {
    let parsed;
    try { parsed = new URL(endpoint); } catch { throw new ArcadeError('arcade_unavailable', 503); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new ArcadeError('arcade_unavailable', 503);
  }
  let database;
  try { database = new URL(databaseUrl); } catch { throw new ArcadeError('arcade_unavailable', 503); }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname.endsWith('.neon.tech')) throw new ArcadeError('arcade_unavailable', 503);
  return { databaseUrl, rpcUrl };
}
