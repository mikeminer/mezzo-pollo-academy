import { sanitizeSponsors, SPONSOR_FEATURE_URL } from './sponsors-policy.mjs';

// One draw per page visit. Expiry removes a card; it never rotates it into another.
export function createSponsorSelection({ load, now = Date.now, random = Math.random }) {
  let selected = null, pending;
  return Object.freeze({
    get current() { if (selected && selected.expiresAt <= now()) selected = null; return selected; },
    load() {
      if (!pending) pending = Promise.resolve().then(load).then(body => {
        const sponsors = sanitizeSponsors(body?.sponsors, now());
        const draw = random();
        const index = Math.floor((Number.isFinite(draw) ? Math.max(0, Math.min(draw, 0.999999999)) : 0) * sponsors.length);
        selected = sponsors[index] || null;
        return selected;
      }).catch(() => { selected = null; return null; });
      return pending;
    },
  });
}

export function freeSponsorVisible({ ready, inert, tutorial, selectedMode, runMode, screen }) {
  if (!ready || inert || tutorial) return false;
  if (screen === 'menu') return selectedMode === 'free';
  return ['play', 'pause', 'over'].includes(screen) && runMode === 'free';
}

async function loadSponsors() {
  if (window.MezzoAndroid?.loadTokenSponsors) return window.MezzoAndroid.loadTokenSponsors();
  const response = await fetch('/api/sponsors', { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(4500) });
  if (!response.ok || Number(response.headers.get('content-length') || 0) > 65536) throw Error('sponsors_unavailable');
  const body = await response.text();
  if (body.length > 65536) throw Error('sponsors_unavailable');
  return JSON.parse(body);
}

export function mountTokenSponsor({ window: win, document: doc, load = loadSponsors, now = Date.now, random = Math.random }) {
  const get = id => doc.getElementById(id);
  const slot = get('tokenSponsorSlot'), viewport = get('gameViewport'), app = get('app');
  if (!slot || !viewport || !app) return null;
  const link = get('tokenSponsorLink'), logo = get('tokenSponsorLogo'), mark = get('tokenSponsorMark');
  const selection = createSponsorSelection({ load, now, random });
  let requested = false, expiryTimer, lastLogo = '', brokenLogo = '';
  const text = (key, params = {}) => {
    const pack = win.MezzoTranslations?.[win.MezzoLocale?.code] || win.MezzoTranslations?.en;
    return (pack?.tokenSponsor?.[key] || key).replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
  };
  function screen() {
    for (const [id, name] of [['scrMenu', 'menu'], ['scrPause', 'pause'], ['scrOver', 'over']]) if (get(id)?.hidden === false) return name;
    return get('overlay')?.hidden && get('hud')?.hidden === false ? 'play' : 'other';
  }
  function paint() {
    const sponsor = selection.current;
    link.href = sponsor?.url || SPONSOR_FEATURE_URL;
    link.setAttribute('aria-label', sponsor ? text('openLabel', { name: sponsor.name }) : text('emptyLabel'));
    get('tokenSponsorTitle').textContent = sponsor?.name || 'YOUR AD HERE';
    get('tokenSponsorSymbol').textContent = sponsor ? '$' + sponsor.symbol : '';
    get('tokenSponsorSymbol').hidden = !sponsor;
    get('tokenSponsorDetail').textContent = text(sponsor ? 'paidLabel' : 'emptyBody');
    get('tokenSponsorDisclaimer').textContent = text('disclaimer');
    get('tokenSponsorDisclaimer').hidden = !sponsor;
    // Never fetch even an allowlisted logo while this is a paid-mode player.
    const image = !slot.hidden && sponsor?.logo !== brokenLogo ? sponsor?.logo || '' : '';
    logo.hidden = !image; mark.hidden = Boolean(image);
    if (image !== lastLogo) { lastLogo = image; if (image) logo.src = image; else logo.removeAttribute('src'); }
    win.clearTimeout(expiryTimer);
    if (sponsor && !slot.hidden) expiryTimer = win.setTimeout(render, Math.min(2147483647, Math.max(1, sponsor.expiresAt - now() + 1)));
  }
  function render() {
    slot.hidden = !freeSponsorVisible({ ready: win.MezzoLocale?.ready, inert: app.inert, tutorial: win.MezzoTutorial?.active,
      selectedMode: win.MezzoMode?.selected, runMode: viewport.dataset.runMode, screen: screen() });
    paint();
    if (!slot.hidden && !requested) { requested = true; void selection.load().then(render); }
  }
  logo.addEventListener('error', () => { brokenLogo = lastLogo; paint(); });
  link.addEventListener('click', event => {
    if (slot.hidden) { event.preventDefault(); return; }
    paint(); // A boost can expire while the page is in the background.
    doc.dispatchEvent(new win.Event('mezzopollo:token-sponsor-open'));
    if (win.MezzoAndroid?.openTokenSponsor) {
      event.preventDefault();
      void win.MezzoAndroid.openTokenSponsor(link.href).catch(() => {});
    }
  });
  const observer = new win.MutationObserver(render);
  observer.observe(viewport, { subtree: true, attributes: true, attributeFilter: ['hidden', 'data-run-mode'] });
  observer.observe(app, { attributes: true, attributeFilter: ['inert'] });
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'] });
  for (const name of ['mezzopollo:language', 'mezzopollo:mode', 'visibilitychange']) doc.addEventListener(name, render);
  render();
  return Object.freeze({ render, selection });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') mountTokenSponsor({ window, document });
