import test from 'node:test';
import assert from 'node:assert/strict';
import { createSponsorSelection, freeSponsorVisible, mountTokenSponsor } from '../game-token-sponsor.mjs';
const mint = 'Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump';
const second = 'So11111111111111111111111111111111111111112';
const row = (address = mint) => ({ mint: address, name: 'Example', symbol: 'EX', expiresAt: 2000 });

test('one draw and one fetch per visit, even with concurrent loads and repeated rounds', async () => {
  let calls = 0, draws = 0, clock = 1000;
  const pick = createSponsorSelection({ load: async () => { calls++; return { sponsors: [row(), row(second)] }; }, now: () => clock, random: () => { draws++; return .75; } });
  const [a, b] = await Promise.all([pick.load(), pick.load()]);
  assert.equal(a.mint, second); assert.equal(a, b);
  await pick.load(); assert.equal(calls, 1); assert.equal(draws, 1);
  clock = 2000; assert.equal(pick.current, null);
  await pick.load(); assert.equal(pick.current, null); assert.equal(draws, 1);
});

test('empty, failed and expired feeds leave a usable empty slot', async () => {
  for (const load of [async () => ({ sponsors: [] }), async () => { throw Error('offline'); }, async () => ({ sponsors: [row()] })]) {
    const pick = createSponsorSelection({ load, now: () => 3000 });
    assert.equal(await pick.load(), null); assert.equal(pick.current, null);
  }
});

test('visibility follows the current run, not a stale menu selection', () => {
  const base = { ready: true, inert: false, tutorial: false, selectedMode: 'free', runMode: 'free' };
  for (const screen of ['menu', 'play', 'pause', 'over']) assert.equal(freeSponsorVisible({ ...base, screen }), true);
  for (const screen of ['access', 'sponsor', 'how', 'other']) assert.equal(freeSponsorVisible({ ...base, screen }), false);
  for (const mode of ['arcade', 'subscription']) {
    assert.equal(freeSponsorVisible({ ...base, selectedMode: mode, screen: 'menu' }), false);
    assert.equal(freeSponsorVisible({ ...base, runMode: mode, screen: 'play' }), false);
  }
  for (const gate of [{ ready: false }, { inert: true }, { tutorial: true }]) assert.equal(freeSponsorVisible({ ...base, screen: 'menu', ...gate }), false);
});

function fixture({ native = false, mode = 'free', body = { sponsors: [row()] } } = {}) {
  const ids = ['tokenSponsorSlot', 'gameViewport', 'app', 'tokenSponsorLink', 'tokenSponsorLogo', 'tokenSponsorMark', 'tokenSponsorTitle', 'tokenSponsorSymbol', 'tokenSponsorDetail', 'tokenSponsorDisclaimer', 'scrMenu', 'scrPause', 'scrOver', 'overlay', 'hud'];
  class Element extends EventTarget {
    hidden = true; inert = false; dataset = {}; attrs = {};
    setAttribute(k, v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this[k]; delete this.attrs[k]; }
  }
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  elements.scrMenu.hidden = false; elements.gameViewport.dataset.runMode = 'free';
  const doc = new EventTarget(); doc.getElementById = id => elements[id]; doc.documentElement = new Element();
  let calls = 0, time = 1000, opened = '', paused = 0, timer;
  doc.addEventListener('mezzopollo:token-sponsor-open', () => paused++);
  const win = { Event, MutationObserver: class { observe() {} }, clearTimeout() { timer = null; }, setTimeout(callback) { timer = callback; return 1; },
    MezzoLocale: { ready: true, code: 'en' }, MezzoMode: { selected: mode }, MezzoTutorial: { active: false },
    MezzoTranslations: { en: { tokenSponsor: { emptyBody: 'Your token on Scan', emptyLabel: 'Advertise', paidLabel: 'Paid placement', disclaimer: 'Not investment advice', openLabel: 'Open {name}' } } },
    ...(native ? { MezzoAndroid: { openTokenSponsor: async url => { opened = url; } } } : {}) };
  const mounted = mountTokenSponsor({ window: win, document: doc, load: async () => { calls++; return body; }, now: () => time, random: () => 0 });
  return { elements, doc, win, mounted, get calls() { return calls; }, get opened() { return opened; }, get paused() { return paused; }, expire() { time = 2001; timer?.(); } };
}

test('paid menu never fetches a feed; switching to Free fetches once and switching back hides it', async () => {
  const f = fixture({ mode: 'arcade' }); await Promise.resolve();
  assert.equal(f.calls, 0); assert.equal(f.elements.tokenSponsorSlot.hidden, true);
  f.win.MezzoMode.selected = 'free'; f.mounted.render(); await f.mounted.selection.load(); f.mounted.render();
  assert.equal(f.calls, 1); assert.equal(f.elements.tokenSponsorTitle.textContent, 'Example');
  f.win.MezzoMode.selected = 'subscription'; f.mounted.render(); assert.equal(f.elements.tokenSponsorSlot.hidden, true);
  f.win.MezzoMode.selected = 'free'; f.mounted.render(); assert.equal(f.calls, 1);
});

test('native card pauses the game and opens only the canonical Scan page externally', async () => {
  const f = fixture({ native: true, body: { sponsors: [{ ...row(), url: 'https://evil.invalid', name: '<b>Example</b>' }] } });
  await f.mounted.selection.load(); f.mounted.render();
  const click = new Event('click', { cancelable: true }); f.elements.tokenSponsorLink.dispatchEvent(click);
  assert.equal(click.defaultPrevented, true); assert.equal(f.opened, `https://scan.devfridge.cool/t/${mint}`);
  assert.equal(f.paused, 1); assert.equal(f.elements.tokenSponsorTitle.textContent, 'Example');
  f.expire(); assert.equal(f.elements.tokenSponsorTitle.textContent, 'YOUR AD HERE');
  assert.equal(f.elements.tokenSponsorDisclaimer.hidden, true);
  f.elements.tokenSponsorLink.dispatchEvent(new Event('click', { cancelable: true }));
  assert.equal(f.opened, 'https://scan.devfridge.cool/#feature');
});

test('web card preserves anchor navigation; hidden card cannot open or pause', async () => {
  const f = fixture({ body: { sponsors: [] } }); await f.mounted.selection.load(); f.mounted.render();
  const click = new Event('click', { cancelable: true }); f.elements.tokenSponsorLink.dispatchEvent(click);
  assert.equal(click.defaultPrevented, false); assert.equal(f.paused, 1);
  f.win.MezzoTutorial.active = true; f.mounted.render();
  const hidden = new Event('click', { cancelable: true }); f.elements.tokenSponsorLink.dispatchEvent(hidden);
  assert.equal(hidden.defaultPrevented, true); assert.equal(f.paused, 1);
});
