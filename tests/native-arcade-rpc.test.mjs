import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeRpcHandler } from '../api/native-arcade-rpc.mjs';
import { POLICY, encode58 } from '../server/arcade-config.mjs';
import {
  validateNativeRpcRequest, parseNativeRpcBody, loadNativeRpcConfig, nativeRpcClientIp,
  forwardNativeRpc, MAX_RPC_RESPONSE_BYTES, RPC_TIMEOUT_MS,
} from '../server/native-arcade-rpc.mjs';

// Entire transport and durable quota store are fake. No real RPC/DB/wallet is used.
const REFERENCE = encode58(Buffer.alloc(32, 7));
const SIGNATURE = encode58(Buffer.alloc(64, 9));
const ENV = {
  ARCADE_ENABLED: 'true', NATIVE_ARCADE_RPC_ENABLED: 'true',
  ARCADE_DATABASE_URL: 'postgres://test:fake@isolated.neon.tech/test',
  ARCADE_SOLANA_RPC_URL: 'https://rpc.example/?api-key=fictional-private-value',
};
const cases = [
  ['getGenesisHash', []],
  ['getAccountInfo', [POLICY.recipient, { encoding: 'base64', commitment: 'finalized' }]],
  ['getLatestBlockhash', [{ commitment: 'finalized' }]],
  ['getSlot', [{ commitment: 'finalized' }]],
  ['getBlockHeight', [{ commitment: 'finalized', minContextSlot: 15 }]],
  ['getSignaturesForAddress', [REFERENCE, { commitment: 'confirmed', limit: 20 }]],
  ['getSignaturesForAddress', [REFERENCE, { commitment: 'confirmed', limit: 20, minContextSlot: 15 }]],
  ['getTransaction', [SIGNATURE, { encoding: 'base64', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]],
];
const packet = (method = 'getGenesisHash', params = []) => ({ jsonrpc: '2.0', id: 1, method, params });
const reply = (result = POLICY.genesisHash, id = 1) => new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
  headers: { 'Content-Type': 'application/json' },
});
function harness({ env = ENV, fetchImpl, quota, makeStore } = {}) {
  const calls = [], limits = [];
  const handler = createNativeRpcHandler({ env,
    makeStore: makeStore || (() => ({ async rateLimit(key, limit) { limits.push({ key, limit }); await quota?.(key, limit); } })),
    fetchImpl: async (url, options) => { calls.push({ url, options }); return fetchImpl ? fetchImpl(url, options) : reply(); },
  });
  return { handler, calls, limits };
}
async function request(handler, body = packet(), options = {}) {
  const headers = {}, output = { status: null, headers, body: null };
  const res = { setHeader(key, value) { headers[key] = value; }, end(value = '') { output.body = value ? JSON.parse(value) : null; } };
  await handler({ method: options.method || 'POST', headers: { 'content-type': 'application/json', ...options.headers },
    body, socket: { remoteAddress: '192.0.2.10' } }, res);
  output.status = res.statusCode;
  return output;
}

for (const [method, params] of cases) test(`allows only the native ${method} parameter shape ${JSON.stringify(params)}`, async () => {
  const h = harness();
  const body = packet(method, params);
  const result = await request(h.handler, body);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { jsonrpc: '2.0', id: 1, result: POLICY.genesisHash });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, ENV.ARCADE_SOLANA_RPC_URL);
  assert.deepEqual(JSON.parse(h.calls[0].options.body), body);
  assert.equal(h.calls[0].options.redirect, 'error');
  assert.equal(h.calls[0].options.credentials, 'omit');
  assert.equal(h.calls[0].options.cache, 'no-store');
  assert.deepEqual(h.limits, [
    { key: 'native-arcade-rpc:ip:192.0.2.10', limit: 120 },
    { key: 'native-arcade-rpc:global', limit: 6000 },
  ]);
  assert.equal(result.headers['Cache-Control'], 'no-store, max-age=0');
});

test('every allowed method rejects an extra positional parameter or option', () => {
  for (const [method, params] of cases) {
    assert.throws(() => validateNativeRpcRequest(packet(method, [...params, {}])), { code: 'invalid_params' });
    if (params.length) {
      const altered = structuredClone(params);
      altered[altered.length - 1].extra = true;
      assert.throws(() => validateNativeRpcRequest(packet(method, altered)), { code: 'invalid_params' });
    }
  }
});

