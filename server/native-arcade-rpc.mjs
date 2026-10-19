import { isIP } from 'node:net';
import { POLICY, decode58, loadConfig } from './arcade-config.mjs';

export const MAX_RPC_REQUEST_BYTES = 4096;
export const MAX_RPC_RESPONSE_BYTES = 1024 * 1024;
export const RPC_TIMEOUT_MS = 8000;
export const NATIVE_RPC_ORIGINS = new Set(['https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app']);

export class NativeRpcError extends Error {
  constructor(code, status = 400, rpcCode = -32600) { super(code); this.code = code; this.status = status; this.rpcCode = rpcCode; }
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keysAre = (value, required, optional = []) => object(value)
  && required.every(key => Object.hasOwn(value, key))
  && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
const slot = value => Number.isSafeInteger(value) && value >= 0;
const finalized = value => keysAre(value, ['commitment']) && value.commitment === 'finalized';
const invalidParams = () => { throw new NativeRpcError('invalid_params', 400, -32602); };

export function validateNativeRpcRequest(body) {
  if (!keysAre(body, ['jsonrpc', 'id', 'method', 'params']) || body.jsonrpc !== '2.0'
    || !Number.isSafeInteger(body.id) || body.id < 0 || typeof body.method !== 'string'
    || !Array.isArray(body.params)) throw new NativeRpcError('invalid_request');
  const p = body.params;
  switch (body.method) {
    case 'getGenesisHash':
      if (p.length !== 0) invalidParams();
      break;
    case 'getAccountInfo':
      if (p.length !== 2 || p[0] !== POLICY.recipient || !keysAre(p[1], ['encoding', 'commitment'])
        || p[1].encoding !== 'base64' || p[1].commitment !== 'finalized') invalidParams();
      break;
    case 'getLatestBlockhash':
    case 'getSlot':
      if (p.length !== 1 || !finalized(p[0])) invalidParams();
      break;
    case 'getBlockHeight':
      if (p.length !== 1 || !keysAre(p[0], ['commitment', 'minContextSlot'])
        || p[0].commitment !== 'finalized' || !slot(p[0].minContextSlot)) invalidParams();
      break;
    case 'getSignaturesForAddress':
      if (p.length !== 2 || !keysAre(p[1], ['commitment', 'limit'], ['minContextSlot'])
        || p[1].commitment !== 'confirmed' || p[1].limit !== 20
        || (Object.hasOwn(p[1], 'minContextSlot') && !slot(p[1].minContextSlot))) invalidParams();
      try { decode58(p[0], 32); } catch { invalidParams(); }
      break;
    case 'getTransaction':
      if (p.length !== 2 || !keysAre(p[1], ['encoding', 'commitment', 'maxSupportedTransactionVersion'])
        || p[1].encoding !== 'base64' || p[1].commitment !== 'finalized'
        || p[1].maxSupportedTransactionVersion !== 0) invalidParams();
      try { decode58(p[0], 64); } catch { invalidParams(); }
      break;
    default: throw new NativeRpcError('rpc_method_not_allowed', 400, -32601);
  }
  return { jsonrpc: '2.0', id: body.id, method: body.method, params: p };
}

export function parseNativeRpcBody(request) {
  const declared = request.headers?.['content-length'];
  if (declared !== undefined && (!/^\d+$/.test(String(declared)) || Number(declared) > MAX_RPC_REQUEST_BYTES)) {
    throw new NativeRpcError('request_too_large', 413);
  }
  let body = request.body;
  try {
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      if (Buffer.byteLength(body) > MAX_RPC_REQUEST_BYTES) throw new NativeRpcError('request_too_large', 413);
      body = JSON.parse(String(body));
    } else if (Buffer.byteLength(JSON.stringify(body) ?? '') > MAX_RPC_REQUEST_BYTES) {
      throw new NativeRpcError('request_too_large', 413);
    }
  } catch (error) {
    if (error instanceof NativeRpcError) throw error;
    throw new NativeRpcError('invalid_request');
  }
  return validateNativeRpcRequest(body);
}

export function loadNativeRpcConfig(env) {
  if (env.NATIVE_ARCADE_RPC_ENABLED !== 'true') throw new NativeRpcError('native_rpc_unavailable', 503, -32000);
  let config;
  try { config = loadConfig(env); } catch { throw new NativeRpcError('native_rpc_unavailable', 503, -32000); }
  const limit = (name, fallback) => {
    if (env[name] === undefined) return fallback;
    if (!/^[1-9]\d{0,6}$/.test(env[name]) || Number(env[name]) > 1_000_000) {
      throw new NativeRpcError('native_rpc_unavailable', 503, -32000);
    }
    return Number(env[name]);
  };
  return { ...config, perIpLimit: limit('NATIVE_ARCADE_RPC_PER_IP_LIMIT', 120),
    globalLimit: limit('NATIVE_ARCADE_RPC_GLOBAL_LIMIT', 6000) };
}

export function nativeRpcClientIp(request) {
  // Vercel supplies this header; arbitrary forwarded headers are not trusted off-platform.
  // https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  const raw = request.headers?.['x-vercel-forwarded-for'] || request.socket?.remoteAddress;
  const candidate = typeof raw === 'string' ? raw.split(',')[0].trim() : '';
  if (!isIP(candidate)) return 'unknown';
  if (candidate.startsWith('::ffff:') && isIP(candidate.slice(7)) === 4) return candidate.slice(7);
  // Canonicalize alternative IPv6 spellings so they share a rate-limit bucket.
  return isIP(candidate) === 6 ? new URL(`http://[${candidate}]/`).hostname.slice(1, -1) : candidate;
}

async function boundedRpcResult(response, call, signal) {
  if (!response.ok || !response.body?.getReader) throw new NativeRpcError('rpc_unavailable', 502, -32000);
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_RPC_RESPONSE_BYTES)) {
    void response.body.cancel().catch(() => {});
    throw new NativeRpcError('rpc_response_too_large', 502, -32000);
  }
  const reader = response.body.getReader(), chunks = [];
  let bytes = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new NativeRpcError('rpc_timeout', 504, -32000);
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RPC_RESPONSE_BYTES) throw new NativeRpcError('rpc_response_too_large', 502, -32000);
      chunks.push(Buffer.from(value));
    }
    const body = JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'));
    if (!object(body) || body.jsonrpc !== '2.0' || body.id !== call.id || !Object.hasOwn(body, 'result')
      || Object.hasOwn(body, 'error')) throw new NativeRpcError('rpc_unavailable', 502, -32000);
    // Only the RPC result is returned; provider errors, headers and metadata never escape.
    return { jsonrpc: '2.0', id: call.id, result: body.result };
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
  }
}

export async function forwardNativeRpc(rpcUrl, call, { fetchImpl = fetch, timeoutMs = RPC_TIMEOUT_MS } = {}) {
  const abort = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new NativeRpcError('rpc_timeout', 504, -32000));
      abort.abort();
    }, timeoutMs);
  });
  const operation = (async () => {
    const response = await fetchImpl(rpcUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(call),
      signal: abort.signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
    });
    return boundedRpcResult(response, call, abort.signal);
  })();
  try { return await Promise.race([operation, timeout]); }
  catch (error) {
    if (error instanceof NativeRpcError) throw error;
    throw new NativeRpcError('rpc_unavailable', 502, -32000);
  } finally { clearTimeout(timer); abort.abort(); }
}
