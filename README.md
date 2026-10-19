# Mezzo Pollo Academy 🐔✂️

Choose among 25 country/region profiles covering 20 languages when opening the site. The game and demo include translated instructions, native word challenges, Shop messages and share cards. The searchable chooser appears on each page load and remembers the last selection; the menu lets you change country. An interactive tutorial starts before your first play in each profile and can be replayed from the menu. Arabic uses a right-to-left interface; lane controls always keep their physical left/right meaning. The Italian soundtrack keeps its English subtitles. Recorded walkthroughs are historical and show the English interface before the Hard/Easy update. [Play on mezzopollo.it](https://mezzopollo.it/) · [Demo](https://mezzopollo.it/demo).

The profiles follow the requested list: International (English), Italy, Poland, Japan, Mexico, United States, India (Hindi), France, Spain, Greece, Turkey, China (Simplified Chinese), South Korea, Thailand, Vietnam, Brazil, Peru, Morocco (Arabic), United Kingdom, Germany, Nigeria (English), Indonesia, Russia, Ukraine and Philippines (Filipino). Regional English and Spanish profiles share translations while retaining their own flags and number formats. See [locale authoring and validation](locales/README.md).

The main menu includes a translated invitation to the user-provided [MezzoPollo Telegram channel](https://t.me/playmezzopollo). Opening the link is optional and does not subscribe or send messages automatically.

Un runner 3D per browser in cui un pollo di peluche tagliato a metà corre verso la porta con la metà giusta: numeri, parole e figure da completare.
Il gioco è costruito con la skill **DevFridge Game Builder v1.4** per l'hackathon DevFridge.

> **Arcade:** ogni nuova partita richiede un pagamento SOL. Hard: 1 vita / 0,001 SOL; Medium: 3 vite / 0,002 SOL; Easy: 9 vite / 0,003 SOL; God: 32 vite / 0,01 SOL. Destinatario fisso e recupero delle ricevute descritti in [ARCADE.md](ARCADE.md).

> **Abbonamento:** almeno **10.000.000 MEMEZZO** in timelock attivi, verificati manualmente nel Negozio. Una vita totale per ogni milione intero, quindi almeno 10 vite; ritmo più lento e più tempo per rispondere. Non ci sono controlli automatici durante le partite.

[Gioca](https://mezzo-pollo-academy.vercel.app) · [Demo](https://mezzo-pollo-academy.vercel.app/demo) · [Repository pubblico](https://github.com/mikeminer/mezzo-pollo-academy)

## Come si gioca

- **Corsie:** swipe sinistra/destra, oppure ← → o A D
- **Salto:** swipe su, oppure ↑, W o spazio
- **Pausa:** pulsante II, oppure Esc o P
- Passa sotto la porta con la metà giusta. Con il **POLLO INTERO** non cambiare corsia. Quando la regola è **al contrario**, scegli una porta sbagliata.
- **Arcade** e **Abbonamento** sono le sole modalità. Il tutorial è un allenamento gratuito, senza punteggi né accesso gratuito alle partite.
- Il **tutorial interattivo** parte prima della prima partita in ogni lingua. Si può ripetere dal menu. I record dei quattro livelli Arcade e dell’Abbonamento sono separati, locali e non verificati.

## Musica

La canzone **Mezzo Pollo — Mezza piuma, doppio volo**, generata con Google Lyria in Gemini, accompagna le partite. Parte soltanto con **Gioca**, a volume iniziale del 25%. Il pulsante ♫ attiva/disattiva solo la musica; gli effetti restano disponibili. Volume e scelta vengono salvati sul dispositivo. Menu e pausa includono il cursore del volume.

La musica si abbassa durante i segnali importanti e il POLLO INTERO, si ferma in pausa, a fine partita o quando la pagina viene nascosta, e riprende dallo stesso punto alla partita successiva. Un solo player evita sovrapposizioni. Se il caricamento fallisce, il gioco continua e offre un comando per riprovare. [Brano completo](https://mezzo-pollo-academy.vercel.app/demo#soundtrack) · [Provenienza](SOUNDTRACK.md).

I sottotitoli inglesi seguono l'audio nel gioco e nel player completo della demo. Si gestiscono con **CC English**; la scelta resta salvata sul dispositivo. La traduzione deriva dalla trascrizione automatica del brano generato, con tempi approssimati per frase. [File WebVTT](media/mezzo-pollo-en.vtt).

## Negozio MEMEZZO e Abbonamento

Mint Solana: `Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump`.

Servono almeno **10.000.000 MEMEZZO** complessivi in timelock DevFridge attivi dello stesso wallet e mint. Non c’è una durata minima: contano i lock non scaduti al momento della verifica manuale. Dieci milioni danno 10 vite, 10.999.999 danno 10, undici milioni danno 11. Non vengono aggiunte vite di base.

Solo **Collega e verifica** e la verifica manuale del Negozio controllano i token. L’accesso vale per la sessione della pagina, fino a un nuovo controllo, cambio wallet, disconnessione o ricaricamento. Non ci sono verifiche automatiche all’avvio, alla ripresa o durante la partita. Un controllo non valido revoca le partite future; una partita già avviata conserva le proprie vite rimanenti.

I timelock si creano e riscattano su DevFridge con approvazione del wallet; non prevedono ritiro anticipato. Il riscatto applica una commissione del 2% per acquistare e bruciare PASTA, oltre ai costi di rete, e richiede una rotta Jupiter disponibile. [Regola, evidenze e limiti](ACCESS.md).

## Avvio locale

Il frontend è statico; il checkout Arcade web usa API e un registro Postgres. L’APK include gioco, musica, font e traduzioni, usa un registro locale e Solana RPC senza dipendere da Vercel. Il bundle delle traduzioni è incluso; dopo modifiche ai cataloghi eseguire `node scripts/build-locales.mjs`, poi `node scripts/build-locales.mjs --check`. I controlli si eseguono con `node --test --experimental-test-isolation=none tests/*.test.mjs`.
```sh
node scripts/serve-local.mjs
```
Apri `http://127.0.0.1:8790`. Questo server mostra l’interfaccia e non esegue pagamenti. Per le API usa Vercel con un database di prova isolato. `/practice` è un alias del menu, senza accesso gratuito alle partite.

## Deploy

Deploy pubblico su Vercel: [mezzo-pollo-academy.vercel.app](https://mezzo-pollo-academy.vercel.app). Il build `node scripts/build-public.mjs` pubblica soltanto gli asset approvati; API e database restano separati dai file statici. La [pagina demo](demo.html) accompagna la submission.

## Dipendenze

- three.js **r128**, caricato da cdnjs con versione fissata: [licenza MIT](https://github.com/mrdoob/three.js/blob/r128/LICENSE)
- Google Fonts: [Caveat Brush](https://github.com/google/fonts/blob/main/ofl/caveatbrush/OFL.txt) e [Fredoka](https://github.com/google/fonts/blob/main/ofl/fredoka/OFL.txt), entrambi SIL Open Font License 1.1
- Bandiere SVG locali: flag-icons 7.3.2, licenza MIT inclusa in `flags/LICENSE`; fonti e hash in `flags/provenance.json`. Le scritture non latine usano anche i font di sistema.
- Configurazione del backend Arcade tramite variabili server: vedere [ARCADE.md](ARCADE.md). Nessun segreto nel client o nell’APK.

## Asset e diritti

La documentazione fornita attribuisce il concept Mezzo Pollo al team Pappardelle. Il sorgente `index.html` costruisce pollo, pista, staccionate, alberi, balle di fieno e lavagne con geometrie e texture procedurali su canvas; sintetizza gli effetti sonori con WebAudio. La colonna sonora generata con Google Lyria è inclusa come MP3 sullo stesso host, con la provenienza in [SOUNDTRACK.md](SOUNDTRACK.md). Le dipendenze esterne sono la libreria e i font elencati sopra, con le rispettive licenze. Non viene assegnata qui una licenza al codice originale o alla musica generata.

Pacchetto di submission preparato con Codex il **25 settembre 2026**; regole web Difficile/Facile, Negozio e tutorial aggiornati il **5 ottobre 2026**. Le registrazioni storiche e i relativi test descrivono la versione dell’epoca. Il contributo originario di Claude e quello di packaging di Codex sono descritti nel build log.

## Documenti

- [SUBMISSION.md](SUBMISSION.md): scheda di progetto per l'hackathon
- [BUILD_LOG.md](BUILD_LOG.md): log di sviluppo con AI
- [VERIFICATION.md](VERIFICATION.md): test eseguiti e limiti
- [ACCESS.md](ACCESS.md): mint, soglia e verifica dei timelock MEMEZZO