for (const method of ['sendTransaction', 'signTransaction', 'simulateTransaction', 'getBalance', 'getProgramAccounts', 'getBlock', 'constructor', '__proto__']) {
  test(`denies non-allowlisted method ${method} before quota or fetch`, async () => {
    const h = harness(), result = await request(h.handler, packet(method));
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, -32601);
    assert.equal(h.limits.length, 0); assert.equal(h.calls.length, 0);
  });
}

test('rejects batch, notifications, extra endpoint/headers and malformed JSON-RPC envelopes', async () => {
  for (const body of [[], [packet()], null, 0, 'broken JSON', {}, { ...packet(), id: undefined },
    { ...packet(), id: null }, { ...packet(), id: -1 }, { ...packet(), id: 1.1 }, { ...packet(), id: Number.MAX_SAFE_INTEGER + 1 },
    { ...packet(), id: 'provider-url' }, { ...packet(), jsonrpc: '1.0' }, { ...packet(), params: {} },
    { ...packet(), params: undefined }, { ...packet(), rpcUrl: 'https://attacker.example' }, { ...packet(), headers: {} }]) {
    const h = harness();
    assert.equal((await request(h.handler, body)).status, 400);
    assert.equal(h.calls.length, 0); assert.equal(h.limits.length, 0);
  }
});

test('valid JSON strings and Buffers are parsed under the same allowlist', () => {
  for (const body of [JSON.stringify(packet()), Buffer.from(JSON.stringify(packet()))]) {
    assert.deepEqual(parseNativeRpcBody({ headers: {}, body }), packet());
  }
});

test('limits request bytes even with absent or dishonest Content-Length', async () => {
  const oversized = JSON.stringify({ ...packet(), method: 'x'.repeat(4100) });
  const cases = [
    { body: packet(), headers: { 'content-length': '4097' } },
    { body: packet(), headers: { 'content-length': 'invalid' } },
    { body: oversized }, { body: Buffer.from(oversized) },
    { body: JSON.parse(oversized), headers: { 'content-length': '1' } },
    { body: { ...packet(), method: '界'.repeat(1400) } },
  ];
  for (const { body, headers } of cases) {
    const h = harness();
    assert.equal((await request(h.handler, body, { headers })).status, 413);
    assert.equal(h.calls.length, 0); assert.equal(h.limits.length, 0);
  }
});

