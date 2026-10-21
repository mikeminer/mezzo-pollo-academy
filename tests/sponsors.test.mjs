import test from 'node:test';
import assert from 'node:assert/strict';
import { encode58 } from '../arcade-transaction.mjs';
import { sanitizeSponsors, sanitizeSponsorLogo, sponsorMint, SPONSOR_FEATURE_URL } from '../sponsors-policy.mjs';
import { createSponsorFeed, SPONSOR_FEED_URL } from '../server/sponsors.mjs';
import { createSponsorsHandler } from '../api/sponsors.mjs';

const NOW = 1_800_000_000_000;
const mint = index => encode58(new Uint8Array(32).fill(index));
const logo = '/api/logo?url=https%3A%2F%2Fimages.example.com%2Ftoken.png&v=3';
const row = (index = 5, extra = {}) => ({ mint: mint(index), name: 'Example Token', symbol: 'EXAMPLE', image: logo, expiresAt: NOW + 120_000, ...extra });
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });

test('sponsors are bounded, unique, unexpired and have only canonical token links', () => {
  const input = [row(1, { expiresAt: NOW }), row(2, { expiresAt: NOW - 1 }), row(3, { expiresAt: String(NOW + 1) }),
    row(4, { mint: 'bad' }), row(5, { url: 'https://evil.example/path' }), row(5),
    ...Array.from({ length: 20 }, (_, index) => row(index + 6))];
  const sponsors = sanitizeSponsors(input, NOW);
  assert.equal(sponsors.length, 12);
  assert.equal(new Set(sponsors.map(item => item.mint)).size, 12);
  assert.equal(sponsors[0].url, `https://scan.devfridge.cool/t/${mint(5)}`);
  assert.equal(sponsors[0].logo, `https://scan.devfridge.cool${logo}&mint=${mint(5)}`);
  assert.ok(sponsors.every(item => item.expiresAt > NOW));
  assert.ok(sponsors.every(item => Object.isFrozen(item)));
  assert.equal(SPONSOR_FEATURE_URL, 'https://scan.devfridge.cool/#feature');
});

test('names and symbols are plain bounded text, including Unicode and missing identities', () => {
  const sponsors = sanitizeSponsors([
    row(1, { name: '<b>猫</b>\u202e\u0000\n Token   名称', symbol: '$$<i>ABC</i>\u200f' }),
    row(2, { name: '🐔'.repeat(100), symbol: 'XYZ'.repeat(100) }),
    row(3, { name: {}, symbol: null }),
  ], NOW);
  assert.equal(sponsors[0].name, '猫 Token 名称'); assert.equal(sponsors[0].symbol, 'ABC');
  assert.equal(Array.from(sponsors[1].name).length, 64); assert.equal(sponsors[1].symbol.length, 16);
  assert.equal(sponsors[2].symbol, 'TOKEN'); assert.ok(sponsors[2].name.includes('…'));
  for (const input of [null, {}, 'not an array']) assert.deepEqual(sanitizeSponsors(input, NOW), []);
});

test('only valid 32-byte canonical Solana addresses can identify a sponsored token', () => {
  assert.equal(sponsorMint(mint(7)), mint(7));
  for (const input of ['1'.repeat(31), '1'.repeat(33), 'z'.repeat(44), '0'.repeat(32), '  ' + mint(7), null, {}]) assert.equal(sponsorMint(input), null);
});

