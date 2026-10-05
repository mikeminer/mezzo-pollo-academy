import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { ACCESS_POLICY } from '../access-policy.mjs';
import { livesForRawAmount } from '../lock-access.mjs';

const packs = await readFile(new URL('../language-packs.js', import.meta.url), 'utf8');
const source = packs + '\n' + await readFile(new URL('../game-mode.js', import.meta.url), 'utf8');
class Element extends EventTarget {
  constructor(dataset = {}) { super(); this.dataset = dataset; this.attributes = new Map(); }
  setAttribute(key, value) { this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key); }
}
function setup() {
  const hard = new Element({ modeSelect: 'hard' }), easy = new Element({ modeSelect: 'easy' });
  const hardLabel = new Element({ modeText: 'hard' }), easyLabel = new Element({ modeText: 'easy' });
  const choices = new Element(), reviewLink = new Element(), reviewLabel = new Element();
  const selectors = new Map([
    ['[data-mode-select]', [hard, easy]], ['[data-mode-text]', [hardLabel, easyLabel]],
    ['[data-review-link]', [reviewLink]], ['[data-review-label]', [reviewLabel]],
  ]);
  const document = Object.assign(new EventTarget(), {
    querySelectorAll: selector => selectors.get(selector) || [],
    getElementById: id => id === 'modeChoices' ? choices : null,
  });
  const window = { MezzoLocale: { code: 'en' } };
  vm.runInNewContext(source, { window, document, Event });
  return { mode: window.MezzoMode, window, document, hard, easy, hardLabel, easyLabel, choices };
}

test('Hard is the default and always has two lives regardless of shop state', () => {
  const { mode } = setup();
  assert.equal(mode.selected, 'hard');
  assert.equal(mode.config().lives, 2);
  for (const entitlement of [undefined, 0, -1, 1, 1000, NaN, Infinity, '3', null]) {
    const config = mode.config('hard', entitlement);
    assert.equal(config.lives, 2);
    assert.equal(config.name, 'hard');
  }
});

test('Easy requires a positive exact whole life count and never adds base lives', () => {
  const { mode } = setup();
  for (const entitlement of [undefined, 0, -1, 0.5, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2', null]) {
    assert.equal(mode.config('easy', entitlement), null);
  }
  for (const [raw, expected] of [
    [ACCESS_POLICY.rawPerLife - 1n, 0],
    [ACCESS_POLICY.rawPerLife, 1],
    [ACCESS_POLICY.rawPerLife * 2n - 1n, 1],
    [ACCESS_POLICY.rawPerLife * 2n, 2],
    [ACCESS_POLICY.rawPerLife * 1000n, 1000],
  ]) {
    const config = mode.config('easy', livesForRawAmount(raw));
    if (expected === 0) assert.equal(config, null);
    else assert.equal(config.lives, expected);
  }
});

test('Easy reduces runner speed and difficulty while extending answer and rule times', () => {
  const { mode } = setup(), hard = mode.config('hard'), easy = mode.config('easy', 1);
  for (const key of ['speed', 'minSpeed', 'maxSpeed', 'acceleration', 'maxLevel']) assert.ok(easy[key] < hard[key], key);
  for (const key of ['reaction', 'minReaction', 'ruleSeconds']) assert.ok(easy[key] > hard[key], key);
  assert.notEqual(hard.scoreKey, easy.scoreKey);
  assert.equal(hard.scoreKey, 'mp_hard_best');
  assert.equal(easy.scoreKey, 'mp_easy_best');
});

test('a run configuration is immutable and independent of later selection or entitlement changes', () => {
  const { mode } = setup();
  mode.select('easy');
  const startedRun = mode.config(mode.selected, 3);
  assert.ok(Object.isFrozen(startedRun));
  assert.throws(() => { startedRun.lives = 50; }, TypeError);
  mode.select('hard');
  const nextHard = mode.config();
  const nextEasy = mode.config('easy', 7);
  assert.equal(startedRun.name, 'easy');
  assert.equal(startedRun.lives, 3);
  assert.equal(nextHard.lives, 2);
  assert.equal(nextEasy.lives, 7);
  assert.notEqual(startedRun, nextEasy);
  assert.equal(mode.config('easy', 0), null);
  assert.equal(startedRun.lives, 3);
});

test('unknown modes cannot replace a valid selection or create a runnable configuration', () => {
  const { mode, document } = setup();
  let events = 0;
  document.addEventListener('mezzopollo:mode', () => events++);
  for (const name of ['practice', '', null, undefined, 'HARD']) mode.select(name);
  assert.equal(mode.selected, 'hard');
  assert.equal(events, 0);
  for (const name of ['practice', '', null, 'HARD']) assert.throws(() => mode.config(name, 1), { name: 'TypeError' });
});

test('mode buttons update accessible selection and language changes keep it selected', () => {
  const h = setup();
  let events = 0;
  h.document.addEventListener('mezzopollo:mode', () => events++);
  h.easy.dispatchEvent(new Event('click'));
  assert.equal(h.mode.selected, 'easy');
  assert.equal(h.easy.getAttribute('aria-pressed'), 'true');
  assert.equal(h.hard.getAttribute('aria-pressed'), 'false');
  assert.equal(events, 1);
  const labels = new Set([h.easyLabel.textContent]);
  for (const code of ['it', 'pl']) {
    h.window.MezzoLocale.code = code;
    h.document.dispatchEvent(new Event('mezzopollo:language'));
    labels.add(h.easyLabel.textContent);
    assert.equal(h.mode.selected, 'easy');
    assert.equal(h.easy.getAttribute('aria-pressed'), 'true');
    assert.ok(h.choices.getAttribute('aria-label'));
  }
  assert.equal(labels.size, 3);
  assert.equal(events, 1);
});

test('all registered profiles retain Easy selection and render their mode labels', () => {
  const h = setup();
  h.mode.select('easy');
  for (const [code, pack] of Object.entries(h.window.MezzoTranslations)) {
    h.window.MezzoLocale.code = code;
    h.document.dispatchEvent(new Event('mezzopollo:language'));
    assert.equal(h.easyLabel.textContent, pack.mode.easy, code);
    assert.equal(h.hardLabel.textContent, pack.mode.hard, code);
    assert.equal(h.mode.selected, 'easy', code);
    assert.equal(h.mode.config('hard').lives, 2, code);
    assert.equal(h.mode.config('easy', 1).lives, 1, code);
  }
});