test('rejects wrong address, signature, encoding, commitment, limit and context slot', () => {
  const invalid = [
    ['getAccountInfo', [REFERENCE, { encoding: 'base64', commitment: 'finalized' }]],
    ['getAccountInfo', [POLICY.recipient, { encoding: 'jsonParsed', commitment: 'finalized' }]],
    ['getSlot', [{ commitment: 'processed' }]], ['getLatestBlockhash', [{ commitment: 'confirmed' }]],
    ['getBlockHeight', [{ commitment: 'finalized' }]],
    ['getBlockHeight', [{ commitment: 'finalized', minContextSlot: -1 }]],
    ['getBlockHeight', [{ commitment: 'finalized', minContextSlot: 0.5 }]],
    ['getBlockHeight', [{ commitment: 'finalized', minContextSlot: Number.MAX_SAFE_INTEGER + 1 }]],
    ['getSignaturesForAddress', ['0'.repeat(32), { commitment: 'confirmed', limit: 20 }]],
    ['getSignaturesForAddress', [SIGNATURE, { commitment: 'confirmed', limit: 20 }]],
    ['getSignaturesForAddress', [REFERENCE, { commitment: 'finalized', limit: 20 }]],
    ['getSignaturesForAddress', [REFERENCE, { commitment: 'confirmed', limit: 1000 }]],
    ['getSignaturesForAddress', [REFERENCE, { commitment: 'confirmed', limit: 20, minContextSlot: null }]],
    ['getTransaction', [REFERENCE, { encoding: 'base64', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]],
    ['getTransaction', [SIGNATURE, { encoding: 'json', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]],
    ['getTransaction', [SIGNATURE, { encoding: 'base64', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]],
    ['getTransaction', [SIGNATURE, { encoding: 'base64', commitment: 'finalized', maxSupportedTransactionVersion: 1 }]],
  ];
  for (const [method, params] of invalid) assert.throws(() => validateNativeRpcRequest(packet(method, params)), { code: 'invalid_params' });
});

test('native absence of Origin and only approved web origins are accepted', async () => {
  for (const origin of [undefined, 'https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app']) {
    const h = harness();
    const result = await request(h.handler, packet(), { headers: origin ? { origin } : {} });
    assert.equal(result.status, 200);
    assert.equal(result.headers['Access-Control-Allow-Origin'], origin);
  }
  for (const headers of [{ origin: 'https://evil.example' }, { origin: 'null' }, { origin: '' },
    { origin: 'https://mezzopollo.it.evil.example' }, { 'sec-fetch-site': 'cross-site' },
    { origin: 'https://mezzopollo.it', 'sec-fetch-site': 'cross-site' }]) {
    const h = harness();
    assert.equal((await request(h.handler, packet(), { headers })).status, 403);
    assert.equal(h.calls.length, 0); assert.equal(h.limits.length, 0);
  }
});

test('preflight does not access configuration, database or paid provider', async () => {
  const h = harness({ env: {} });
  const result = await request(h.handler, undefined, { method: 'OPTIONS', headers: { origin: 'https://mezzopollo.it' } });
  assert.equal(result.status, 204); assert.equal(result.body, null);
  assert.equal(result.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
  assert.equal(h.calls.length, 0); assert.equal(h.limits.length, 0);
});

test('rejects GET, form and disguised JSON content types before provider work', async () => {
  for (const method of ['GET', 'PUT', 'DELETE', 'HEAD']) {
    const h = harness();
    assert.equal((await request(h.handler, packet(), { method })).status, 405);
    assert.equal(h.calls.length, 0);
  }
  for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/json-evil', '']) {
    const h = harness();
    assert.equal((await request(h.handler, packet(), { headers: { 'content-type': type } })).status, 415);
    assert.equal(h.calls.length, 0);
  }
});

test('configuration is opt-in, requires existing server credentials and validates budgets', async () => {
  assert.equal(loadNativeRpcConfig(ENV).perIpLimit, 120);
  assert.equal(loadNativeRpcConfig(ENV).globalLimit, 6000);
  const customized = loadNativeRpcConfig({ ...ENV, NATIVE_ARCADE_RPC_PER_IP_LIMIT: '50', NATIVE_ARCADE_RPC_GLOBAL_LIMIT: '500' });
  assert.equal(customized.perIpLimit, 50); assert.equal(customized.globalLimit, 500);
  for (const env of [{}, { ...ENV, NATIVE_ARCADE_RPC_ENABLED: undefined }, { ...ENV, NATIVE_ARCADE_RPC_ENABLED: 'false' },
    { ...ENV, ARCADE_ENABLED: 'false' }, { ...ENV, ARCADE_DATABASE_URL: undefined }, { ...ENV, ARCADE_SOLANA_RPC_URL: undefined },
    { ...ENV, ARCADE_SOLANA_RPC_URL: 'http://rpc.example' }, { ...ENV, ARCADE_SOLANA_RPC_URL: 'https://user:password@rpc.example' },
    ...['0', '-1', '1.5', '1e3', 'Infinity', '', '1000001'].flatMap(value => [
      { ...ENV, NATIVE_ARCADE_RPC_PER_IP_LIMIT: value }, { ...ENV, NATIVE_ARCADE_RPC_GLOBAL_LIMIT: value },
    ])]) {
    const h = harness({ env });
    assert.equal((await request(h.handler)).status, 503);
    assert.equal(h.calls.length, 0); assert.equal(h.limits.length, 0);
  }
});

test('durable IP and global budget failures stop the paid request and do not reveal infrastructure details', async () => {
  for (const which of ['ip', 'global']) {
    const h = harness({ quota: async key => {
      if (key.includes(which === 'ip' ? ':ip:' : ':global')) throw Object.assign(Error(ENV.ARCADE_DATABASE_URL), { code: 'rate_limited' });
    } });
    const result = await request(h.handler);
    assert.equal(result.status, 429); assert.equal(result.headers['Retry-After'], '60');
    assert.equal(h.calls.length, 0);
    assert.equal(h.limits.length, which === 'ip' ? 1 : 2);
    assert.equal(JSON.stringify(result.body).includes('postgres:'), false);
  }
  const h = harness({ quota: async () => { throw Error(ENV.ARCADE_DATABASE_URL); } });
  const result = await request(h.handler);
  assert.equal(result.status, 503); assert.equal(h.calls.length, 0);
  assert.equal(result.body.error.message, 'native_rpc_unavailable');
});

test('client IP prefers Vercel identity, canonicalizes IPv6, and ignores arbitrary forwarded headers', () => {
  assert.equal(nativeRpcClientIp({ headers: { 'x-vercel-forwarded-for': '192.0.2.4, 192.0.2.5' }, socket: { remoteAddress: '127.0.0.1' } }), '192.0.2.4');
  assert.equal(nativeRpcClientIp({ headers: { 'x-forwarded-for': 'spoofed' }, socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1');
  assert.equal(nativeRpcClientIp({ headers: {}, socket: { remoteAddress: '::ffff:192.0.2.4' } }), '192.0.2.4');
  assert.equal(nativeRpcClientIp({ headers: { 'x-vercel-forwarded-for': '2001:0db8:0:0:0:0:0:1' } }), '2001:db8::1');
  assert.equal(nativeRpcClientIp({ headers: { 'x-vercel-forwarded-for': 'attacker-key' } }), 'unknown');
});

test('upstream HTTP/RPC/malformed errors never return provider URLs, credentials or messages', async () => {
  const secret = ENV.ARCADE_SOLANA_RPC_URL;
  const responses = [
    () => new Response(secret, { status: 429 }),
    () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: secret } })),
    () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null, error: { message: secret } })),
    () => new Response('not JSON ' + secret), () => reply(null, 2),
    () => new Response(JSON.stringify([{ jsonrpc: '2.0', id: 1, result: secret }])),
    () => { throw Error(secret); },
  ];
  for (const fetchImpl of responses) {
    const h = harness({ fetchImpl });
    const result = await request(h.handler);
    assert.equal(result.status, 502);
    assert.equal(result.body.error.message, 'rpc_unavailable');
    assert.equal(JSON.stringify(result).includes('fictional-private-value'), false);
    assert.equal(JSON.stringify(result).includes('rpc.example'), false);
  }
});

