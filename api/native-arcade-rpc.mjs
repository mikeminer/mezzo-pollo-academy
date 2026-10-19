import { neon } from '@neondatabase/serverless';
import { PostgresStore } from '../server/arcade-store.mjs';
import {
  NativeRpcError, NATIVE_RPC_ORIGINS, parseNativeRpcBody, loadNativeRpcConfig,
  nativeRpcClientIp, forwardNativeRpc,
} from '../server/native-arcade-rpc.mjs';

export function createNativeRpcHandler({ env = process.env, fetchImpl = fetch,
  makeStore = config => new PostgresStore(neon(config.databaseUrl)),
} = {}) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    let id = null;
    const send = (status, value) => { response.statusCode = status; response.end(JSON.stringify(value)); };
    try {
      const headers = request.headers || {}, origin = headers.origin;
      if ((origin !== undefined && !NATIVE_RPC_ORIGINS.has(origin)) || headers['sec-fetch-site'] === 'cross-site') {
        throw new NativeRpcError('origin_not_allowed', 403);
      }
      if (origin) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
      }
      if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        response.statusCode = 204; response.end(); return;
      }
      if (request.method !== 'POST') throw new NativeRpcError('method_not_allowed', 405);
      if (typeof headers['content-type'] !== 'string' || !/^application\/json(?:\s*;|\s*$)/i.test(headers['content-type'])) {
        throw new NativeRpcError('json_required', 415);
      }
      const call = parseNativeRpcBody(request);
      id = call.id;
      const config = loadNativeRpcConfig(env), store = makeStore(config);
      try {
        // Durable quotas are reserved before the paid provider is contacted. Missing
        // storage fails closed; there is no in-memory or unrestricted RPC fallback.
        await store.rateLimit(`native-arcade-rpc:ip:${nativeRpcClientIp(request)}`, config.perIpLimit);
        await store.rateLimit('native-arcade-rpc:global', config.globalLimit);
      } catch (error) {
        if (error?.code === 'rate_limited') throw new NativeRpcError('rate_limited', 429, -32005);
        throw new NativeRpcError('native_rpc_unavailable', 503, -32000);
      }
      send(200, await forwardNativeRpc(config.rpcUrl, call, { fetchImpl }));
    } catch (error) {
      const safe = error instanceof NativeRpcError ? error : new NativeRpcError('native_rpc_unavailable', 503, -32000);
      if (safe.status === 429) response.setHeader('Retry-After', '60');
      send(safe.status, { jsonrpc: '2.0', id, error: { code: safe.rpcCode, message: safe.code } });
    }
  };
}

export default createNativeRpcHandler();
