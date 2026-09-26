/* Public reviewer practice is separate from MEMEZZO admission, never fake lock proof. */
(() => {
  'use strict';
  const practice = /^\/practice\/?$/.test(location.pathname);
  const copy = {
    en: {
      link: 'Free reviewer demo · 2 lives →', main: 'MEMEZZO game →', play: 'Play free demo · 2 lives',
      badge: 'FREE REVIEWER DEMO · 2 LIVES',
      notice: 'Free practice for reviewers. Every new game starts with exactly 2 lives. No wallet or tokens required; no verified access, rankings or rewards.',
      howLives: 'You start each demo game with 2 lives. Each mistake costs one life; at zero, the game ends.',
      howResume: 'Pause and resume keep your remaining lives. Only a new game resets them to 2. Demo records are stored separately on this device.',
      hud: 'FREE DEMO · 2 starting lives · local score', title: 'Mezzo Pollo Academy — free reviewer demo'
    },
    it: {
      link: 'Demo gratuita per revisori · 2 vite →', main: 'Gioco MEMEZZO →', play: 'Demo gratuita · 2 vite',
      badge: 'DEMO GRATUITA PER REVISORI · 2 VITE',
      notice: 'Prova gratuita per i revisori. Ogni nuova partita parte con esattamente 2 vite. Non servono wallet o token; nessun accesso verificato, classifica o premio.',
      howLives: 'Ogni partita demo parte con 2 vite. Ogni errore costa una vita; a zero la partita termina.',
      howResume: 'Pausa e ripresa conservano le vite rimaste. Solo una nuova partita le riporta a 2. I record della demo sono salvati separatamente sul dispositivo.',
      hud: 'DEMO GRATUITA · 2 vite iniziali · punteggio locale', title: 'Mezzo Pollo Academy — demo gratuita per revisori'
    },
    pl: {
      link: 'Bezpłatne demo dla recenzentów · 2 życia →', main: 'Gra MEMEZZO →', play: 'Bezpłatne demo · 2 życia',
      badge: 'BEZPŁATNE DEMO DLA RECENZENTÓW · 2 ŻYCIA',
      notice: 'Bezpłatna wersja próbna dla recenzentów. Każda nowa gra zaczyna się z dokładnie 2 życiami. Portfel i tokeny nie są wymagane; bez potwierdzonego dostępu, rankingów i nagród.',
      howLives: 'Każda gra demonstracyjna zaczyna się z 2 życiami. Każdy błąd kosztuje jedno życie; przy zerze gra się kończy.',
      howResume: 'Pauza i wznowienie zachowują pozostałe życia. Tylko nowa gra przywraca 2 życia. Rekordy demo są zapisywane osobno na tym urządzeniu.',
      hud: 'BEZPŁATNE DEMO · 2 życia na start · wynik lokalny', title: 'Mezzo Pollo Academy — bezpłatne demo dla recenzentów'
    }
  };
  const text = key => (copy[window.MezzoLocale?.code] || copy.en)[key];
  function render() {
    for (const link of document.querySelectorAll('[data-review-link]')) {
      link.href = practice ? '/' : '/practice';
      link.textContent = text(practice ? 'main' : 'link');
    }
    for (const label of document.querySelectorAll('[data-review-label]')) {
      label.hidden = !practice;
      label.textContent = text('badge');
    }
    if (practice) document.title = text('title');
  }
  window.MezzoMode = Object.freeze({ practice, lives: 2, scoreKey: practice ? 'mp_review_best' : 'mp_best', text });
  document.addEventListener('mezzopollo:language', render);
  render();
})();
