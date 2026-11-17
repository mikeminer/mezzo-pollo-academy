// Read-only mainnet verifier. Layout reviewed against DevFridge Game Builder
// 1.12.0 references/program-and-verification.md on 2026-11-17.
import { PublicKey } from './vendor/solana-transaction.mjs';
import { ACCESS_POLICY } from './access-policy.mjs';

export const FRIDGE_PROGRAM = new PublicKey('9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6');
const TOKEN = new PublicKey(ACCESS_POLICY.tokenProgram);
const ATA = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const DISCRIMINATOR = [8, 255, 36, 202, 210, 22, 57, 137];
const RPC = 'https://api.mainnet-beta.solana.com';
const invalid = () => { throw Error('Subscription evidence unavailable'); };
function bytes(account, owner, length) {
  if (!account || account.owner !== owner.toBase58() || account.executable !== false ||
      !Array.isArray(account.data) || account.data[1] !== 'base64') return invalid();
  const data = Uint8Array.from(atob(account.data[0]), c => c.charCodeAt(0));
  if (length ? data.length !== length : data.length < 82) return invalid();
  return data;
}
const keyAt = (data, offset) => new PublicKey(data.slice(offset, offset + 32));
const view = data => new DataView(data.buffer, data.byteOffset, data.byteLength);
function safeTime(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) return invalid();
  return n;
}
export function decodeLock(row, wallet, mint) {
  const data = bytes(row.account, FRIDGE_PROGRAM, 105), v = view(data);
  if (!DISCRIMINATOR.every((n, i) => data[i] === n) ||
      !keyAt(data, 8).equals(wallet) || !keyAt(data, 40).equals(mint)) return invalid();
  const [address, bump] = PublicKey.findProgramAddressSync([
    new TextEncoder().encode('lock'), wallet.toBytes(), mint.toBytes(), data.slice(97, 105),
  ], FRIDGE_PROGRAM);
  if (row.pubkey !== address.toBase58() || data[96] !== bump) return invalid();
  const amount = v.getBigUint64(72, true);
  const createdAt = safeTime(v.getBigInt64(80, true)), unlockAt = safeTime(v.getBigInt64(88, true));
  if (amount === 0n || unlockAt <= createdAt) return invalid();
  const [vault] = PublicKey.findProgramAddressSync([address.toBytes(), TOKEN.toBytes(), mint.toBytes()], ATA);
  return { address: row.pubkey, depositor: wallet.toBase58(), mint: mint.toBase58(),
    amount: amount.toString(), createdAt, unlockAt, vault: vault.toBase58() };
}
export function verifyVault(account, lock) {
  const data = bytes(account, TOKEN), v = view(data);
  if (data.length < 165) return invalid();
  if (!keyAt(data, 0).equals(new PublicKey(lock.mint)) ||
      !keyAt(data, 32).equals(new PublicKey(lock.address)) || data[108] !== 1 ||
      v.getBigUint64(64, true) < BigInt(lock.amount) || (data.length > 165 && data[165] !== 2)) return invalid();
}
function verifyMint(account) {
  const data = bytes(account, TOKEN, 0);
  if ((data.length !== 82 && (data.length < 166 || data[165] !== 1)) || data[44] !== ACCESS_POLICY.decimals || data[45] !== 1) return invalid();
  // Only metadata extensions are supported; economic/transfer extensions fail closed.
  const v = view(data), allowed = new Set([18, 19]);
  for (let offset = 166; offset < data.length;) {
    if (data.slice(offset).every(n => n === 0)) break;
    if (offset + 4 > data.length) return invalid();
    const type = v.getUint16(offset, true), length = v.getUint16(offset + 2, true);
    if (!allowed.has(type) || offset + 4 + length > data.length) return invalid();
    offset += 4 + length;
  }
}
export async function readVerifiedTimelocks(walletAddress, { signal, fetchImpl = globalThis.fetch,
  now = () => Math.floor(Date.now() / 1000) } = {}) {
  const wallet = new PublicKey(walletAddress), mint = new PublicKey(ACCESS_POLICY.mint);
  const observedAt = now();
  const deadline = AbortSignal.timeout(6000);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  let id = 0;
  async function rpc(method, params) {
    const requestId = ++id;
    const response = await fetchImpl(RPC, { method: 'POST', credentials: 'omit', cache: 'no-store', signal: requestSignal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) });
    if (!response.ok) {
      const error = Error('Subscription lookup unavailable');
      if (response.status === 429) error.retryAfterSeconds = 30;
      throw error;
    }
    const body = await response.json();
    if (body.jsonrpc !== '2.0' || body.id !== requestId || body.error || !Object.hasOwn(body, 'result')) return invalid();
    return body.result;
  }
  const mintResult = await rpc('getAccountInfo', [mint.toBase58(), { encoding: 'base64', commitment: 'confirmed' }]);
  verifyMint(mintResult?.value);
  if (!Number.isSafeInteger(mintResult?.context?.slot)) return invalid();
  const result = await rpc('getProgramAccounts', [FRIDGE_PROGRAM.toBase58(), {
    encoding: 'base64', commitment: 'confirmed', withContext: true, minContextSlot: mintResult.context.slot,
    filters: [{ dataSize: 105 }, { memcmp: { offset: 0, bytes: '2WHAy3LEoEg' } },
      { memcmp: { offset: 8, bytes: wallet.toBase58() } }, { memcmp: { offset: 40, bytes: mint.toBase58() } }],
  }]);
  if (!Array.isArray(result?.value) || !Number.isSafeInteger(result?.context?.slot) || result.context.slot < mintResult.context.slot || result.value.length > 1000) return invalid();
  const locks = result.value.map(row => decodeLock(row, wallet, mint));
  if (new Set(locks.map(lock => lock.address)).size !== locks.length) return invalid();
  for (const lock of locks) if (lock.createdAt > observedAt + 5) return invalid();
  const activeLocks = locks.filter(lock => lock.unlockAt > observedAt);
  for (let offset = 0; offset < activeLocks.length; offset += 100) {
    const batch = activeLocks.slice(offset, offset + 100);
    const accounts = await rpc('getMultipleAccounts', [batch.map(lock => lock.vault), {
      encoding: 'base64', commitment: 'confirmed', minContextSlot: result.context.slot,
    }]);
    if (!Array.isArray(accounts?.value) || accounts.value.length !== batch.length ||
        !Number.isSafeInteger(accounts?.context?.slot) || accounts.context.slot < result.context.slot) return invalid();
    batch.forEach((lock, i) => verifyVault(accounts.value[i], lock));
  }
  // No fixed-ID fallback: a partial search cannot establish absence of an entitlement.
  return { wallet: wallet.toBase58(), mint: mint.toBase58(), ts: observedAt, activeLocks };
}
