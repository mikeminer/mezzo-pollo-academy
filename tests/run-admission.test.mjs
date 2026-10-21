import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const beginSource = html.slice(html.indexOf('function beginRun(config){'), html.indexOf('function tutorialScenario(spec){'));
const requestSource = html.slice(html.indexOf('function requestRun(config){'), html.indexOf('function pause(){'));
const gameOverSource = html.slice(html.indexOf('function gameOver(){'), html.indexOf("$('btnPlay').onclick="));

function harness({ eligible = false, lives = 0, paid = false } = {}) {
  const runs = [], screens = [], elements = new Map(), opened = [];
  let shop = 0, admission = paid, checkout;
  const context = vm.createContext({
    accessEligible: eligible, accessLives: lives, state: 'menu', freeSponsorDue:false, sponsorRun:null,
    document:{querySelectorAll:()=>[]}, L:{code:'en'}, tutorial:{active:false},
    G:{config:{name:'free',lives:1},score:123,right:5}, loadBest:()=>0, saveBest(){}, gradeOf:()=>'',resultModeLabel:()=>'',
    window: { open: (...args)=>opened.push(args), MezzoTranslations:{en:{sponsor:{}}}, MezzoArcade: {
      consumeAdmission() { const value = admission; admission = false; return value; },
      open(callback) { checkout = callback; },
      text:key=>key,
    } },
    openShop() { shop++; }, audio() {}, clearWorld() {}, syncAccessUi() {},
    resetGame(config) { runs.push(config); }, music: { start() {}, pause() {} },
    $: id => {if(!elements.has(id))elements.set(id,{style:{}});return elements.get(id);}, show: screen => screens.push(screen), canvas: { focus() {} }, clock: { getDelta() {} },
    mode: { config: (name, lives, tier) => ({ name, tier, lives: name==='free'?1:({ hard: 1, medium: 3, easy: 9, god: 32 })[tier] }) },
  });
  vm.runInContext(beginSource + '\n' + requestSource + '\n' + gameOverSource, context);
  return { context, runs, screens, opened, get shop() { return shop; }, get checkout() { return checkout; } };
}

test('Free, Arcade and Subscription are selectable; only Medium, Easy and God are sold', () => {
  assert.deepEqual([...html.matchAll(/<button\b[^>]*data-mode-select="([^"]+)"/g)].map(match => match[1]), ['free', 'arcade', 'subscription']);
  assert.deepEqual([...html.matchAll(/<button\b[^>]*data-arcade-tier="([^"]+)"/g)].map(match => match[1]), ['medium', 'easy', 'god']);
});

test('first Free run needs no wallet or shop, starts with one life, and rejects inflated lives', () => {
  const h=harness();
  h.context.requestRun({name:'free',lives:1});
  assert.equal(h.runs.length,1);
  assert.equal(h.runs[0].lives,1);
  assert.equal(h.shop,0);
  assert.equal(h.checkout,undefined);
  assert.equal(h.screens.at(-1),null);
  h.context.beginRun({name:'free',lives:32});
  assert.equal(h.runs.length,1);
});

test('Free preserves the result screen, then shows a sponsor between rounds; Continue grants exactly one new run', () => {
  const h=harness();
  h.context.requestRun({name:'free',lives:1});
  h.context.gameOver();
  assert.equal(h.screens.at(-1),'scrOver');
  assert.equal(h.context.freeSponsorDue,true);
  h.context.requestRun({name:'free',lives:1});
  assert.equal(h.screens.at(-1),'scrSponsor');
  assert.equal(h.runs.length,1);
  assert.equal(h.context.state,'sponsor');
  h.context.continueFreeRound();
  h.context.continueFreeRound();
  assert.equal(h.runs.length,2);
  assert.equal(h.context.freeSponsorDue,true,'the newly started round queues only its following promotion');
  assert.equal(h.context.state,'play');
  assert.equal(h.opened.length,0,'continuing never opens the sponsor or requires installation');
  assert.equal(h.shop,0);
  h.context.gameOver();
  h.context.requestRun({name:'free',lives:1});
  assert.equal(h.screens.at(-1),'scrSponsor','every completed free round queues the next promotion');
});

test('sponsor does not interrupt Arcade or Subscription, and an optional native Store link does not start gameplay', async () => {
  const h=harness({eligible:true,lives:10});
  h.context.freeSponsorDue=true;
  h.context.requestRun({name:'subscription',lives:10});
  assert.equal(h.runs.length,1);
  h.context.requestRun({name:'arcade',tier:'medium',lives:3});
  assert.equal(h.screens.at(-1),'scrArcade');
  let nativeOpens=0;
  h.context.window.MezzoAndroid={openSponsor:async()=>{nativeOpens++;}};
  await h.context.openSponsor();
  assert.equal(nativeOpens,1);
  assert.equal(h.opened.length,0);
  assert.equal(h.runs.length,1);
  delete h.context.window.MezzoAndroid;
  await h.context.openSponsor();
  assert.deepEqual(h.opened[0],['https://club.devfridge.cool/download/onlyfridge-club','_blank','noopener,noreferrer']);
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

