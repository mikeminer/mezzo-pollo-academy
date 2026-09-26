/* Demo copy follows the country selection; the recorded media remain in English. */
(function () {
  'use strict';
  const copy = {
    en: {
      title: 'Mezzo Pollo Academy — gameplay demo',
      description: 'Mezzo Pollo Academy: gameplay, MEMEZZO timelock access, one life per full active million, soundtrack and English subtitles.',
      tag: 'DevFridge Hackathon · MEMEZZO access',
      intro: 'A plush half-chicken runs through three lanes, choosing the missing half of numbers, words and shapes. Dodge obstacles, collect feathers, and stay still when the WHOLE CHICKEN appears.',
      play: 'Connect Phantom to play →',
      source: 'Source & submission evidence',
      songTitle: 'Half a feather, double the flight',
      songIntro: 'The complete Italian brainrot theme with English subtitles, generated with Google Lyria in Gemini. In the game it starts with Play, loops at a lower volume, pauses with the run and softens during gameplay cues. Music controls are available in the menu, pause screen and HUD.',
      audioLabel: 'Mezzo Pollo — complete soundtrack',
      captionNote: 'English subtitles follow the song during playback.',
      downloadCaptions: 'Download English subtitles',
      downloadMp3: 'Download MP3',
      playMusic: 'Play with music →',
      desktopTitle: 'English desktop gameplay',
      desktopNote: 'Browser walkthrough of the English interface, recorded on 25 September 2026. The wallet and qualifying lock evidence are simulated for this demonstration; no real wallet approval or transaction is shown. This silent capture shows actual gameplay inputs. Listen to the soundtrack above.',
      downloadDesktop: 'Download English desktop recording',
      mobileTitle: 'English mobile layout — emulation',
      mobileNote: '390 × 844 browser emulation of the English interface, using simulated wallet and lock evidence. Silent capture; this is not a physical-phone or real-wallet test.',
      downloadMobile: 'Download English mobile recording',
      accessTitle: 'Access and limitations',
      accessIntro: 'The main MEMEZZO game requires at least 1,000,000 MEMEZZO summed across active DevFridge timelocks of the same connected Phantom wallet and mint. No minimum duration applies; expired locks stop counting. Mint:',
      accessOutro: '. A separate free reviewer demo starts every game with exactly 2 lives, without a wallet or tokens. Demo scores are local, separate and unverified.',
      lives: 'Each new run starts with one total life per full active million, with no base lives: 1,000,000 MEMEZZO gives 1 life, 1,999,999 gives 1, and 2,000,000 gives 2. Starting lives are fixed for that run. Refreshing or resuming never refills lives; balance changes above the threshold affect the next run only.',
      verification: 'Losing the threshold, disconnecting, stale data or verification errors pause the run and block continuation until fresh qualifying evidence returns for the same wallet. Switching wallets requires a new run. The game reads locks and never asks for transaction signatures. Access, lives and unverified local scores are browser-side, without server authentication, leaderboards or rewards. The rule passed 43 unit and 53 browser checks with simulated wallets and locks; these are not real-wallet or transaction tests.',
      fees: 'Locks are created and redeemed on DevFridge, with no early withdrawal and a 2% redemption fee for PASTA buy-and-burn, plus network fees. Redemption of MEMEZZO needs an executable Jupiter route. Wallet features are for adults.',
      team: 'Team: Pappardelle · Public contact:',
      submission: '. Gallery submission is subject to review; it does not confirm competition eligibility or a prize.'
    },
    it: {
      title: 'Mezzo Pollo Academy — demo di gioco',
      description: 'Mezzo Pollo Academy: gioco, accesso con timelock MEMEZZO, una vita per ogni milione attivo completo, musica e sottotitoli in inglese.',
      tag: 'Hackathon DevFridge · Accesso con MEMEZZO',
      intro: 'Un mezzo pollo di peluche corre su tre corsie, scegliendo la metà mancante di numeri, parole e forme. Schiva gli ostacoli, raccogli le piume e resta fermo quando appare il POLLO INTERO.',
      play: 'Collega Phantom per giocare →',
      source: 'Codice sorgente e prove della candidatura',
      songTitle: 'Mezza piuma, doppio volo',
      songIntro: 'La sigla brainrot italiana completa, con sottotitoli in inglese, generata con Google Lyria in Gemini. Nel gioco parte quando premi Gioca, si ripete a volume ridotto, si ferma quando metti in pausa e si abbassa durante i segnali di gioco. I comandi della musica sono disponibili nel menu, nella pausa e durante la partita.',
      audioLabel: 'Mezzo Pollo — colonna sonora completa',
      captionNote: 'I sottotitoli in inglese seguono la canzone durante la riproduzione.',
      downloadCaptions: 'Scarica i sottotitoli in inglese',
      downloadMp3: 'Scarica MP3',
      playMusic: 'Gioca con la musica →',
      desktopTitle: 'Gioco in inglese su computer',
      desktopNote: 'Dimostrazione nel browser dell’interfaccia inglese, registrata il 25 settembre 2026. Il wallet e i dati dei timelock validi sono simulati per questa demo; non vengono mostrate autorizzazioni di un wallet reale né transazioni. La registrazione è senza audio e mostra comandi di gioco effettivi. Ascolta la colonna sonora qui sopra.',
      downloadDesktop: 'Scarica il video per computer in inglese',
      mobileTitle: 'Interfaccia mobile in inglese — emulazione',
      mobileNote: 'Emulazione nel browser a 390 × 844 dell’interfaccia inglese, con wallet e dati dei timelock simulati. Registrazione senza audio; non è una prova su telefono fisico o con wallet reale.',
      downloadMobile: 'Scarica il video mobile in inglese',
      accessTitle: 'Accesso e limiti',
      accessIntro: 'Nel gioco principale MEMEZZO servono almeno 1.000.000 MEMEZZO, sommati tra i timelock DevFridge attivi dello stesso wallet Phantom collegato e dello stesso token. Non c’è una durata minima; i timelock scaduti non contano più. Indirizzo del token:',
      accessOutro: '. Una demo gratuita separata per i revisori offre esattamente 2 vite a ogni partita, senza wallet o token. I punteggi della demo sono locali, separati e non verificati.',
      lives: 'Ogni nuova partita parte con una vita totale per ogni milione attivo completo, senza vite di base: 1.000.000 MEMEZZO dà 1 vita, 1.999.999 dà 1 vita e 2.000.000 dà 2 vite. Le vite iniziali restano fisse per quella partita. Aggiornare la verifica o riprendere non ripristina mai le vite; le variazioni del saldo sopra la soglia valgono solo dalla partita successiva.',
      verification: 'Scendere sotto la soglia, scollegare il wallet, avere dati non aggiornati o errori di verifica mette in pausa la partita e impedisce di continuare finché non tornano dati validi e aggiornati per lo stesso wallet. Cambiare wallet richiede una nuova partita. Il gioco legge i timelock e non chiede mai di firmare transazioni. Accesso, vite e punteggi locali non verificati sono gestiti nel browser, senza autenticazione server, classifiche o premi. La regola ha superato 43 test unitari e 53 controlli nel browser con wallet e timelock simulati; non sono prove con wallet reali o transazioni.',
      fees: 'I timelock si creano e si riscattano su DevFridge, senza prelievo anticipato e con una commissione di riscatto del 2% destinata all’acquisto e alla distruzione di PASTA, oltre alle commissioni di rete. Per riscattare MEMEZZO serve una rotta Jupiter eseguibile. Le funzioni del wallet sono riservate agli adulti.',
      team: 'Team: Pappardelle · Contatto pubblico:',
      submission: '. La candidatura alla galleria è soggetta a revisione; non conferma l’ammissibilità al concorso né un premio.'
    },
    pl: {
      title: 'Mezzo Pollo Academy — demonstracja gry',
      description: 'Mezzo Pollo Academy: gra, dostęp przez blokady czasowe MEMEZZO, jedno życie za każdy pełny aktywnie zablokowany milion, muzyka i angielskie napisy.',
      tag: 'Hackathon DevFridge · Dostęp z MEMEZZO',
      intro: 'Pluszowy półkurczak biegnie po trzech torach i wybiera brakującą połowę liczb, słów i kształtów. Omijaj przeszkody, zbieraj pióra i nie zmieniaj toru, gdy pojawi się CAŁY KURCZAK.',
      play: 'Połącz Phantom, aby zagrać →',
      source: 'Kod źródłowy i materiały zgłoszenia',
      songTitle: 'Pół pióra, podwójny lot',
      songIntro: 'Pełna włoska piosenka brainrot z angielskimi napisami, wygenerowana za pomocą Google Lyria w Gemini. W grze uruchamia się po naciśnięciu Graj, powtarza się ciszej, zatrzymuje wraz z pauzą i ścisza podczas sygnałów w grze. Sterowanie muzyką jest dostępne w menu, na ekranie pauzy i podczas rozgrywki.',
      audioLabel: 'Mezzo Pollo — pełna ścieżka dźwiękowa',
      captionNote: 'Angielskie napisy są zsynchronizowane z odtwarzaną piosenką.',
      downloadCaptions: 'Pobierz angielskie napisy',
      downloadMp3: 'Pobierz MP3',
      playMusic: 'Zagraj z muzyką →',
      desktopTitle: 'Rozgrywka na komputerze w języku angielskim',
      desktopNote: 'Prezentacja angielskiego interfejsu w przeglądarce, nagrana 25 września 2026 r. Portfel i dane wymaganych blokad czasowych są symulowane na potrzeby tej demonstracji; nagranie nie pokazuje zatwierdzenia przez prawdziwy portfel ani transakcji. Nagranie bez dźwięku pokazuje rzeczywiste sterowanie grą. Piosenki można posłuchać powyżej.',
      downloadDesktop: 'Pobierz angielskie nagranie z komputera',
      mobileTitle: 'Angielski interfejs mobilny — emulacja',
      mobileNote: 'Emulacja angielskiego interfejsu w przeglądarce w rozdzielczości 390 × 844, z symulowanym portfelem i danymi blokad. Nagranie bez dźwięku; nie jest to test na fizycznym telefonie ani z prawdziwym portfelem.',
      downloadMobile: 'Pobierz angielskie nagranie mobilne',
      accessTitle: 'Dostęp i ograniczenia',
      accessIntro: 'Główna gra MEMEZZO wymaga co najmniej 1 000 000 MEMEZZO łącznie w aktywnych blokadach czasowych DevFridge dla tego samego połączonego portfela Phantom i tokena. Nie ma minimalnego czasu blokady; wygasłe blokady przestają się liczyć. Adres tokena:',
      accessOutro: '. Osobne bezpłatne demo dla recenzentów daje dokładnie 2 życia na każdą grę, bez portfela i tokenów. Wyniki demo są lokalne, osobne i niezweryfikowane.',
      lives: 'Każda nowa rozgrywka zaczyna się z jednym życiem za każdy pełny aktywnie zablokowany milion, bez dodatkowych żyć bazowych: 1 000 000 MEMEZZO daje 1 życie, 1 999 999 daje 1 życie, a 2 000 000 daje 2 życia. Początkowa liczba żyć jest stała dla danej rozgrywki. Odświeżenie weryfikacji lub wznowienie nigdy nie uzupełnia żyć; zmiany salda powyżej progu wpływają tylko na kolejną rozgrywkę.',
      verification: 'Spadek poniżej progu, rozłączenie portfela, nieaktualne dane lub błędy weryfikacji wstrzymują grę. Kontynuacja jest możliwa dopiero po otrzymaniu aktualnych danych potwierdzających spełnienie warunków przez ten sam portfel. Zmiana portfela wymaga nowej rozgrywki. Gra tylko odczytuje blokady i nigdy nie prosi o podpisanie transakcji. Dostęp, życia i niezweryfikowane wyniki lokalne są obsługiwane w przeglądarce, bez uwierzytelniania na serwerze, rankingów ani nagród. Reguła przeszła 43 testy jednostkowe i 53 testy w przeglądarce z symulowanymi portfelami i blokadami; nie są to testy z prawdziwymi portfelami ani transakcjami.',
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
