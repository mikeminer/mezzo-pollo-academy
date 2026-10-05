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
  const copy = {
    en: {
      label: 'Learn by playing', practice: 'Guided practice', progress: 'Step {n} of {total}',
      safe: 'No lives lost. No score saved.', skip: 'Skip tutorial', next: 'Next challenge', finish: 'Start playing', retry: 'Try again',
      good: 'Got it! Ready for the next challenge.', done: 'Ready! Hard mode starts with 2 lives. Visit the optional shop for extra lives and Easy mode.',
      again: 'No problem! Try the same challenge again.', leftControl: 'Move left', rightControl: 'Move right', jumpControl: 'Jump',
      half: 'Half of 8?', normalRule: 'Choose the matching half', reverseRule: 'Reverse: choose a WRONG answer', wholeQuestion: 'WHOLE CHICKEN!', wholeRule: 'Keep your lane until the statue passes',
      left: ['Move left', 'Try it now: swipe left on the track, press ← or A, or tap the left arrow below.'],
      right: ['Now move right', 'Swipe right on the track, press → or D, or tap the right arrow below.'],
      jump: ['Give that chicken a jump', 'Swipe up on the track, press ↑, W or Space, or tap Jump. Jump over hay bales during a run.'],
      gate: ['Find the missing half', 'Read the board: half of 8 is 4. Move into the middle lane and pass through the gate marked 4.'],
      reverse: ['Watch out: REVERSE!', 'The rule has flipped! Half of 8 is 4, so choose a WRONG answer: move left to 2 or right to 8.'],
      whole: ['WHOLE CHICKEN: hold your lane', 'Stop changing lanes until the statue passes. Stay in the lane you started in. Try it now!']
    },
    it: {
      label: 'Impara giocando', practice: 'Allenamento guidato', progress: 'Passo {n} di {total}',
      safe: 'Non perdi vite. Il punteggio non viene salvato.', skip: 'Salta tutorial', next: 'Prossima sfida', finish: 'Inizia a giocare', retry: 'Riprova',
      good: 'Perfetto! Puoi passare alla prossima sfida.', done: 'Pronto! La modalità difficile parte con 2 vite. Visita il negozio facoltativo per vite extra e modalità facile.',
      again: 'Nessun problema! Riprova questa sfida.', leftControl: 'Vai a sinistra', rightControl: 'Vai a destra', jumpControl: 'Salta',
      half: 'La metà di 8?', normalRule: 'Scegli la metà corretta', reverseRule: 'Al contrario: scegli una risposta SBAGLIATA', wholeQuestion: 'POLLO INTERO!', wholeRule: 'Resta nella tua corsia finché passa la statua',
      left: ['Vai a sinistra', 'Prova subito: scorri a sinistra sulla pista, premi ← o A, oppure tocca la freccia qui sotto.'],
      right: ['Ora vai a destra', 'Scorri a destra sulla pista, premi → o D, oppure tocca la freccia qui sotto.'],
      jump: ['Fai saltare il pollo', 'Scorri verso l’alto sulla pista, premi ↑, W o Spazio, oppure tocca Salta. Durante la corsa salta le balle di fieno.'],
      gate: ['Trova la metà mancante', 'Leggi la lavagna: la metà di 8 è 4. Mettiti nella corsia centrale e attraversa il portale con il 4.'],
      reverse: ['Attento: AL CONTRARIO!', 'La regola si è capovolta! La metà di 8 è 4, quindi scegli una risposta SBAGLIATA: vai a sinistra sul 2 o a destra sull’8.'],
      whole: ['POLLO INTERO: resta in corsia', 'Non cambiare corsia finché la statua non passa. Resta nella corsia di partenza. Prova ora!']
    },
    pl: {
      label: 'Ucz się, grając', practice: 'Trening z przewodnikiem', progress: 'Krok {n} z {total}',
      safe: 'Nie tracisz żyć. Wynik nie jest zapisywany.', skip: 'Pomiń samouczek', next: 'Następne wyzwanie', finish: 'Zacznij grę', retry: 'Spróbuj ponownie',
      good: 'Świetnie! Możesz przejść do następnego wyzwania.', done: 'Gotowe! Tryb trudny zaczyna się z 2 życiami. W opcjonalnym sklepie uzyskasz dodatkowe życia i tryb łatwy.',
      again: 'Nic się nie stało! Spróbuj tego wyzwania ponownie.', leftControl: 'Przesuń w lewo', rightControl: 'Przesuń w prawo', jumpControl: 'Skocz',
      half: 'Połowa z 8?', normalRule: 'Wybierz pasującą połowę', reverseRule: 'Na odwrót: wybierz BŁĘDNĄ odpowiedź', wholeQuestion: 'CAŁY KURCZAK!', wholeRule: 'Zostań na swoim pasie, aż minie posąg',
      left: ['Przesuń się w lewo', 'Spróbuj teraz: przesuń palcem w lewo po torze, naciśnij ← lub A albo dotknij strzałki poniżej.'],
      right: ['Teraz w prawo', 'Przesuń palcem w prawo po torze, naciśnij → lub D albo dotknij strzałki poniżej.'],
      jump: ['Czas na kurzy skok', 'Przesuń palcem w górę po torze, naciśnij ↑, W lub Spację albo dotknij Skocz. Podczas biegu przeskakuj bele siana.'],
      gate: ['Znajdź brakującą połowę', 'Spójrz na tablicę: połowa z 8 to 4. Przejdź na środkowy pas i przebiegnij przez bramkę z cyfrą 4.'],
      reverse: ['Uwaga: NA ODWRÓT!', 'Zasada się odwróciła! Połowa z 8 to 4, więc wybierz BŁĘDNĄ odpowiedź: przejdź w lewo do 2 lub w prawo do 8.'],
      whole: ['CAŁY KURCZAK: zostań na pasie', 'Nie zmieniaj pasa, dopóki posąg nie minie. Zostań na pasie, na którym zaczynasz. Spróbuj teraz!']
    }
  };
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
    ui.root.lang = language();
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
