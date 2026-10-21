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
  const free = new Element({ modeSelect: 'free' }), freeLabel = new Element({modeText:'free'});
  const hard = new Element({ modeSelect: 'arcade' }), easy = new Element({ modeSelect: 'subscription' });
  const hardLabel = new Element({ modeText: 'arcade' }), easyLabel = new Element({ modeText: 'subscription' });
  const choices = new Element(), reviewLink = new Element(), reviewLabel = new Element();
  const selectors = new Map([
    ['[data-mode-select]', [free, hard, easy]], ['[data-mode-text]', [freeLabel, hardLabel, easyLabel]],
    ['[data-review-link]', [reviewLink]], ['[data-review-label]', [reviewLabel]],
  ]);
  const document = Object.assign(new EventTarget(), {
    querySelectorAll: selector => selectors.get(selector) || [],
    getElementById: id => id === 'modeChoices' ? choices : null,
  });
  const window = { MezzoLocale: { code: 'en' } };
  vm.runInNewContext(source, { window, document, Event });
  return { mode: window.MezzoMode, window, document, free, freeLabel, hard, easy, hardLabel, easyLabel, choices };
}

test('Free is the default with exactly one life and unknown modes remain unavailable', () => {
  const { mode, document } = setup();
  assert.equal(mode.selected, 'free');
  assert.equal(mode.config().lives, 1);
  let events = 0;
  document.addEventListener('mezzopollo:mode', () => events++);
  for (const name of ['hard', 'easy', 'practice', '', null, undefined, 'ARCADE']) mode.select(name);
  assert.equal(mode.selected, 'free');
  assert.equal(events, 0);
  for (const name of ['hard', 'easy', 'practice', '', null, 'ARCADE']) assert.throws(() => mode.config(name, 100), { name: 'TypeError' });
});

test('Subscription requires at least ten exact whole lives and adds no base lives', () => {
  const { mode } = setup();
  for (const entitlement of [undefined, 0, -1, 1, 9, 9.9, 10.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '10', null]) {
    assert.equal(mode.config('subscription', entitlement), null);
  }
  for (const [raw, expected] of [
    [ACCESS_POLICY.minimumRaw - 1n, 0],
    [ACCESS_POLICY.minimumRaw, 10],
    [ACCESS_POLICY.minimumRaw + ACCESS_POLICY.rawPerLife - 1n, 10],
    [ACCESS_POLICY.minimumRaw + ACCESS_POLICY.rawPerLife, 11],
    [ACCESS_POLICY.rawPerLife * 1000n, 1000],
  ]) {
    const config = mode.config('subscription', livesForRawAmount(raw));
    if (expected === 0) assert.equal(config, null);
    else assert.equal(config.lives, expected);
  }
});

test('Subscription retains the slower pace and existing Easy local record', () => {
  const { mode } = setup(), arcade = mode.config('arcade'), subscription = mode.config('subscription', 10);
  for (const key of ['speed', 'minSpeed', 'maxSpeed', 'acceleration', 'maxLevel']) assert.ok(subscription[key] < arcade[key], key);
  for (const key of ['reaction', 'minReaction', 'ruleSeconds']) assert.ok(subscription[key] > arcade[key], key);
  assert.notEqual(arcade.scoreKey, subscription.scoreKey);
  assert.equal(arcade.scoreKey, 'mp_arcade_medium_best');
  assert.equal(subscription.scoreKey, 'mp_easy_best');
});

test('an ongoing run keeps its immutable life snapshot after entitlement or selection changes', () => {
  const { mode } = setup();
  mode.select('subscription');
  const startedRun = mode.config(mode.selected, 10);
  assert.ok(Object.isFrozen(startedRun));
  assert.throws(() => { startedRun.lives = 50; }, TypeError);
  mode.select('arcade');
  const nextArcade = mode.config();
  const nextSubscription = mode.config('subscription', 17);
  assert.equal(startedRun.name, 'subscription');
  assert.equal(startedRun.lives, 10);
  assert.equal(nextArcade.lives, 3);
  assert.equal(nextSubscription.lives, 17);
  assert.notEqual(startedRun, nextSubscription);
  assert.equal(mode.config('subscription', 9), null);
  assert.equal(startedRun.lives, 10);
});

test('mode buttons update accessible selection and language changes keep it selected', () => {
  const h = setup();
  let events = 0;
  h.document.addEventListener('mezzopollo:mode', () => events++);
  h.easy.dispatchEvent(new Event('click'));
  assert.equal(h.mode.selected, 'subscription');
  assert.equal(h.easy.getAttribute('aria-pressed'), 'true');
  assert.equal(h.hard.getAttribute('aria-pressed'), 'false');
  assert.equal(events, 1);
  const labels = new Set([h.easyLabel.textContent]);
  for (const code of ['it', 'pl']) {
    h.window.MezzoLocale.code = code;
    h.document.dispatchEvent(new Event('mezzopollo:language'));
    labels.add(h.easyLabel.textContent);
    assert.equal(h.mode.selected, 'subscription');
    assert.equal(h.easy.getAttribute('aria-pressed'), 'true');
    assert.ok(h.choices.getAttribute('aria-label'));
  }
  assert.equal(labels.size, 3);
  assert.equal(events, 1);
});

test('all registered profiles retain Subscription selection and render their mode labels', () => {
  const h = setup();
  h.mode.select('subscription');
  for (const [code, pack] of Object.entries(h.window.MezzoTranslations)) {
    h.window.MezzoLocale.code = code;
    h.document.dispatchEvent(new Event('mezzopollo:language'));
    assert.equal(h.easyLabel.textContent, pack.mode.subscription, code);
    assert.equal(h.hardLabel.textContent, pack.arcade.name, code);
    assert.equal(h.mode.selected, 'subscription', code);
    assert.equal(h.freeLabel.textContent, pack.mode.free, code);
    assert.equal(h.mode.config('free', 100).lives, 1, code);
    assert.equal(h.mode.config('arcade').lives, 3, code);
    assert.equal(h.mode.config('subscription', 10).lives, 10, code);
  }
});

test('Free uses a separate local record and immutable life count; older paid Hard receipts still have a configuration', () => {
  const { mode } = setup();
  const free = mode.config('free', 100);
  assert.equal(free.lives, 1);
  assert.equal(free.scoreKey, 'mp_free_best');
  assert.ok(Object.isFrozen(free));
  assert.notEqual(free.scoreKey, mode.config('arcade').scoreKey);
  assert.equal(mode.config('arcade', 0, 'hard').lives, 1);
});
