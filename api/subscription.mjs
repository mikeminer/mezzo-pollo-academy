import { readVerifiedTimelocks } from '../timelock-chain.mjs';
import { PublicKey } from '../vendor/solana-transaction.mjs';
const ORIGINS = new Set(['https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app']);

export function createSubscriptionHandler({ env = process.env, read = readVerifiedTimelocks, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  let windowStart = 0, requests = 0;
  return async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => { response.statusCode = status; response.end(JSON.stringify(body)); };
    const origin = request.headers?.origin;
    if (origin && !ORIGINS.has(origin)) return send(403, { error: 'origin_not_allowed' });
    if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin'); }
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return send(405, { error: 'method_not_allowed' }); }
    const url = new URL(request.url, 'https://mezzopollo.it');
    const wallet = url.searchParams.get('wallet');
    try {
      if ([...url.searchParams.keys()].some(key => key !== 'wallet') || url.searchParams.getAll('wallet').length !== 1 ||
          !wallet || wallet.length > 44 || new PublicKey(wallet).toBase58() !== wallet) throw Error();
    } catch { return send(400, { error: 'invalid_wallet' }); }
    let rpcUrl;
    try {
      rpcUrl = new URL(env.SUBSCRIPTION_SOLANA_RPC_URL);
      if (rpcUrl.protocol !== 'https:' || rpcUrl.hostname !== 'mainnet.helius-rpc.com' || rpcUrl.username || rpcUrl.password ||
          rpcUrl.port || rpcUrl.pathname !== '/' || !rpcUrl.searchParams.get('api-key')) throw Error();
    } catch { return send(503, { error: 'subscription_unavailable' }); }
    // Bounded per-instance budget/cache, supplementing provider and deployment edge limits.
    const time = now();
    if (time - windowStart >= 60000) { windowStart = time; requests = 0; }
    for (const [key, entry] of cache) if (entry.until <= time) cache.delete(key);
    if (cache.has(wallet)) return send(200, cache.get(wallet).evidence);
    if (!pending.has(wallet)) {
      if (++requests > 60 || pending.size >= 8) {
        response.setHeader('Retry-After', '30'); return send(429, { error: 'retry_later' });
      }
      pending.set(wallet, Promise.resolve().then(() => read(wallet, { rpcUrl: rpcUrl.href })));
    }
    const task = pending.get(wallet);
    try {
      const evidence = await task;
      // Never rewrite the chain observation timestamp on a cached response.
      cache.set(wallet, { evidence, until: time + 10000 });
      return send(200, evidence);
    } catch (error) {
      if (error?.retryAfterSeconds) { response.setHeader('Retry-After', '30'); return send(429, { error: 'retry_later' }); }
      return send(503, { error: 'subscription_unavailable' });
    } finally { if (pending.get(wallet) === task) pending.delete(wallet); }
  };
}
export default createSubscriptionHandler();
