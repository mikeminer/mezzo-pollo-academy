import { ArcadeError, POLICY, TIERS, loadConfig } from '../server/arcade-config.mjs';
import { SolanaRpc } from '../server/arcade-chain.mjs';
import { PostgresStore } from '../server/arcade-store.mjs';
import { ArcadeService } from '../server/arcade-service.mjs';
import { neon } from '@neondatabase/serverless';

export const ALLOWED_ORIGINS = new Set(['https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app']);
const ACTIONS = new Set(['create', 'prepare', 'status', 'start']);

export function createHandler({ env = process.env, makeService = config => new ArcadeService({ store: new PostgresStore(neon(config.databaseUrl)), rpc: new SolanaRpc(config.rpcUrl) }) } = {}) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const send = (status, value) => { response.statusCode = status; response.end(JSON.stringify(value)); };
    try {
      const origin = request.headers.origin;
      if (origin && !ALLOWED_ORIGINS.has(origin)) throw new ArcadeError('origin_not_allowed', 403);
      // Browsers must not use a cross-site form/no-cors request to create an order.
      if (request.headers['sec-fetch-site'] === 'cross-site') throw new ArcadeError('origin_not_allowed', 403);
      if (origin) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
      }
      if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        response.statusCode = 204; response.end(); return;
      }
      if (!['GET', 'POST'].includes(request.method)) throw new ArcadeError('method_not_allowed', 405);
      const config = loadConfig(env);
      const service = makeService(config);
      if (request.method === 'GET') {
        await service.ready();
        send(200, { available: true, ...POLICY, tiers: TIERS }); return;
      }
      if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new ArcadeError('json_required', 415);
      if (Number(request.headers['content-length'] || 0) > 4096) throw new ArcadeError('request_too_large', 413);
      let body = request.body;
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        if (Buffer.byteLength(body) > 4096) throw new ArcadeError('request_too_large', 413);
        try { body = JSON.parse(String(body)); } catch { throw new ArcadeError('invalid_json'); }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 4096) throw new ArcadeError('invalid_request');
      if (!ACTIONS.has(body.action)) throw new ArcadeError('invalid_action');
      const ip = String(request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      await service.store.rateLimit(`${body.action === 'create' ? 'create' : 'request'}:${ip}`, body.action === 'create' ? 12 : 90);
      send(200, await service[body.action](body));
    } catch (error) {
      // Infrastructure errors never reveal endpoint URLs, credentials or request bodies.
      const safe = error instanceof ArcadeError ? error : new ArcadeError('arcade_unavailable', 503);
      send(safe.status, { available: false, error: safe.code });
    }
  };
}
export default createHandler();
