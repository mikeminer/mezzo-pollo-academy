import { createSponsorFeed, SPONSOR_CACHE_MS } from '../server/sponsors.mjs';

const ORIGINS = new Set(['https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app']);
const feed = createSponsorFeed();

export function createSponsorsHandler({ sponsorFeed = feed, now = Date.now } = {}) {
  return async function handler(request, response) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const origin = request.headers?.origin;
    if (origin && !ORIGINS.has(origin)) {
      response.setHeader('Cache-Control', 'no-store'); response.statusCode = 403;
      response.end(JSON.stringify({ error: 'origin_not_allowed' })); return;
    }
    if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin'); }
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      response.setHeader('Cache-Control', 'no-store'); response.statusCode = 204; response.end(); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Cache-Control', 'no-store'); response.setHeader('Allow', 'GET, HEAD, OPTIONS');
      response.statusCode = 405; response.end(JSON.stringify({ error: 'method_not_allowed' })); return;
    }
    response.setHeader('Cache-Control', 'no-store');
    try {
      const result = await sponsorFeed.list();
      const age = now() - result.fetchedAt;
      // CDN freshness must end with the in-process snapshot, not restart its minute.
      const ttl = Number.isSafeInteger(result.fetchedAt) && result.fetchedAt > 0 && Number.isFinite(age) && age >= 0
        ? Math.max(0, Math.min(SPONSOR_CACHE_MS / 1000, Math.floor((SPONSOR_CACHE_MS - age) / 1000)))
        : 0;
      response.setHeader('Cache-Control', `public, max-age=0, s-maxage=${ttl}, must-revalidate`);
      response.statusCode = 200; response.end(request.method === 'HEAD' ? undefined : JSON.stringify(result));
    } catch {
      // Sponsors are optional: an unavailable feed leaves the Free game usable.
      response.setHeader('Cache-Control', 'no-store');
      response.statusCode = 200; response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ sponsors: [], fetchedAt: 0 }));
    }
  };
}

export default createSponsorsHandler();