test('logos are restricted to Scan image proxy and reject URL tricks or malformed parameters', () => {
  const allowed = sanitizeSponsorLogo(logo, mint(8));
  assert.ok(allowed.startsWith('https://scan.devfridge.cool/api/logo?'));
  for (const value of [
    'https://evil.example/logo.png', 'https://scan.devfridge.cool.evil.example/api/logo?url=x',
    'http://scan.devfridge.cool/api/logo?url=x', 'data:image/png;base64,AA',
    'https://scan.devfridge.cool@evil.example/api/logo?url=x',
    'https://user:pass@scan.devfridge.cool/api/logo?url=x',
    'https://scan.devfridge.cool/t/' + mint(1),
    logo + '#fragment', logo + '&redirect=https://evil.example', logo + '&url=https://other.example/x',
    '/api/logo?cid=bad', '/api/logo?v=3', '/api/logo?url=http://images.example.com/a.png',
    '/api/logo?url=https://127.0.0.1/a.png', '/api/logo?url=https://localhost/a.png',
    '/api/logo?url=https://example.local/a.png', '/api/logo?url=https://user:pass@images.example/a.png',
    '/api/logo?cid=' + 'a'.repeat(46) + '&path=%2F%2Fevil.example', 'x'.repeat(2049),
    'https://scan.devfridge.cool\\@evil.example/api/logo?url=x',
  ]) assert.equal(sanitizeSponsorLogo(value, mint(8)), null, value);
  assert.ok(sanitizeSponsorLogo('/api/logo?cid=' + 'a'.repeat(46) + '&path=%2Fimage.png', mint(8)));
  const missing = sanitizeSponsors([row(1, { image: 'https://evil.example/a.png' })], NOW);
  assert.equal(missing.length, 1); assert.equal(missing[0].logo, null, 'Unsafe logo does not turn the card into an unsafe request');
});

test('one fetch is shared by concurrent visitors and cached for at least one minute', async () => {
  let now = NOW, calls = 0, release;
  const blocked = new Promise(resolve => { release = resolve; });
  const feed = createSponsorFeed({ now: () => now, fetchImpl: async (url, options) => {
    calls++; assert.equal(url, SPONSOR_FEED_URL); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    assert.deepEqual(options.headers, { accept: 'application/json' });
    await blocked; return json({ tokens: [row()] });
  } });
  const visitors = Array.from({ length: 25 }, () => feed.list());
  assert.equal(calls, 1); release();
  assert.ok((await Promise.all(visitors)).every(result => result.sponsors.length === 1));
  now += 59_999; await feed.list(); assert.equal(calls, 1);
  now++; await feed.list(); assert.equal(calls, 2);
});

test('cached placements expire immediately without another upstream fetch', async () => {
  let now = NOW, calls = 0;
  const feed = createSponsorFeed({ now: () => now, fetchImpl: async () => { calls++; return json({ tokens: [row(1, { expiresAt: NOW + 1000 })] }); } });
  assert.equal((await feed.list()).sponsors.length, 1);
  now += 1000; assert.equal((await feed.list()).sponsors.length, 0); assert.equal(calls, 1);
});

test('upstream failures are cached for a minute and never expose diagnostics or stale sponsors', async () => {
  let now = NOW, calls = 0;
  const feed = createSponsorFeed({ now: () => now, fetchImpl: async () => {
    if (++calls === 1) return json({ tokens: [row()] });
    throw Error('private infrastructure information');
  } });
  assert.equal((await feed.list()).sponsors.length, 1);
  now += 60_000;
  assert.deepEqual(await feed.list(), { sponsors: [], fetchedAt: now });
  now += 59_999; assert.equal((await feed.list()).sponsors.length, 0); assert.equal(calls, 2);
});

test('bad JSON, wrong media type, oversized responses and redirects fail closed', async t => {
  const responses = {
    badJson: () => new Response('{oops', { headers: { 'content-type': 'application/json' } }),
    wrongShape: () => json({ sponsors: [row()] }),
    html: () => new Response('not JSON', { headers: { 'content-type': 'text/html' } }),
    declaredLarge: () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '131073' } }),
    streamedLarge: () => new Response(' '.repeat(131073), { headers: { 'content-type': 'application/json' } }),
    redirect: () => ({ ...json({ tokens: [row()] }), ok: true, redirected: true, headers: new Headers({ 'content-type': 'application/json' }) }),
    upstreamError: () => new Response('no', { status: 503, headers: { 'content-type': 'application/json' } }),
  };
  for (const [name, response] of Object.entries(responses)) await t.test(name, async () => {
    const feed = createSponsorFeed({ now: () => NOW, fetchImpl: async () => response() });
    assert.deepEqual(await feed.list(), { sponsors: [], fetchedAt: NOW });
  });
});

