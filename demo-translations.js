/* Demo copy follows the country selection; the recorded media remain in English. */
(function () {
  'use strict';
  const copy = {
    en: {
      title: 'Mezzo Pollo Academy — gameplay demo',
      description: 'MezzoPollo: free Hard mode with 2 lives, slower Easy mode unlocked in the Shop, interactive tutorials in Italian, English and Polish, soundtrack and English subtitles.',
      tag: 'DevFridge Hackathon · Hard & Easy',
      intro: 'A plush half-chicken runs through three lanes, choosing the missing half of numbers, words and shapes. Dodge obstacles, collect feathers, and stay still when the WHOLE CHICKEN appears.',
      play: 'Choose a mode and play →',
      source: 'Source & submission evidence',
      songTitle: 'Half a feather, double the flight',
      songIntro: 'The complete Italian brainrot theme with English subtitles, generated with Google Lyria in Gemini. In the game it starts with Play, loops at a lower volume, pauses with the run and softens during gameplay cues. Music controls are available in the menu, pause screen and HUD.',
      audioLabel: 'Mezzo Pollo — complete soundtrack',
      captionNote: 'English subtitles follow the song during playback.',
      downloadCaptions: 'Download English subtitles',
      downloadMp3: 'Download MP3',
      playMusic: 'Play with music →',
      desktopTitle: 'English desktop gameplay',
      desktopNote: 'Historical browser walkthrough, recorded on 25 September 2026 before Hard/Easy modes and the interactive tutorial. Its access screens show the old rules. The wallet and lock evidence are simulated; no real wallet approval or transaction is shown. The silent capture shows actual gameplay inputs. Listen to the soundtrack above.',
      downloadDesktop: 'Download English desktop recording',
      mobileTitle: 'English mobile layout — emulation',
      mobileNote: 'Historical 390 × 844 browser emulation of the English interface, before the current Hard/Easy rules and tutorial, using simulated wallet and lock evidence. Silent capture; not a physical-phone or real-wallet test.',
      downloadMobile: 'Download English mobile recording',
      accessTitle: 'Access and limitations',
      accessIntro: 'Hard is free and starts every run with 2 lives, without a wallet or token verification. Easy is slower and gives more time: unlock it in the Shop by explicitly verifying at least 1,000,000 MEMEZZO across active DevFridge timelocks of the connected Phantom wallet. No minimum duration applies; expired locks do not count at verification. Mint:',
      accessOutro: '. The /practice route also opens free Hard mode. The interactive tutorial starts before your first play in each language and can be replayed from the menu. Hard and Easy records are local, separate and unverified.',
      lives: 'Easy gives one total starting life per full million confirmed in the Shop, with no base lives: 1,000,000 MEMEZZO gives 1 life, 1,999,999 gives 1, and 2,000,000 gives 2. Hard always starts with 2 lives. Starting lives are fixed for each run; resuming or checking the Shop never refills them.',
      verification: 'There are no automatic token checks at the start of a run, during play, on resume or when returning to the page. Verified Easy lives remain available for new runs while the page stays open, until a manual Shop check, wallet change, disconnection or page reload. An ongoing run is unaffected. The game reads locks and never asks for transaction signatures; timelock creation takes place externally on DevFridge. Access and lives run in the browser, without server authentication, leaderboards or rewards.',
      fees: 'Locks are created and redeemed on DevFridge, with no early withdrawal and a 2% redemption fee for PASTA buy-and-burn, plus network fees. Redemption of MEMEZZO needs an executable Jupiter route. Wallet features are for adults.',
      team: 'Team: Pappardelle · Public contact:',
      submission: '. Gallery submission is subject to review; it does not confirm competition eligibility or a prize.'
    },
    it: {
      title: 'Mezzo Pollo Academy — demo di gioco',
      description: 'MezzoPollo: Difficile gratis con 2 vite, Facile più lento sbloccabile nel Negozio, tutorial interattivi in italiano, inglese e polacco, musica e sottotitoli in inglese.',
      tag: 'Hackathon DevFridge · Difficile e Facile',
      intro: 'Un mezzo pollo di peluche corre su tre corsie, scegliendo la metà mancante di numeri, parole e forme. Schiva gli ostacoli, raccogli le piume e resta fermo quando appare il POLLO INTERO.',
      play: 'Scegli una modalità e gioca →',
      source: 'Codice sorgente e prove della candidatura',
      songTitle: 'Mezza piuma, doppio volo',
      songIntro: 'La sigla brainrot italiana completa, con sottotitoli in inglese, generata con Google Lyria in Gemini. Nel gioco parte quando premi Gioca, si ripete a volume ridotto, si ferma quando metti in pausa e si abbassa durante i segnali di gioco. I comandi della musica sono disponibili nel menu, nella pausa e durante la partita.',
      audioLabel: 'Mezzo Pollo — colonna sonora completa',
      captionNote: 'I sottotitoli in inglese seguono la canzone durante la riproduzione.',
      downloadCaptions: 'Scarica i sottotitoli in inglese',
      downloadMp3: 'Scarica MP3',
      playMusic: 'Gioca con la musica →',
      desktopTitle: 'Gioco in inglese su computer',
      desktopNote: 'Registrazione storica del 25 settembre 2026, precedente alle modalità Difficile/Facile e al tutorial interattivo. Le schermate di accesso mostrano le vecchie regole. Il wallet e i dati dei timelock sono simulati; non sono mostrate autorizzazioni di wallet reali o transazioni. Il video senza audio mostra comandi di gioco effettivi. Ascolta la colonna sonora qui sopra.',
      downloadDesktop: 'Scarica il video per computer in inglese',
      mobileTitle: 'Interfaccia mobile in inglese — emulazione',
      mobileNote: 'Registrazione storica dell’interfaccia inglese, emulata nel browser a 390 × 844 prima delle attuali regole Difficile/Facile e del tutorial, con wallet e timelock simulati. Video senza audio; non è una prova su telefono fisico o con wallet reale.',
      downloadMobile: 'Scarica il video mobile in inglese',
      accessTitle: 'Accesso e limiti',
      accessIntro: 'Difficile è gratis e offre 2 vite a ogni nuova partita, senza wallet o verifiche dei token. Facile è più lento e dà più tempo: si sblocca nel Negozio richiedendo esplicitamente la verifica di almeno 1.000.000 MEMEZZO nei timelock DevFridge attivi del wallet Phantom collegato. Nessuna durata minima; i blocchi scaduti non contano alla verifica. Indirizzo del token:',
      accessOutro: '. Anche /practice apre Difficile gratis. Il tutorial interattivo parte prima della prima partita in ogni lingua e si può ripetere dal menu. I record Difficile e Facile sono locali, separati e non verificati.',
      lives: 'Facile dà una vita iniziale totale per ogni milione intero confermato nel Negozio, senza vite di base: 1.000.000 MEMEZZO dà 1 vita, 1.999.999 dà 1 vita e 2.000.000 dà 2 vite. Difficile parte sempre con 2 vite. Le vite iniziali sono fisse per ogni partita; riprendere o verificare nel Negozio non le ricarica.',
      verification: 'Non ci sono controlli automatici dei token all’avvio, durante la partita, alla ripresa o tornando sulla pagina. Le vite Facile verificate valgono per nuove partite finché la pagina resta aperta, fino a una verifica manuale nel Negozio, un cambio wallet, una disconnessione o un ricaricamento della pagina. La partita in corso non viene interrotta. Il gioco legge i timelock e non chiede firme di transazioni; i blocchi si creano esternamente su DevFridge. Accesso e vite sono gestiti nel browser, senza autenticazione server, classifiche o premi.',
      fees: 'I timelock si creano e si riscattano su DevFridge, senza prelievo anticipato e con una commissione di riscatto del 2% destinata all’acquisto e alla distruzione di PASTA, oltre alle commissioni di rete. Per riscattare MEMEZZO serve una rotta Jupiter eseguibile. Le funzioni del wallet sono riservate agli adulti.',
      team: 'Team: Pappardelle · Contatto pubblico:',
      submission: '. La candidatura alla galleria è soggetta a revisione; non conferma l’ammissibilità al concorso né un premio.'
    },
    pl: {
      title: 'Mezzo Pollo Academy — demonstracja gry',
      description: 'MezzoPollo: bezpłatny tryb trudny z 2 życiami, wolniejszy tryb łatwy odblokowywany w Sklepie, interaktywne samouczki po włosku, angielsku i polsku, muzyka i angielskie napisy.',
      tag: 'Hackathon DevFridge · Tryb trudny i łatwy',
      intro: 'Pluszowy półkurczak biegnie po trzech torach i wybiera brakującą połowę liczb, słów i kształtów. Omijaj przeszkody, zbieraj pióra i nie zmieniaj toru, gdy pojawi się CAŁY KURCZAK.',
      play: 'Wybierz tryb i zagraj →',
      source: 'Kod źródłowy i materiały zgłoszenia',
      songTitle: 'Pół pióra, podwójny lot',
      songIntro: 'Pełna włoska piosenka brainrot z angielskimi napisami, wygenerowana za pomocą Google Lyria w Gemini. W grze uruchamia się po naciśnięciu Graj, powtarza się ciszej, zatrzymuje wraz z pauzą i ścisza podczas sygnałów w grze. Sterowanie muzyką jest dostępne w menu, na ekranie pauzy i podczas rozgrywki.',
      audioLabel: 'Mezzo Pollo — pełna ścieżka dźwiękowa',
      captionNote: 'Angielskie napisy są zsynchronizowane z odtwarzaną piosenką.',
      downloadCaptions: 'Pobierz angielskie napisy',
      downloadMp3: 'Pobierz MP3',
      playMusic: 'Zagraj z muzyką →',
      desktopTitle: 'Rozgrywka na komputerze w języku angielskim',
      desktopNote: 'Archiwalne nagranie z 25 września 2026 r., sprzed wprowadzenia trybów trudnego i łatwego oraz interaktywnego samouczka. Ekrany dostępu pokazują dawne zasady. Portfel i dane blokad są symulowane; nagranie nie pokazuje zgody prawdziwego portfela ani transakcji. Film bez dźwięku pokazuje rzeczywiste sterowanie grą. Piosenki można posłuchać powyżej.',
      downloadDesktop: 'Pobierz angielskie nagranie z komputera',
      mobileTitle: 'Angielski interfejs mobilny — emulacja',
      mobileNote: 'Archiwalna emulacja angielskiego interfejsu w przeglądarce, 390 × 844, sprzed obecnych zasad trybów trudnego i łatwego oraz samouczka, z symulowanym portfelem i blokadami. Film bez dźwięku; nie jest to test na fizycznym telefonie ani z prawdziwym portfelem.',
      downloadMobile: 'Pobierz angielskie nagranie mobilne',
      accessTitle: 'Dostęp i ograniczenia',
      accessIntro: 'Tryb trudny jest bezpłatny: każda rozgrywka zaczyna się z 2 życiami, bez portfela i weryfikacji tokenów. Tryb łatwy jest wolniejszy i daje więcej czasu: odblokuj go w Sklepie, żądając sprawdzenia co najmniej 1 000 000 MEMEZZO w aktywnych blokadach DevFridge połączonego portfela Phantom. Nie ma minimalnego czasu blokady; wygasłe blokady nie liczą się przy weryfikacji. Adres tokena:',
      accessOutro: '. Ścieżka /practice również otwiera bezpłatny tryb trudny. Interaktywny samouczek uruchamia się przed pierwszą grą w każdym języku i można go powtórzyć z menu. Rekordy trybu trudnego i łatwego są lokalne, osobne i niezweryfikowane.',
      lives: 'Tryb łatwy daje jedno życie na start za każdy pełny milion potwierdzony w Sklepie, bez żyć bazowych: 1 000 000 MEMEZZO daje 1 życie, 1 999 999 daje 1 życie, a 2 000 000 daje 2 życia. Tryb trudny zawsze zaczyna się z 2 życiami. Początkowa liczba żyć jest stała dla każdej rozgrywki; wznowienie ani sprawdzanie w Sklepie ich nie uzupełnia.',
      verification: 'Nie ma automatycznego sprawdzania tokenów przy starcie, podczas gry, przy wznowieniu ani po powrocie do strony. Potwierdzone życia w trybie łatwym obowiązują w nowych rozgrywkach, dopóki strona pozostaje otwarta, do ręcznego sprawdzenia w Sklepie, zmiany lub rozłączenia portfela albo odświeżenia strony. Trwająca rozgrywka pozostaje bez zmian. Gra odczytuje blokady i nie prosi o podpisywanie transakcji; blokady tworzy się zewnętrznie na DevFridge. Dostęp i życia są obsługiwane w przeglądarce, bez uwierzytelniania na serwerze, rankingów ani nagród.',
      fees: 'Blokady tworzy się i odbiera na DevFridge. Nie ma wcześniejszej wypłaty, a opłata za odbiór wynosi 2% i służy zakupowi oraz spalaniu PASTA; dodatkowo obowiązują opłaty sieciowe. Odbiór MEMEZZO wymaga dostępnej trasy wymiany w Jupiter. Funkcje portfela są przeznaczone dla osób dorosłych.',
      team: 'Zespół: Pappardelle · Kontakt publiczny:',
      submission: '. Zgłoszenie do galerii podlega weryfikacji; nie potwierdza dopuszczenia do konkursu ani przyznania nagrody.'
    }
  };

  function translateDemo() {
    const text = copy[window.MezzoLocale?.code] || copy.en;
    document.title = text.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', text.description);
    document.querySelectorAll('[data-demo]').forEach(element => {
      const value = text[element.dataset.demo];
      if (typeof value === 'string') element.textContent = value;
    });
    document.querySelectorAll('[data-demo-aria]').forEach(element => {
      const value = text[element.dataset.demoAria];
      if (typeof value === 'string') element.setAttribute('aria-label', value);
    });
  }

  document.addEventListener('mezzopollo:language', translateDemo);
  translateDemo();
}());
