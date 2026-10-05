# Mezzo Pollo Academy 🐔✂️

Choose among 25 country/region profiles covering 20 languages when opening the site. The game and demo include translated instructions, native word challenges, Shop messages and share cards. The searchable chooser appears on each page load and remembers the last selection; the menu lets you change country. An interactive tutorial starts before your first play in each profile and can be replayed from the menu. Arabic uses a right-to-left interface; lane controls always keep their physical left/right meaning. The Italian soundtrack keeps its English subtitles. Recorded walkthroughs are historical and show the English interface before the Hard/Easy update. [Play on mezzopollo.it](https://mezzopollo.it/) · [Demo](https://mezzopollo.it/demo).

The profiles follow the requested list: International (English), Italy, Poland, Japan, Mexico, United States, India (Hindi), France, Spain, Greece, Turkey, China (Simplified Chinese), South Korea, Thailand, Vietnam, Brazil, Peru, Morocco (Arabic), United Kingdom, Germany, Nigeria (English), Indonesia, Russia, Ukraine and Philippines (Filipino). Regional English and Spanish profiles share translations while retaining their own flags and number formats. See [locale authoring and validation](locales/README.md).

The main menu includes a translated invitation to the user-provided [MezzoPollo Telegram channel](https://t.me/playmezzopollo). Opening the link is optional and does not subscribe or send messages automatically.

Un runner 3D per browser in cui un pollo di peluche tagliato a metà corre verso la porta con la metà giusta: numeri, parole e figure da completare.
Il gioco è costruito con la skill **DevFridge Game Builder v1.4** per l'hackathon DevFridge.

> **Difficile gratis:** [gioca con 2 vite](https://mezzopollo.it/practice), senza wallet, token o verifiche. Ogni nuova partita assegna esattamente 2 vite; pausa e ripresa non le ricaricano. La route `/practice` apre questa modalità.

> **Facile dal Negozio:** velocità ridotta e più tempo per rispondere. Una verifica manuale di almeno **1.000.000 MEMEZZO** in timelock DevFridge attivi sblocca Facile per la sessione della pagina. Ogni milione intero dà **una vita totale**, senza 2 vite di base. Il gioco non richiede firme o transazioni e non ricontrolla i token durante le partite.

[Gioca](https://mezzo-pollo-academy.vercel.app) · [Demo](https://mezzo-pollo-academy.vercel.app/demo) · [Repository pubblico](https://github.com/mikeminer/mezzo-pollo-academy)

## Come si gioca

- **Corsie:** swipe sinistra/destra, oppure ← → o A D
- **Salto:** swipe su, oppure ↑, W o spazio
- **Pausa:** pulsante II, oppure Esc o P
- Passa sotto la porta con la metà giusta. Con il **POLLO INTERO** non cambiare corsia. Quando la regola è **al contrario**, scegli una porta sbagliata.
- **Difficile:** 2 vite a ogni partita, gratis. **Facile:** una vita iniziale totale per ogni milione intero di MEMEZZO verificato nel Negozio; velocità ridotta e più tempo per rispondere.
- Il **tutorial interattivo** parte prima della prima partita in ogni lingua. Si può ripetere dal menu. I record Difficile e Facile sono separati, locali e non verificati.

## Musica

La canzone **Mezzo Pollo — Mezza piuma, doppio volo**, generata con Google Lyria in Gemini, accompagna le partite. Parte soltanto con **Gioca**, a volume iniziale del 25%. Il pulsante ♫ attiva/disattiva solo la musica; gli effetti restano disponibili. Volume e scelta vengono salvati sul dispositivo. Menu e pausa includono il cursore del volume.

La musica si abbassa durante i segnali importanti e il POLLO INTERO, si ferma in pausa, a fine partita o quando la pagina viene nascosta, e riprende dallo stesso punto alla partita successiva. Un solo player evita sovrapposizioni. Se il caricamento fallisce, il gioco continua e offre un comando per riprovare. [Brano completo](https://mezzo-pollo-academy.vercel.app/demo#soundtrack) · [Provenienza](SOUNDTRACK.md).

I sottotitoli inglesi seguono l'audio nel gioco e nel player completo della demo. Si gestiscono con **CC English**; la scelta resta salvata sul dispositivo. La traduzione deriva dalla trascrizione automatica del brano generato, con tempi approssimati per frase. [File WebVTT](media/mezzo-pollo-en.vtt).

## Negozio MEMEZZO e modalità Facile

Mint Solana: `Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump`.

Per Facile, apri il Negozio: il link a DevFridge permette di creare un timelock esternamente. Dopo la conferma, premi **Collega e verifica** per collegare Phantom ed eseguire il primo controllo. I controlli successivi si richiedono con **Verifica vite Facile**. Servono almeno **1.000.000 MEMEZZO** complessivi in timelock DevFridge attivi dello stesso wallet e mint. Nessuna durata minima: anche un lock con meno di un giorno residuo conta al momento della verifica, fino alla scadenza. La quantità è verificata in unità esatte, con sei decimali. Difficile è sempre gratuito, con 2 vite per partita e senza wallet.

Ogni nuova partita **Facile** assegna **una vita totale per ogni milione intero confermato nel Negozio**, senza vite di base: 1.000.000 MEMEZZO → 1 vita; 1.999.999 → 1; 2.000.000 → 2. Il numero iniziale viene fissato all'avvio: aggiornare i lock o riprendere la partita non ripristina vite. L’esito della verifica resta in memoria finché la pagina è aperta, fino a una nuova verifica manuale, un cambio o una disconnessione del wallet oppure un ricaricamento della pagina.

**Nessuna verifica automatica** all’avvio, alla ripresa, durante la partita o al ritorno sulla pagina. Solo i comandi del Negozio **Collega e verifica** e **Verifica vite Facile** controllano i token. Una verifica manuale non valida, un cambio wallet o una disconnessione annullano lo sblocco per le nuove partite Facile, ma non interrompono una partita già avviata e non bloccano Difficile. Su telefono il Negozio offre un link al browser Phantom. Creazione e riscatto dei timelock avvengono su DevFridge, senza ritiro anticipato e con una commissione del 2% al riscatto per acquistare e bruciare PASTA, oltre ai costi di rete; il riscatto di MEMEZZO richiede una rotta Jupiter eseguibile. Accesso e vite sono gestiti nel browser: i record sono locali e non verificati, senza autenticazione server, classifiche o premi. [Regola, evidenze e limiti](ACCESS.md).

## Avvio locale

È un sito statico. Il bundle delle traduzioni è incluso; dopo modifiche ai cataloghi eseguire `node scripts/build-locales.mjs`, poi `node scripts/build-locales.mjs --check`. I controlli si eseguono con `node --test --experimental-test-isolation=none tests/*.test.mjs`.
```sh
npx serve .        # oppure: python3 -m http.server 8080
```
Apri `http://localhost:3000` (o `:8080`). Per provare anche `/practice` usa `npx vercel dev`: la route viene riscritta su `index.html` da `vercel.json`.

## Deploy

Deploy pubblico su Vercel: [mezzo-pollo-academy.vercel.app](https://mezzo-pollo-academy.vercel.app). Il pacchetto include `vercel.json` per l'hosting statico, senza build. La [pagina demo](demo.html) accompagna la submission.

## Dipendenze

- three.js **r128**, caricato da cdnjs con versione fissata: [licenza MIT](https://github.com/mrdoob/three.js/blob/r128/LICENSE)
- Google Fonts: [Caveat Brush](https://github.com/google/fonts/blob/main/ofl/caveatbrush/OFL.txt) e [Fredoka](https://github.com/google/fonts/blob/main/ofl/fredoka/OFL.txt), entrambi SIL Open Font License 1.1
- Bandiere SVG locali: flag-icons 7.3.2, licenza MIT inclusa in `flags/LICENSE`; fonti e hash in `flags/provenance.json`. Le scritture non latine usano anche i font di sistema.
- Nessuna variabile d'ambiente, nessun segreto

## Asset e diritti

La documentazione fornita attribuisce il concept Mezzo Pollo al team Pappardelle. Il sorgente `index.html` costruisce pollo, pista, staccionate, alberi, balle di fieno e lavagne con geometrie e texture procedurali su canvas; sintetizza gli effetti sonori con WebAudio. La colonna sonora generata con Google Lyria è inclusa come MP3 sullo stesso host, con la provenienza in [SOUNDTRACK.md](SOUNDTRACK.md). Le dipendenze esterne sono la libreria e i font elencati sopra, con le rispettive licenze. Non viene assegnata qui una licenza al codice originale o alla musica generata.

Pacchetto di submission preparato con Codex il **25 settembre 2026**; regole web Difficile/Facile, Negozio e tutorial aggiornati il **5 ottobre 2026**. Le registrazioni storiche e i relativi test descrivono la versione dell’epoca. Il contributo originario di Claude e quello di packaging di Codex sono descritti nel build log.

## Documenti

- [SUBMISSION.md](SUBMISSION.md): scheda di progetto per l'hackathon
- [BUILD_LOG.md](BUILD_LOG.md): log di sviluppo con AI
- [VERIFICATION.md](VERIFICATION.md): test eseguiti e limiti
- [ACCESS.md](ACCESS.md): mint, soglia e verifica dei timelock MEMEZZO
