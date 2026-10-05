/* Mode selection is independent from the optional shop's wallet session. */
(() => {
  'use strict';
  let selected = 'hard';
  const copy = {
    en: {
      hard:'Hard', easy:'Easy', hardDetail:'Free · 2 lives', easyDetail:'Slower pace · shop unlock',
      choose:'Choose your mode', playHard:'Play Hard · 2 lives', playEasy:'Play Easy · {count} {lives}',
      unlock:'Unlock Easy in the shop', shop:'Shop · MEMEZZO lives', tutorial:'Play the tutorial',
      hardHint:'Jump straight in with 2 lives. No wallet or token checks.',
      easyHint:'More time to answer, slower obstacles. Unlock in the shop: 1 total life per full million locked MEMEZZO.',
      unlocked:'Easy unlocked for this session: {count} {lives} each run. No checks while you play.',
      hud:'{mode} · {count} starting {lives} · local score', badge:'{mode} MODE',
      shopNote:'Hard mode is always free. Tokens are timelocked on DevFridge, not spent in the game.',
      link:'Play free · Hard mode →', title:'MezzoPollo — Hard & Easy',
      back:'Back to game', tutorialHud:'TUTORIAL · practice without losing lives',
      tutorialQuestion:'Follow the guide below', shopLoading:'Opening the shop…', shopError:'The shop could not load. You can still play Hard. Try opening the shop again.'
    },
    it: {
      hard:'Difficile', easy:'Facile', hardDetail:'Gratis · 2 vite', easyDetail:'Ritmo lento · sblocca nel negozio',
      choose:'Scegli la modalità', playHard:'Gioca Difficile · 2 vite', playEasy:'Gioca Facile · {count} {lives}',
      unlock:'Sblocca Facile nel negozio', shop:'Negozio · vite MEMEZZO', tutorial:'Prova il tutorial',
      hardHint:'Inizia subito con 2 vite. Nessun wallet o controllo dei token.',
      easyHint:'Più tempo per rispondere, ostacoli più lenti. Sblocca nel negozio: 1 vita totale per milione intero di MEMEZZO bloccato.',
      unlocked:'Facile sbloccata per questa sessione: {count} {lives} a partita. Nessun controllo mentre giochi.',
      hud:'{mode} · {count} {lives} iniziali · punteggio locale', badge:'MODALITÀ {mode}',
      shopNote:'Difficile è sempre gratis. I token vengono bloccati su DevFridge, non spesi nel gioco.',
      link:'Gioca gratis · Difficile →', title:'MezzoPollo — Difficile e Facile',
      back:'Torna al gioco', tutorialHud:'TUTORIAL · prova senza perdere vite',
      tutorialQuestion:'Segui la guida qui sotto', shopLoading:'Apertura del negozio…', shopError:'Il negozio non si è caricato. Puoi comunque giocare a Difficile. Riprova ad aprire il negozio.'
    },
    pl: {
      hard:'Trudny', easy:'Łatwy', hardDetail:'Bezpłatnie · 2 życia', easyDetail:'Wolniej · odblokuj w sklepie',
      choose:'Wybierz tryb', playHard:'Graj: trudny · 2 życia', playEasy:'Graj: łatwy · {count} {lives}',
      unlock:'Odblokuj tryb łatwy w sklepie', shop:'Sklep · życia MEMEZZO', tutorial:'Zagraj w samouczek',
      hardHint:'Zacznij od razu z 2 życiami. Bez portfela i sprawdzania tokenów.',
      easyHint:'Więcej czasu na odpowiedź i wolniejsze przeszkody. Odblokuj w sklepie: 1 życie łącznie za każdy pełny milion zablokowanych MEMEZZO.',
      unlocked:'Tryb łatwy odblokowany na tę sesję: {count} {lives} w każdej grze. Bez sprawdzania podczas gry.',
      hud:'{mode} · na start: {count} {lives} · wynik lokalny', badge:'TRYB {mode}',
      shopNote:'Tryb trudny jest zawsze bezpłatny. Tokeny są blokowane na DevFridge, a nie wydawane w grze.',
      link:'Graj bezpłatnie · tryb trudny →', title:'MezzoPollo — trudny i łatwy',
      back:'Wróć do gry', tutorialHud:'SAMOUCZEK · ćwicz bez utraty żyć',
      tutorialQuestion:'Postępuj zgodnie ze wskazówkami', shopLoading:'Otwieranie sklepu…', shopError:'Nie udało się otworzyć sklepu. Nadal możesz grać w trybie trudnym. Spróbuj otworzyć sklep ponownie.'
    }
  };
  const text = (key, params = {}) => ((copy[window.MezzoLocale?.code] || copy.en)[key] || key)
    .replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
  function config(name = selected, unlockedLives = 0) {
    if (!['hard', 'easy'].includes(name)) throw new TypeError('Unknown game mode');
    if (name === 'easy' && (!Number.isSafeInteger(unlockedLives) || unlockedLives < 1)) return null;
    return Object.freeze(name === 'hard'
      ? {name, lives:2, speed:11, minSpeed:10, maxSpeed:24, acceleration:1.2, maxLevel:3, reaction:5.2, minReaction:3.1, ruleSeconds:30, scoreKey:'mp_hard_best'}
      : {name, lives:unlockedLives, speed:8, minSpeed:7, maxSpeed:14, acceleration:.7, maxLevel:2, reaction:7.8, minReaction:5.2, ruleSeconds:45, scoreKey:'mp_easy_best'});
  }
  function select(name) {
    if (!['hard', 'easy'].includes(name)) return;
    selected = name;
    render();
    document.dispatchEvent(new Event('mezzopollo:mode'));
  }
  function render() {
    for (const link of document.querySelectorAll('[data-review-link]')) { link.href='/practice'; link.textContent=text('link'); }
    for (const label of document.querySelectorAll('[data-review-label]')) label.hidden=true;
    for (const element of document.querySelectorAll('[data-mode-text]')) element.textContent=text(element.dataset.modeText);
    for (const button of document.querySelectorAll('[data-mode-select]')) button.setAttribute('aria-pressed', String(button.dataset.modeSelect === selected));
    document.getElementById('modeChoices')?.setAttribute('aria-label', text('choose'));
  }
  window.MezzoMode=Object.freeze({get selected(){return selected;}, select, config, text, render});
  document.addEventListener('mezzopollo:language', render);
  for (const button of document.querySelectorAll('[data-mode-select]')) button.addEventListener('click', () => select(button.dataset.modeSelect));
  render();
})();
