import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const beginSource = html.slice(html.indexOf('function beginRun(config){'), html.indexOf('function tutorialScenario(spec){'));
const requestSource = html.slice(html.indexOf('function requestRun(config){'), html.indexOf('function pause(){'));

function harness({ eligible = false, lives = 0, paid = false } = {}) {
  const runs = [], screens = [];
  let shop = 0, admission = paid, checkout;
  const context = vm.createContext({
    accessEligible: eligible, accessLives: lives, state: 'menu',
    window: { MezzoArcade: {
      consumeAdmission() { const value = admission; admission = false; return value; },
      open(callback) { checkout = callback; },
    } },
    openShop() { shop++; }, audio() {}, clearWorld() {}, syncAccessUi() {},
    resetGame(config) { runs.push(config); }, music: { start() {}, pause() {} },
    $: () => ({}), show: screen => screens.push(screen), canvas: { focus() {} }, clock: { getDelta() {} },
    mode: { config: (name, lives, tier) => ({ name, tier, lives: ({ hard: 1, medium: 3, easy: 9, god: 32 })[tier] }) },
  });
  vm.runInContext(beginSource + '\n' + requestSource, context);
  return { context, runs, screens, get shop() { return shop; }, get checkout() { return checkout; } };
}

test('only Arcade and Subscription are selectable on the actual menu', () => {
  assert.deepEqual([...html.matchAll(/<button\b[^>]*data-mode-select="([^"]+)"/g)].map(match => match[1]), ['arcade', 'subscription']);
});

test('unpaid runs and removed modes cannot enter gameplay', () => {
  const h = harness();
  for (const config of [null, { name: 'hard', lives: 2 }, { name: 'easy', lives: 50 }, { name: 'arcade', tier: 'god', lives: 32 }]) h.context.beginRun(config);
  assert.equal(h.runs.length, 0);
});

test('Arcade admission is consumed once and every retry returns to checkout', () => {
  const h = harness({ paid: true });
  const config = { name: 'arcade', tier: 'medium', lives: 3 };
  h.context.beginRun(config);
  h.context.beginRun(config);
  assert.equal(h.runs.length, 1);
  h.context.requestRun(config);
  assert.equal(h.screens.at(-1), 'scrArcade');
  h.checkout({ tier: 'medium' });
  assert.equal(h.runs.length, 1, 'a callback without a fresh one-shot receipt cannot grant a second run');
});

test('Subscription rejects old subthreshold grants and stale tutorial snapshots', () => {
  for (const [eligible, lives, requested] of [[false, 10, 10], [true, 9, 9], [true, 10, 11], [true, 0, 10]]) {
    const h = harness({ eligible, lives });
    h.context.requestRun({ name: 'subscription', lives: requested });
    assert.equal(h.runs.length, 0);
    assert.equal(h.shop, 1);
  }
  const h = harness({ eligible: true, lives: 10 });
  h.context.requestRun({ name: 'subscription', lives: 10 });
  assert.equal(h.runs.length, 1);
  assert.equal(h.runs[0].lives, 10);
  h.context.accessEligible = false;
  h.context.requestRun({ name: 'subscription', lives: 10 });
  assert.equal(h.runs.length, 1, 'a future run is denied after shop revocation');
  assert.equal(h.runs[0].lives, 10, 'the active snapshot is unaffected');
});

