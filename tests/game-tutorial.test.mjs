import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../game-tutorial.js', import.meta.url), 'utf8');
class Element extends EventTarget {
  constructor() {
    super(); this.dataset = {}; this.children = []; this.attributes = new Map(); this.queries = new Map();
    const names = new Set();
    this.classList = { add: name => names.add(name), remove: name => names.delete(name), contains: name => names.has(name),
      toggle(name, enabled) { if (enabled ?? !names.has(name)) names.add(name); else names.delete(name); } };
  }
  append(child) { this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  focus() { this.focused = true; }
  querySelector(selector) {
    if (!this.queries.has(selector)) {
      const element = new Element();
      const action = selector.match(/data-tutorial-action="(.*?)"/);
      if (action) element.dataset.tutorialAction = action[1];
      this.queries.set(selector, element);
    }
    return this.queries.get(selector);
  }
  querySelectorAll(selector) {
    return selector === 'button' ? ['left', 'jump', 'right'].map(action => this.querySelector(`[data-tutorial-action="${action}"]`)) : [];
  }
}
function setup({ language = 'en', storage = new Map(), blockedStorage = false } = {}) {
  const app = new Element(), track = new Element(), root = new Element();
  const document = Object.assign(new EventTarget(), {
    documentElement: root, body: app,
    createElement: () => new Element(),
    getElementById: id => id === 'app' ? app : id === 'c' ? track : null,
  });
  const window = { MezzoLocale: { code: language } };
  const localStorage = {
    getItem(key) { if (blockedStorage) throw new Error('Storage disabled'); return storage.get(key) ?? null; },
    setItem(key, value) { if (blockedStorage) throw new Error('Storage disabled'); storage.set(key, value); },
  };
  vm.runInNewContext(source, { window, document, localStorage });
  const scenarios = [], actions = [], finished = [];
  const tutorial = window.MezzoTutorial;
  const callbacks = { onStep: spec => scenarios.push(spec), onAction: action => actions.push(action), onFinish: result => finished.push(result) };
  return { tutorial, window, document, app, root, storage, scenarios, actions, finished,
    start: () => tutorial.start(callbacks),
    ui: () => app.children[0],
    click(selector) { app.children[0].querySelector(selector).dispatchEvent(new Event('click')); },
    control(action) { app.children[0].querySelector('.tutorial-controls').querySelector(`[data-tutorial-action="${action}"]`).dispatchEvent(new Event('click')); },
  };
}
const successes = [
  { type: 'lane', direction: -1 }, { type: 'lane', direction: 1 }, { type: 'jump' },
  { type: 'gate', rule: 'normal', correct: true }, { type: 'gate', rule: 'reverse', correct: true },
  { type: 'whole', correct: true },
];
function reachGate(h) {
  for (const event of successes.slice(0, 3)) { h.tutorial.observe(event); h.tutorial.next(); }
}

test('all six lessons require accepted gameplay evidence and explicit advancement', () => {
  const h = setup();
  assert.equal(h.tutorial.shouldStart(), true);
  assert.equal(h.start(), true);
  assert.equal(h.tutorial.active, true);
  assert.equal(h.tutorial.observe({ type: 'lane', direction: 1 }), false);
  const expected = ['left', 'right', 'jump', 'gate', 'reverse', 'whole'];
  for (const [index, event] of successes.entries()) {
    assert.equal(h.tutorial.step.id, expected[index]);
    assert.equal(h.tutorial.waiting, false);
    assert.equal(h.tutorial.next(), false);
    assert.equal(h.tutorial.observe(event), true);
    assert.equal(h.tutorial.waiting, true);
    assert.equal(h.tutorial.observe(event), false);
    assert.equal(h.tutorial.next(), true);
  }
  assert.equal(h.tutorial.active, false);
  assert.equal(h.tutorial.step, null);
  assert.equal(h.tutorial.waiting, false);
  assert.equal(h.ui().hidden, true);
  assert.equal(h.root.classList.contains('tutorial-active'), false);
  assert.equal(h.finished.length, 1);
  assert.equal(h.finished[0].skipped, false);
  assert.equal(h.tutorial.shouldStart(), false);
  assert.equal(h.tutorial.next(), false);
  assert.equal(h.finished.length, 1);
});

test('failed gates retry the same scenario and reject results for a different rule', () => {
  const h = setup(); h.start(); reachGate(h);
  assert.equal(h.tutorial.step.id, 'gate');
  assert.equal(h.tutorial.observe({ type: 'gate', rule: 'reverse', correct: true }), false);
  assert.equal(h.tutorial.observe({ type: 'gate', rule: 'normal', correct: 'true' }), false);
  assert.equal(h.tutorial.observe({ type: 'gate', rule: 'normal', correct: false }), true);
  assert.equal(h.ui().dataset.outcome, 'retry');
  h.tutorial.next();
  assert.equal(h.tutorial.step.id, 'gate');
  assert.equal(h.scenarios.at(-1).id, 'gate');
  assert.equal(h.tutorial.waiting, false);
  h.tutorial.observe(successes[3]); h.tutorial.next();
  assert.equal(h.tutorial.step.id, 'reverse');
  assert.equal(h.tutorial.observe({ type: 'gate', rule: 'normal', correct: true }), false);
  h.tutorial.observe(successes[4]); h.tutorial.next();
  h.tutorial.observe({ type: 'whole', correct: false }); h.tutorial.next();
  assert.equal(h.tutorial.step.id, 'whole');
  assert.equal(h.finished.length, 0);
});

test('pausing blocks completion, skip and touch controls and resumes the same outcome', () => {
  const h = setup(); h.start();
  h.tutorial.observe(successes[0]);
  h.tutorial.setPaused(true);
  assert.equal(h.tutorial.paused, true);
  assert.equal(h.ui().hidden, true);
  assert.equal(h.tutorial.next(), false);
  assert.equal(h.tutorial.observe(successes[0]), false);
  h.click('.tutorial-skip'); h.control('left');
  assert.equal(h.finished.length, 0);
  assert.equal(h.actions.length, 0);
  h.tutorial.setPaused(false);
  assert.equal(h.ui().hidden, false);
  assert.equal(h.tutorial.waiting, true);
  assert.equal(h.tutorial.next(), true);
  assert.equal(h.tutorial.step.id, 'right');
});

test('touch controls call the runner without granting progress until the runner accepts them', () => {
  const h = setup(); h.start();
  h.control('left');
  assert.deepEqual(h.actions, ['left']);
  assert.equal(h.tutorial.waiting, false);
  h.tutorial.observe(successes[0]);
  h.control('left');
  assert.deepEqual(h.actions, ['left']);
  assert.equal(h.tutorial.start({ onFinish: () => { throw Error('Must not replace active callbacks'); } }), false);
  h.click('.tutorial-skip');
  assert.equal(h.finished.length, 1);
  assert.equal(h.finished[0].skipped, true);
});

test('language changes restart the current challenge in the selected language and preserve pause', () => {
  const h = setup(); h.start(); reachGate(h);
  h.tutorial.observe(successes[3]); h.tutorial.setPaused(true);
  const oldQuestion = h.tutorial.step.question;
  h.window.MezzoLocale.code = 'pl';
  h.document.dispatchEvent(new Event('mezzopollo:language'));
  assert.equal(h.tutorial.active, true);
  assert.equal(h.tutorial.paused, true);
  assert.equal(h.tutorial.waiting, false);
  assert.equal(h.tutorial.step.id, 'gate');
  assert.equal(h.tutorial.step.locale, 'pl');
  assert.notEqual(h.tutorial.step.question, oldQuestion);
  assert.equal(h.scenarios.at(-1).locale, 'pl');
  assert.equal(h.ui().lang, 'pl');
  assert.equal(h.ui().hidden, true);
  h.tutorial.setPaused(false);
  assert.equal(h.ui().hidden, false);
});

test('cancel is not completion and a later start begins at the first lesson', () => {
  const h = setup(); h.start(); reachGate(h); h.tutorial.cancel();
  assert.equal(h.tutorial.active, false);
  assert.equal(h.tutorial.shouldStart(), true);
  assert.equal(h.finished.length, 0);
  assert.equal(h.storage.size, 0);
  assert.equal(h.tutorial.observe(successes[3]), false);
  assert.equal(h.start(), true);
  assert.equal(h.tutorial.step.id, 'left');
});

test('completion memory is per language and persists across page visits when storage works', () => {
  const storage = new Map(), h = setup({ language: 'it', storage });
  h.start(); h.click('.tutorial-skip');
  assert.equal(h.tutorial.shouldStart(), false);
  assert.equal(h.finished[0].locale, 'it');
  assert.equal(setup({ language: 'it', storage }).tutorial.shouldStart(), false);
  assert.equal(setup({ language: 'en', storage }).tutorial.shouldStart(), true);
  assert.equal(setup({ language: 'pl', storage }).tutorial.shouldStart(), true);
});

test('blocked localStorage still remembers completion during the current visit', () => {
  const h = setup({ blockedStorage: true });
  assert.equal(h.tutorial.shouldStart(), true);
  h.start(); h.click('.tutorial-skip');
  assert.equal(h.tutorial.shouldStart(), false);
  h.window.MezzoLocale.code = 'it';
  assert.equal(h.tutorial.shouldStart(), true);
  h.window.MezzoLocale.code = 'en';
  assert.equal(h.tutorial.shouldStart(), false);
});