test('does not forward provider headers or extra envelope metadata', async () => {
  const h = harness({ fetchImpl: () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: null, provider: ENV.ARCADE_SOLANA_RPC_URL }), {
    headers: { 'X-Provider-Secret': ENV.ARCADE_SOLANA_RPC_URL },
  }) });
  const result = await request(h.handler);
  assert.deepEqual(result.body, { jsonrpc: '2.0', id: 1, result: null });
  assert.equal(result.headers['X-Provider-Secret'], undefined);
});

test('declared and streamed responses are bounded to one MiB and oversized streams are cancelled', async () => {
  assert.equal(MAX_RPC_RESPONSE_BYTES, 1_048_576);
  let cancelled = 0;
  for (const declared of [undefined, String(MAX_RPC_RESPONSE_BYTES + 1)]) {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_RPC_RESPONSE_BYTES + 1)); }, cancel() { cancelled++; } });
    const h = harness({ fetchImpl: () => new Response(stream, { headers: declared ? { 'content-length': declared } : {} }) });
    const result = await request(h.handler);
    assert.equal(result.status, 502); assert.equal(result.body.error.message, 'rpc_response_too_large');
  }
  assert.equal(cancelled, 2);
  const value = 'a'.repeat(MAX_RPC_RESPONSE_BYTES - JSON.stringify({ jsonrpc: '2.0', id: 1, result: '' }).length);
  const h = harness({ fetchImpl: () => reply(value) });
  assert.equal((await request(h.handler)).body.result.length, value.length);
});

test('eight-second production deadline covers both fetch and a stalled body even if transport ignores abort', async () => {
  assert.equal(RPC_TIMEOUT_MS, 8000);
  await assert.rejects(forwardNativeRpc(ENV.ARCADE_SOLANA_RPC_URL, packet(), { timeoutMs: 10,
    fetchImpl: () => new Promise(() => {}),
  }), { code: 'rpc_timeout', status: 504 });
  let cancelled = false;
  await assert.rejects(forwardNativeRpc(ENV.ARCADE_SOLANA_RPC_URL, packet(), { timeoutMs: 10,
    fetchImpl: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })),
  }), { code: 'rpc_timeout', status: 504 });
  assert.equal(cancelled, true);
});