test('a stalled body has a bounded deadline and is cancelled', async () => {
  let cancelled = false;
  const feed = createSponsorFeed({ now: () => NOW, timeoutMs: 15, fetchImpl: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'content-type': 'application/json' } }) });
  assert.deepEqual(await feed.list(), { sponsors: [], fetchedAt: NOW }); assert.equal(cancelled, true);
});

function response() {
  return { headers: {}, statusCode: null, body: null, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } };
}

test('the public endpoint is cacheable, accepts native GETs and only allows the approved web origins', async () => {
  let calls = 0;
  const handler = createSponsorsHandler({ now: () => NOW, sponsorFeed: { async list() { calls++; return { sponsors: sanitizeSponsors([row()], NOW), fetchedAt: NOW }; } } });
  for (const headers of [{}, { origin: 'https://mezzopollo.it' }]) {
    const res = response(); await handler({ method: 'GET', headers }, res);
    assert.equal(res.statusCode, 200); assert.match(res.headers['Cache-Control'], /s-maxage=60/);
    assert.equal(JSON.parse(res.body).sponsors.length, 1); assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  }
  assert.equal(calls, 2);
  for (const request of [{ method: 'POST', headers: {} }, { method: 'GET', headers: { origin: 'https://evil.example' } }]) {
    const res = response(); await handler(request, res); assert.ok([403, 405].includes(res.statusCode)); assert.equal(res.headers['Cache-Control'], 'no-store');
  }
  const preflight = response(); await handler({ method: 'OPTIONS', headers: { origin: 'https://mezzopollo.it' } }, preflight);
  assert.equal(preflight.statusCode, 204); assert.equal(calls, 2);
  const head = response(); await handler({ method: 'HEAD', headers: {} }, head); assert.equal(head.statusCode, 200); assert.equal(head.body, undefined);
});

test('CDN freshness uses the remaining snapshot lifetime instead of stacking another minute', async () => {
  let now = NOW, calls = 0;
  const feed = createSponsorFeed({ now: () => now, fetchImpl: async () => { calls++; return json({ tokens: [row()] }); } });
  const handler = createSponsorsHandler({ sponsorFeed: feed, now: () => now });
  for (const [offset, ttl, expectedFetches] of [[0, 60, 1], [59_000, 1, 1], [59_001, 0, 1], [60_000, 60, 2]]) {
    now = NOW + offset;
    const res = response(); await handler({ method: 'GET', headers: {} }, res);
    assert.equal(res.headers['Cache-Control'], `public, max-age=0, s-maxage=${ttl}, must-revalidate`);
    assert.equal(calls, expectedFetches);
    assert.equal(JSON.parse(res.body).fetchedAt, expectedFetches === 1 ? NOW : now);
  }
});

test('invalid, future or exhausted snapshot timestamps cannot extend shared-cache freshness', async () => {
  for (const fetchedAt of [undefined, null, '1800000000000', NaN, Infinity, 0, NOW + 1, NOW - 60_000, NOW - 120_000]) {
    const handler = createSponsorsHandler({ now: () => NOW, sponsorFeed: { async list() { return { sponsors: [], fetchedAt }; } } });
    const res = response(); await handler({ method: 'HEAD', headers: {} }, res);
    assert.equal(res.headers['Cache-Control'], 'public, max-age=0, s-maxage=0, must-revalidate');
    assert.equal(res.body, undefined);
  }
});

test('an unexpected feed error still leaves an uncacheable empty slot without leaking details', async () => {
  const handler = createSponsorsHandler({ sponsorFeed: { async list() { throw Error('sensitive endpoint'); } } });
  const res = response(); await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200); assert.deepEqual(JSON.parse(res.body), { sponsors: [], fetchedAt: 0 });
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
