import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const packsSource = await readFile(new URL('../language-packs.js', import.meta.url), 'utf8');
const modeSource = await readFile(new URL('../game-mode.js', import.meta.url), 'utf8');
const arcadeSource = await readFile(new URL('../game-arcade.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const shareStart = html.indexOf('function resultModeLabel()');
const shareEnd = html.indexOf('/* ---------- resize ---------- */', shareStart);
assert.ok(shareStart > 0 && shareEnd > shareStart, 'The production score-sharing handler must be available');
const shareSource = html.slice(shareStart, shareEnd);

function setup({ code = 'en', transport = 'native' } = {}) {
  const shared = [], painted = [];
  const elements = new Map(['btnShare', 'gradeTxt', 'oScore', 'shareImg', 'shareNote'].map(id => [id, { textContent: '', style: {} }]));
  elements.get('gradeTxt').textContent = 'Chicken';
  elements.get('oScore').textContent = '1234';
  const document = Object.assign(new EventTarget(), {
    getElementById: id => elements.get(id) || null,
    querySelectorAll: () => [],
  });
  const window = { MezzoLocale: { code } };
  const context = vm.createContext({ window, document, Event, console, setTimeout, clearTimeout,
    fetch: async () => ({ blob: async () => ({ type: 'image/png' }) }),
    File: class { constructor(parts, name, options) { Object.assign(this, { parts, name, ...options }); } },
    navigator: transport === 'browser' ? { canShare: () => true, share: async value => shared.push(value) } : {},
  });
  vm.runInContext(packsSource, context);
  const pack = window.MezzoTranslations[code];
  assert.ok(pack, `Missing profile: ${code}`);
  const format = new Intl.NumberFormat(pack.meta.locale);
  const plural = new Intl.PluralRules(pack.meta.locale);
  Object.assign(window.MezzoLocale, { number: value => format.format(value), lifeWord: count => pack.life[plural.select(count)] || pack.life.other });
  if (transport === 'native') window.MezzoAndroid = { shareScore: async value => shared.push(value) };
  vm.runInContext(modeSource + '\n' + arcadeSource, context);
  const fakeContext = { fillRect() {}, drawImage() {}, fillText(value) { painted.push(value); } };
  Object.assign(context, {
    $: id => elements.get(id),
    cv: () => [{ toDataURL: () => 'data:image/png;base64,c2NvcmU=' }, fakeContext],
    slateC: {}, HAND: 'sans-serif',
    G: { config: window.MezzoMode.config('arcade', 0, 'hard'), score: 1234.9, right: 7 },
    L: window.MezzoLocale, mode: window.MezzoMode,
    t: (key, params = {}) => pack.core[key].replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)),
  });
  vm.runInContext(shareSource, context);
  return { window, context, elements, shared, painted, pack };
}

test('Arcade keeps each paid level immutable and gives it a separate local record', () => {
  const { window } = setup();
  const mode = window.MezzoMode;
  const expected = { hard: 1, medium: 3, easy: 9, god: 32 };
  const keys = new Set([mode.config('hard').scoreKey, mode.config('easy', 1).scoreKey]);
  for (const [tier, lives] of Object.entries(expected)) {
    const run = mode.config('arcade', 999, tier);
    assert.equal(run.name, 'arcade');
    assert.equal(run.tier, tier);
    assert.equal(run.lives, lives);
    assert.equal(Object.isFrozen(run), true);
    assert.throws(() => { run.lives = 999; }, TypeError);
    keys.add(run.scoreKey);
    mode.select('easy');
    assert.equal(run.lives, lives);
    assert.equal(run.tier, tier);
  }
  assert.equal(keys.size, 6, 'Free Hard, timelock Easy and all four Arcade tiers keep separate records');
  assert.equal(mode.config('hard').lives, 2);
  assert.equal(mode.config('easy', 1).lives, 1);
  for (const tier of ['', 'unknown', 'constructor', '__proto__']) {
    assert.throws(() => mode.config('arcade', 0, tier), { name: 'TypeError' });
  }
});

test('every regional profile shares the completed Arcade level and score through the native bridge', async () => {
  const profiles = Object.keys(setup().window.MezzoTranslations);
  assert.equal(profiles.length, 25);
  for (const code of profiles) {
    const h = setup({ code });
    for (const tier of ['hard', 'medium', 'easy', 'god']) {
      h.context.G.config = h.window.MezzoMode.config('arcade', 0, tier);
      // The checkout selection is still Hard: sharing must use the finished run's config.
      await h.elements.get('btnShare').onclick();
      const payload = h.shared.at(-1);
      const level = h.pack.arcade[tier];
      const score = h.window.MezzoLocale.number(1234);
      assert.ok(payload.text.includes(level), `${code}/${tier}: translated finished-run difficulty`);
      assert.ok(payload.text.includes(score), `${code}/${tier}: localized whole-number score`);
      assert.ok(payload.text.includes('https://mezzopollo.it/'));
      assert.equal(payload.png, 'data:image/png;base64,c2NvcmU=');
      assert.ok(h.painted.some(text => text.includes(level)), `${code}/${tier}: image also includes difficulty`);
      assert.doesNotMatch(payload.text, /\{(?:level|score)\}/);
    }
  }
});

test('browser sharing includes the screenshot, score and finished-run difficulty', async () => {
  const h = setup({ code: 'it', transport: 'browser' });
  h.context.G.config = h.window.MezzoMode.config('arcade', 0, 'god');
  await h.elements.get('btnShare').onclick();
  assert.equal(h.shared.length, 1);
  const payload = h.shared[0];
  assert.ok(payload.text.includes(h.pack.arcade.god));
  assert.ok(payload.text.includes(h.window.MezzoLocale.number(1234)));
  assert.equal(payload.url, 'https://mezzopollo.it/');
  assert.equal(payload.files.length, 1);
  assert.equal(payload.files[0].type, 'image/png');
});

test('unsupported Web Share keeps the full localized score and difficulty visible for manual sharing', async () => {
  const h = setup({ code: 'zh', transport: 'fallback' });
  h.context.G.config = h.window.MezzoMode.config('arcade', 0, 'medium');
  await h.elements.get('btnShare').onclick();
  assert.equal(h.shared.length, 0);
  assert.equal(h.elements.get('shareImg').style.display, 'block');
  assert.ok(h.elements.get('shareNote').textContent.includes(h.pack.arcade.medium));
  assert.ok(h.elements.get('shareNote').textContent.includes(h.window.MezzoLocale.number(1234)));
  assert.ok(h.elements.get('shareNote').textContent.includes('https://mezzopollo.it/'));
});
