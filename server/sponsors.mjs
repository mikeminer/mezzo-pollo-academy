import { sanitizeSponsors, SPONSOR_ORIGIN } from '../sponsors-policy.mjs';

export const SPONSOR_FEED_URL = `${SPONSOR_ORIGIN}/api/feed/boosted`;
export const SPONSOR_CACHE_MS = 60_000;
const MAX_FEED_BYTES = 128 * 1024;

// One attempt per minute per warm server instance, including failed attempts.
// The API's CDN cache shares the snapshot across visitors. Separate cold serverless
// instances do not share this module state; this is not a global distributed lock.
export function createSponsorFeed({ fetchImpl = fetch, now = Date.now, timeoutMs = 4000 } = {}) {
  let cache = [], fetchedAt = 0, retryAt = -Infinity, inflight = null;
  async function refresh() {
    const controller = new AbortController();
    let reader, timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); void reader?.cancel().catch(() => {}); reject(Error('sponsor_timeout')); }, timeoutMs);
    });
    try {
      const rows = await Promise.race([deadline, (async () => {
        const response = await fetchImpl(SPONSOR_FEED_URL, {
          method: 'GET', redirect: 'error', credentials: 'omit',
          headers: { accept: 'application/json' }, signal: controller.signal,
        });
        if (!response.ok || response.redirected || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '')) throw Error('sponsor_feed_unavailable');
        if (Number(response.headers.get('content-length') || 0) > MAX_FEED_BYTES) { void response.body?.cancel().catch(() => {}); throw Error('sponsor_feed_too_large'); }
        reader = response.body?.getReader();
        if (!reader) throw Error('sponsor_feed_unavailable');
        const chunks = []; let length = 0;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > MAX_FEED_BYTES) { void reader.cancel().catch(() => {}); throw Error('sponsor_feed_too_large'); }
          chunks.push(chunk.value);
        }
        const body = JSON.parse(Buffer.concat(chunks, length).toString('utf8'));
        if (!body || !Array.isArray(body.tokens)) throw Error('invalid_sponsor_feed');
        return body.tokens;
      })()]);
      cache = sanitizeSponsors(rows, now());
    } catch {
      // A failed refresh cannot promote stale or unverified content.
      cache = [];
    } finally {
      clearTimeout(timer); controller.abort();
      fetchedAt = now(); retryAt = fetchedAt + SPONSOR_CACHE_MS;
    }
  }
  return Object.freeze({
    async list() {
      if (inflight) await inflight;
      else if (now() >= retryAt) {
        inflight = refresh();
        try { await inflight; } finally { inflight = null; }
      }
      // Cached boosts may expire within the minute. The client repeats this check
      // because a CDN snapshot can outlive an individual placement's expiry.
      return { sponsors: sanitizeSponsors(cache, now()), fetchedAt };
    },
  });
}
