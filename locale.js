/* Country choice is a language preference, never wallet or access evidence. */
(() => {
  'use strict';
  const countries = {
    it: { locale: 'it-IT', country: 'Italia', language: 'Italiano' },
    en: { locale: 'en-US', country: 'United States', language: 'English' },
    pl: { locale: 'pl-PL', country: 'Polska', language: 'Polski' }
  };
  const messages = {
    en: {
      chooseCountry: 'Choose your country', chooseNote: 'Pick a flag to choose your game language.', changeCountry: 'Change country',
      play: 'Play · {count} {lives}', checkPlay: 'Check access & play', confirmed: 'Timelock confirmed: {count} {lives} for every new game.',
      minimum: 'Playing requires at least 1,000,000 MEMEZZO in active timelocks. Each full million gives you 1 life per game.',
      resume: 'Resume', checkResume: 'Check access to resume', walletChanged: 'The wallet changed. Reconnect the wallet used for this game to resume, or check the new wallet and start a new game.',
      accessPaused: 'Access paused: at least 1,000,000 MEMEZZO in confirmed active timelocks is required. Check your locks again to resume with the same wallet.',
      retryMusic: 'Retry music', musicOff: 'Turn music off', musicOn: 'Turn music on', musicEnabled: 'Music: on', musicDisabled: 'Music: off',
      musicFailed: 'Music could not load. You can retry or keep playing.', musicBlocked: 'Tap Retry music to turn it back on.', noWebgl: 'This device does not support WebGL.',
      double: 'Double {n}?', half: 'Half of {n}?', quarter: 'Half of half of {n}?', ready: 'Ready…', livesRemaining: 'Lives remaining: {remaining} of {total}',
      runLives: 'MEMEZZO · {count} {lives} at start · local best', whole: 'WHOLE CHICKEN!', wholeRule: 'Stay in your lane until the statue passes', reverse: 'Reverse mode: choose a WRONG answer', shape: 'Find the other half',
      halfChicken: 'Half chicken! ✂️', heldStill: 'You held still!', right1: 'Correct!', right2: 'Well done!', right3: 'Cluck cluck!', right4: 'Exactly!', reversed: 'It was reversed!', wrongHalf: 'Wrong half!', stayStill: 'Stay still!',
      personalBest: 'Personal best on this device: {score}', legendary: '👑 Legendary chicken', wholeRank: '🐔 Whole chicken', halfRank: '🍗 Half chicken', chick: '🐣 Chick', egg: '🥚 Egg',
      shareStats: '{score} points, {right} correct answers', shareQuestion: 'What is your chicken rank?', shareHint: 'Press and hold the image (or right-click) to save and share it.',
      rulesReversed: 'Rules reversed!', rulesNormal: 'Normal rules', bonk: 'Bonk!'
    },
    it: {
      chooseCountry: 'Scegli il paese', chooseNote: 'Scegli una bandiera per impostare la lingua del gioco.', changeCountry: 'Cambia paese',
      play: 'Gioca · {count} {lives}', checkPlay: 'Verifica e gioca', confirmed: 'Timelock confermato: {count} {lives} per ogni nuova partita.',
      minimum: 'Per giocare servono almeno 1.000.000 MEMEZZO in timelock attivi. Ogni milione intero dà 1 vita a partita.',
      resume: 'Riprendi', checkResume: 'Verifica l’accesso per riprendere', walletChanged: 'Il wallet è cambiato. Ricollega quello usato per questa partita per riprendere, oppure verifica il nuovo wallet e inizia una nuova partita.',
      accessPaused: 'Accesso sospeso: servono almeno 1.000.000 MEMEZZO in timelock attivi confermati. Ricontrolla i lock per riprendere con lo stesso wallet.',
      retryMusic: 'Riprova musica', musicOff: 'Disattiva la musica', musicOn: 'Attiva la musica', musicEnabled: 'Musica: sì', musicDisabled: 'Musica: no',
      musicFailed: 'La musica non si è caricata. Puoi riprovare o continuare a giocare.', musicBlocked: 'Tocca Riprova musica per riattivarla.', noWebgl: 'Questo dispositivo non supporta WebGL.',
      double: 'Il doppio di {n}?', half: 'La metà di {n}?', quarter: 'La metà della metà di {n}?', ready: 'Pronti…', livesRemaining: 'Vite rimaste: {remaining} su {total}',
      runLives: 'MEMEZZO · {count} {lives} alla partenza · record locale', whole: 'POLLO INTERO!', wholeRule: 'Non cambiare corsia finché la statua non passa', reverse: 'Al contrario: scegli una risposta SBAGLIATA', shape: 'Trova l’altra metà',
      halfChicken: 'Mezzo pollo! ✂️', heldStill: 'Hai resistito!', right1: 'Giusto!', right2: 'Bravo!', right3: 'Coccodè!', right4: 'Esatto!', reversed: 'Era al contrario!', wrongHalf: 'Metà sbagliata!', stayStill: 'Stai fermo!',
      personalBest: 'Record personale su questo dispositivo: {score}', legendary: '👑 Pollo leggendario', wholeRank: '🐔 Pollo intero', halfRank: '🍗 Mezzo pollo', chick: '🐣 Pulcino', egg: '🥚 Uovo',
      shareStats: '{score} punti, {right} risposte giuste', shareQuestion: 'E tu quanto sei pollo?', shareHint: 'Tieni premuto sull’immagine (o fai clic destro) per salvarla e condividerla.',
      rulesReversed: 'Regola capovolta!', rulesNormal: 'Regola normale', bonk: 'Bum!'
    },
    pl: {
      chooseCountry: 'Wybierz kraj', chooseNote: 'Wybierz flagę, aby ustawić język gry.', changeCountry: 'Zmień kraj',
      play: 'Graj · {count} {lives}', checkPlay: 'Sprawdź dostęp i graj', confirmed: 'Blokada potwierdzona: {count} {lives} na każdą nową grę.',
      minimum: 'Gra wymaga co najmniej 1 000 000 MEMEZZO w aktywnych blokadach czasowych. Każdy pełny milion daje 1 życie na grę.',
      resume: 'Wznów', checkResume: 'Sprawdź dostęp, aby wznowić', walletChanged: 'Portfel się zmienił. Połącz ponownie portfel użyty w tej grze, aby ją wznowić, albo sprawdź nowy portfel i rozpocznij nową grę.',
      accessPaused: 'Dostęp wstrzymany: wymagane jest co najmniej 1 000 000 MEMEZZO w potwierdzonych aktywnych blokadach. Sprawdź blokady, aby wznowić grę z tym samym portfelem.',
      retryMusic: 'Ponów muzykę', musicOff: 'Wyłącz muzykę', musicOn: 'Włącz muzykę', musicEnabled: 'Muzyka: wł.', musicDisabled: 'Muzyka: wył.',
      musicFailed: 'Nie udało się wczytać muzyki. Spróbuj ponownie lub graj dalej.', musicBlocked: 'Naciśnij Ponów muzykę, aby ją włączyć.', noWebgl: 'To urządzenie nie obsługuje WebGL.',
      double: 'Dwa razy {n}?', half: 'Połowa {n}?', quarter: 'Połowa połowy {n}?', ready: 'Gotowi…', livesRemaining: 'Pozostałe życia: {remaining} z {total}',
      runLives: 'MEMEZZO · {count} {lives} na start · rekord lokalny', whole: 'CAŁY KURCZAK!', wholeRule: 'Nie zmieniaj pasa, aż posąg cię minie', reverse: 'Na odwrót: wybierz BŁĘDNĄ odpowiedź', shape: 'Znajdź drugą połowę',
      halfChicken: 'Pół kurczaka! ✂️', heldStill: 'Bez ruchu!', right1: 'Dobrze!', right2: 'Brawo!', right3: 'Ko, ko!', right4: 'Dokładnie!', reversed: 'Było na odwrót!', wrongHalf: 'Zła połowa!', stayStill: 'Stój!',
      personalBest: 'Rekord na tym urządzeniu: {score}', legendary: '👑 Legendarny kurczak', wholeRank: '🐔 Cały kurczak', halfRank: '🍗 Pół kurczaka', chick: '🐣 Pisklę', egg: '🥚 Jajko',
      shareStats: '{score} pkt, poprawne odpowiedzi: {right}', shareQuestion: 'Jaką masz kurzą rangę?', shareHint: 'Przytrzymaj obraz (lub kliknij prawym przyciskiem), aby go zapisać i udostępnić.',
      rulesReversed: 'Zasady na odwrót!', rulesNormal: 'Zwykłe zasady', bonk: 'Bęc!'
    }
  };
  let code = 'en';
  try { const saved = localStorage.getItem('mp_country'); if (Object.hasOwn(countries, saved)) code = saved; } catch {}
  let ready = false;
  let returnFocus = null;
  const t = (key, params = {}) => (messages[code][key] ?? messages.en[key] ?? key).replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
  const number = (value, options) => new Intl.NumberFormat(countries[code].locale, options).format(value);
  const lifeWord = count => {
    if (code === 'it') return count === 1 ? 'vita' : 'vite';
    if (code === 'en') return count === 1 ? 'life' : 'lives';
    return ({one:'życie', few:'życia', many:'żyć', other:'życia'})[new Intl.PluralRules('pl').select(count)];
  };
  function flag(country) {
    const svg = content => `<svg viewBox="0 0 190 120" aria-hidden="true" focusable="false">${content}</svg>`;
    if (country === 'it') return svg('<path fill="#009246" d="M5 0h60v120H5z"/><path fill="#fff" d="M65 0h60v120H65z"/><path fill="#ce2b37" d="M125 0h60v120h-60z"/>');
    if (country === 'pl') return svg('<path fill="#fff" d="M0 0h190v60H0z"/><path fill="#dc143c" d="M0 60h190v60H0z"/>');
    let stars = '';
    for (let row = 0; row < 9; row++) for (let col = 0; col < (row % 2 ? 5 : 6); col++) {
      const x = 6.33 + col * 12.67 + (row % 2 ? 6.33 : 0), y = 12.99 + row * 5.98;
      stars += `<path fill="#fff" transform="translate(${x} ${y}) scale(2.5)" d="M0-1 .224-.309 .951-.309 .363.118 .588.809 0 .382-.588.809-.363.118-.951-.309-.224-.309Z"/>`;
    }
    return svg('<path fill="#fff" d="M0 10h190v100H0z"/>' + Array.from({length:7}, (_, i) => `<path fill="#b22234" d="M0 ${10+i*200/13}h190v${100/13}H0z"/>`).join('') + '<path fill="#3c3b6e" d="M0 10h76v53.846H0z"/>' + stars);
  }
  const gate = document.createElement('div');
  gate.id = 'countryGate'; gate.className = 'country-gate';
  gate.setAttribute('role', 'dialog'); gate.setAttribute('aria-modal', 'true'); gate.setAttribute('aria-labelledby', 'countryHeading'); gate.setAttribute('aria-describedby', 'countryNote');
  gate.innerHTML = `<section class="country-panel"><div class="country-brand">Mezzo Pollo <span>Academy</span></div><h1 id="countryHeading"></h1><p id="countryNote"></p><div class="country-options">${Object.entries(countries).map(([key, country]) => `<button type="button" class="country-option" data-country="${key}" lang="${key}" aria-label="${country.country} — ${country.language}"><span class="country-flag">${flag(key)}</span><span class="country-name">${country.country}</span><span class="country-language">${country.language}</span></button>`).join('')}</div></section>`;
  document.body.prepend(gate);
  const roots = [...document.querySelectorAll('[data-country-root]')];
  function apply() {
    document.documentElement.lang = code;
    document.getElementById('countryHeading').textContent = t('chooseCountry');
    document.getElementById('countryNote').textContent = t('chooseNote');
    for (const button of gate.querySelectorAll('[data-country]')) button.setAttribute('aria-pressed', String(button.dataset.country === code));
    for (const entry of window.MezzoContent?.[code]?.static || []) for (const element of document.querySelectorAll(entry.selector)) {
      if (entry.attr) element.setAttribute(entry.attr, entry.text);
      else if (entry.html !== undefined) element.innerHTML = entry.html;
      else element.textContent = entry.text;
    }
    for (const button of document.querySelectorAll('[data-country-open]')) {
      button.textContent = `${countries[code].country} · ${t('changeCountry')}`;
      button.setAttribute('aria-label', t('changeCountry'));
    }
  }
  function open() {
    returnFocus = document.activeElement;
    ready = false;
    for (const root of roots) root.inert = true;
    for (const media of document.querySelectorAll('audio,video')) media.pause();
    gate.hidden = false;
    document.dispatchEvent(new Event('mezzopollo:countryopen'));
    requestAnimationFrame(() => gate.querySelector(`[data-country="${code}"]`).focus());
  }
  function choose(next) {
    if (!Object.hasOwn(countries, next)) return;
    code = next;
    try { localStorage.setItem('mp_country', code); } catch {}
    apply();
    ready = true;
    document.dispatchEvent(new CustomEvent('mezzopollo:language', {detail:{code, locale:countries[code].locale}}));
    gate.hidden = true;
    for (const root of roots) root.inert = false;
    const focus = returnFocus?.matches('[data-country-open]') ? returnFocus : document.getElementById('btnPlay') || document.querySelector('[data-country-open]');
    focus?.focus({preventScroll:true});
  }
  gate.addEventListener('click', event => { const button = event.target.closest('[data-country]'); if (button) choose(button.dataset.country); });
  gate.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...gate.querySelectorAll('[data-country]')];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
  });
  for (const button of document.querySelectorAll('[data-country-open]')) button.addEventListener('click', open);
  window.MezzoLocale = Object.freeze({get code(){return code;}, get locale(){return countries[code].locale;}, get ready(){return ready;}, t, number, lifeWord, words:() => window.MezzoContent[code].words, open});
  apply();
  open();
})();
