/* Guided practice uses the game's real controls and scenarios supplied by the runner.
 * It never connects a wallet, reads locks, changes lives or writes a score.
 * Runner contract: start({onStep, onAction, onFinish}); see scenario() below.
 * Freeze scenario simulation when waiting or paused. Always suppress damage/scores
 * and random obstacles while active. Report only actions accepted by the runner.
 */
(() => {
  'use strict';
  const VERSION = 'v1';
  const STEPS = ['left', 'right', 'jump', 'gate', 'reverse', 'whole'];
  const copy = Object.fromEntries(Object.entries(window.MezzoTranslations).map(([code,pack])=>[code,pack.tutorial]));
  const completedInMemory = new Set();
  let active = false;
  let paused = false;
  let index = 0;
  let outcome = null;
  let callbacks = null;
  let ui = null;
  function language() { return copy[window.MezzoLocale?.code] ? window.MezzoLocale.code : 'en'; }
  function text() { return copy[language()]; }
  function storageKey(code) { return `mezzo-pollo:tutorial:${VERSION}:${code}`; }
  function shouldStart() {
    const code = language();
    if (completedInMemory.has(code)) return false;
    try { return localStorage.getItem(storageKey(code)) !== 'done'; } catch (_) { return true; }
  }
  function remember() {
    const code = language();
    completedInMemory.add(code);
    try { localStorage.setItem(storageKey(code), 'done'); } catch (_) { /* Memory fallback covers this visit. */ }
  }
  function scenario() {
    const c = text();
    const id = STEPS[index];
    return {
      id, index, total: STEPS.length, locale: language(),
      targetDirection: id === 'left' ? -1 : id === 'right' ? 1 : null,
      question: id === 'whole' ? c.wholeQuestion : c.half,
      answerOptions: ['2', '4', '8'], correctLane: 1,
      rule: id === 'reverse' ? 'reverse' : 'normal',
      ruleText: id === 'whole' ? c.wholeRule : id === 'reverse' ? c.reverseRule : c.normalRule
    };
  }
  function focusTrack() {
    const track = document.getElementById('c');
    if (track && !paused) track.focus({ preventScroll: true });
  }
  function ensureUi() {
    if (ui) return;
    const root = document.createElement('section');
    root.id = 'mezzoTutorial';
    root.className = 'mezzo-tutorial';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-labelledby', 'mezzoTutorialLabel');
    root.hidden = true;
    root.innerHTML = '<div class="tutorial-card"><div class="tutorial-topline"><span id="mezzoTutorialLabel" class="tutorial-eyebrow"></span><button type="button" class="tutorial-skip"></button></div><div class="tutorial-instruction" role="status" aria-live="polite" aria-atomic="true"><div class="tutorial-progress-label"></div><h2 class="tutorial-title"></h2><p class="tutorial-body"></p></div><div class="tutorial-progress" aria-hidden="true"></div><p class="tutorial-safe"></p><div class="tutorial-footer"><div class="tutorial-controls" role="group"><button type="button" data-tutorial-action="left">←</button><button type="button" data-tutorial-action="jump">↑</button><button type="button" data-tutorial-action="right">→</button></div><button type="button" class="tutorial-next" hidden></button></div></div>';
    (document.getElementById('app') || document.body).append(root);
    const select = selector => root.querySelector(selector);
    ui = { root, label: select('.tutorial-eyebrow'), skip: select('.tutorial-skip'), progressLabel: select('.tutorial-progress-label'), title: select('.tutorial-title'), body: select('.tutorial-body'), progress: select('.tutorial-progress'), safe: select('.tutorial-safe'), controls: select('.tutorial-controls'), next: select('.tutorial-next') };
    for (let i = 0; i < STEPS.length; i++) ui.progress.append(document.createElement('span'));
    ui.skip.addEventListener('click', () => finish(true));
    ui.next.addEventListener('click', next);
    ui.controls.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      if (!active || paused || outcome !== null) return;
      callbacks?.onAction?.(button.dataset.tutorialAction);
      focusTrack();
    }));
  }
  function render() {
    if (!ui) return;
    const c = text();
    const id = STEPS[index];
    ui.root.hidden = !active || paused;
    ui.root.lang = window.MezzoLocale?.locale || language();
    ui.root.dataset.outcome = outcome || 'practice';
    ui.label.textContent = c.practice;
    ui.skip.textContent = c.skip;
    ui.progressLabel.textContent = c.progress.replace('{n}', String(index + 1)).replace('{total}', String(STEPS.length));
    ui.title.textContent = c[id][0];
    ui.body.textContent = outcome === 'success' ? (index === STEPS.length - 1 ? c.done : c.good) : outcome === 'retry' ? `${c.again} ${c[id][1]}` : c[id][1];
    ui.safe.textContent = c.safe;
    ui.controls.setAttribute('aria-label', c.label);
    for (const [action, label] of [['left', c.leftControl], ['right', c.rightControl], ['jump', c.jumpControl]]) {
      const button = ui.controls.querySelector(`[data-tutorial-action="${action}"]`);
      button.setAttribute('aria-label', label);
      button.title = label;
      button.disabled = outcome !== null;
      button.classList.toggle('is-cued', outcome === null && (action === id || (id === 'gate' && action !== 'jump') || (id === 'reverse' && action !== 'jump')));
    }
    ui.next.hidden = outcome === null;
    ui.next.textContent = outcome === 'retry' ? c.retry : index === STEPS.length - 1 ? c.finish : c.next;
    Array.from(ui.progress.children).forEach((dot, i) => {
      dot.className = i < index || (i === index && outcome === 'success') ? 'is-done' : i === index ? 'is-current' : '';
    });
  }
  function beginStep() {
    outcome = null;
    render();
    callbacks?.onStep?.(scenario());
    focusTrack();
  }
  function start(options = {}) {
    if (active) return false;
    callbacks = options;
    active = true;
    paused = false;
    index = 0;
    ensureUi();
    document.documentElement.classList.add('tutorial-active');
    beginStep();
    return true;
  }
  function observe(event) {
    if (!active || paused || outcome !== null || !event) return false;
    const id = STEPS[index];
    let accepted = false;
    let success = true;
    if (id === 'left' || id === 'right') accepted = event.type === 'lane' && event.direction === (id === 'left' ? -1 : 1);
    else if (id === 'jump') accepted = event.type === 'jump';
    else if (id === 'gate' || id === 'reverse') {
      accepted = event.type === 'gate' && event.rule === (id === 'reverse' ? 'reverse' : 'normal') && typeof event.correct === 'boolean';
      success = event.correct;
    } else if (id === 'whole') {
      accepted = event.type === 'whole' && typeof event.correct === 'boolean';
      success = event.correct;
    }
    if (!accepted) return false;
    outcome = success ? 'success' : 'retry';
    render();
    return true;
  }
  function next() {
    if (!active || paused || outcome === null) return false;
    if (outcome === 'success') {
      if (index === STEPS.length - 1) { finish(false); return true; }
      index++;
    }
    beginStep();
    return true;
  }
  function cancel() {
    active = false;
    paused = false;
    outcome = null;
    callbacks = null;
    if (ui) ui.root.hidden = true;
    document.documentElement.classList.remove('tutorial-active');
  }
  function finish(skipped) {
    if (!active || paused) return;
    const onFinish = callbacks?.onFinish;
    remember();
    cancel();
    onFinish?.({ skipped, locale: language() });
  }
  function setPaused(value) {
    if (!active) return;
    paused = Boolean(value);
    render();
  }
  document.addEventListener('mezzopollo:language', () => {
    if (!active) return;
    // Restart this challenge in the new language, preserving the game's pause.
    outcome = null;
    render();
    callbacks?.onStep?.(scenario());
  });
  window.MezzoTutorial = Object.freeze({
    shouldStart, start, observe, next, cancel, setPaused,
    get active() { return active; },
    get waiting() { return active && outcome !== null; },
    get paused() { return active && paused; },
    get step() { return active ? scenario() : null; }
  });
})();
