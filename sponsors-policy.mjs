// Shared by the public feed adapter and the Free-mode banner. No wallet access.
export const SPONSOR_ORIGIN = 'https://scan.devfridge.cool';
export const SPONSOR_FEATURE_URL = `${SPONSOR_ORIGIN}/#feature`;
export const SPONSOR_LIMIT = 12;
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const LOGO_KEYS = new Set(['cid', 'path', 'mint', 'url', 'v']);

export function sponsorMint(value) {
  if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return null;
  let number = 0n;
  for (const character of value) number = number * 58n + BigInt(BASE58.indexOf(character));
  const bytes = (number ? Math.ceil(number.toString(16).length / 2) : 0) + value.match(/^1*/)[0].length;
  return bytes === 32 ? value : null;
}

export function sponsorText(value, fallback, limit) {
  if (typeof value !== 'string') return fallback;
  const text = value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ').trim();
  return Array.from(text).slice(0, limit).join('') || fallback;
}

export function sanitizeSponsorLogo(value, mint) {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  let url;
  try { url = new URL(value, SPONSOR_ORIGIN); } catch { return null; }
  if (url.origin !== SPONSOR_ORIGIN || url.pathname !== '/api/logo' || url.username || url.password || url.hash) return null;
  const seen = new Set();
  for (const key of url.searchParams.keys()) {
    if (!LOGO_KEYS.has(key) || seen.has(key)) return null;
    seen.add(key);
  }
  const cid = url.searchParams.get('cid'), image = url.searchParams.get('url'), path = url.searchParams.get('path');
  if (!cid && !image) return null;
  if (cid && !/^[a-zA-Z0-9]{46,90}$/.test(cid)) return null;
  if (path && (!path.startsWith('/') || path.startsWith('//') || /[?#\\\u0000-\u0020\u007f]/.test(path) || path.length > 512)) return null;
  if (image) {
    let source;
    try { source = new URL(image); } catch { return null; }
    if (source.protocol !== 'https:' || source.username || source.password || source.hash
      || !source.hostname.includes('.') || /^[\d.[\]:]+$/.test(source.hostname)
      || /(?:^|\.)(?:localhost|local|internal)$/.test(source.hostname)) return null;
  }
  if (mint) url.searchParams.set('mint', mint);
  url.searchParams.set('v', '3');
  return url.href.length <= 2048 ? url.href : null;
}

export function sanitizeSponsors(rows, now = Date.now()) {
  if (!Array.isArray(rows) || !Number.isFinite(now)) return [];
  const sponsors = [], seen = new Set();
  for (const row of rows.slice(0, 256)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const mint = sponsorMint(row.mint), expiresAt = row.expiresAt;
    if (!mint || seen.has(mint) || !Number.isSafeInteger(expiresAt) || expiresAt <= now) continue;
    seen.add(mint);
    sponsors.push(Object.freeze({
      mint, name: sponsorText(row.name, `${mint.slice(0, 4)}…${mint.slice(-4)}`, 64),
      symbol: sponsorText(row.symbol, 'TOKEN', 16).replace(/^\$+/, '') || 'TOKEN',
      logo: sanitizeSponsorLogo(row.logo ?? row.image, mint),
      url: `${SPONSOR_ORIGIN}/t/${mint}`, expiresAt,
    }));
    if (sponsors.length === SPONSOR_LIMIT) break;
  }
  return sponsors;
}
