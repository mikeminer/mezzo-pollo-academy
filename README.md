# Mezzo Pollo Academy 🐔✂️

The game and demo interface are in English, including word challenges, wallet messages and share cards. The Italian soundtrack includes English subtitles. [Play on mezzopollo.it](https://mezzopollo.it/) · [English demo](https://mezzopollo.it/demo).

Un runner 3D per browser in cui un pollo di peluche tagliato a metà corre verso la porta con la metà giusta: numeri, parole e figure da completare.
Il gioco è costruito con la skill **DevFridge Game Builder v1.4** per l'hackathon DevFridge.

> **Accesso:** per giocare servono almeno **1.000.000 MEMEZZO** in timelock DevFridge attivi. Ogni milione intero corrisponde a una vita totale all'inizio di ogni nuova partita, senza vite di base. Phantom collega il wallet; il gioco non richiede firme o transazioni.

[Gioca](https://mezzo-pollo-academy.vercel.app) · [Demo](https://mezzo-pollo-academy.vercel.app/demo) · [Repository pubblico](https://github.com/mikeminer/mezzo-pollo-academy)

## Come si gioca

- **Corsie:** swipe sinistra/destra, oppure ← → o A D
- **Salto:** swipe su, oppure ↑, W o spazio
- **Pausa:** pulsante II, oppure Esc o P
- Passa sotto la porta con la metà giusta. Con il **POLLO INTERO** non cambiare corsia. Quando la regola è **al contrario**, scegli una porta sbagliata. Le vite ("cosce") iniziali sono una per ogni milione intero di MEMEZZO attivo.

## Musica

La canzone **Mezzo Pollo — Mezza piuma, doppio volo**, generata con Google Lyria in Gemini, accompagna le partite. Parte soltanto con **Gioca**, a volume iniziale del 25%. Il pulsante ♫ attiva/disattiva solo la musica; gli effetti restano disponibili. Volume e scelta vengono salvati sul dispositivo. Menu e pausa includono il cursore del volume.

La musica si abbassa durante i segnali importanti e il POLLO INTERO, si ferma in pausa, a fine partita o quando la pagina viene nascosta, e riprende dallo stesso punto alla partita successiva. Un solo player evita sovrapposizioni. Se il caricamento fallisce, il gioco continua e offre un comando per riprovare. [Brano completo](https://mezzo-pollo-academy.vercel.app/demo#soundtrack) · [Provenienza](SOUNDTRACK.md).

I sottotitoli inglesi seguono l'audio nel gioco e nel player completo della demo. Si gestiscono con **CC English**; la scelta resta salvata sul dispositivo. La traduzione deriva dalla trascrizione automatica del brano generato, con tempi approssimati per frase. [File WebVTT](media/mezzo-pollo-en.vtt).

## Accesso MEMEZZO

Mint Solana: `Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump`.

L'accesso al gioco richiede almeno **1.000.000 MEMEZZO** complessivi in timelock DevFridge attivi dello stesso wallet e mint. Nessuna durata minima: anche un lock con meno di un giorno residuo conta, fino alla scadenza. La quantità è verificata in unità esatte, con sei decimali. Non è prevista una modalità gratuita né uno sblocco soltanto cosmetico.

Ogni nuova partita assegna **una vita totale per ogni milione intero attivo**, senza vite di base: 1.000.000 MEMEZZO → 1 vita; 1.999.999 → 1; 2.000.000 → 2. Il numero iniziale viene fissato all'avvio: aggiornare i lock o riprendere la partita non ripristina vite. Una variazione che lascia il totale sopra soglia cambia le vite iniziali soltanto alla partita successiva.

Collega Phantom e ricontrolla dopo la conferma di un nuovo lock. Su telefono, il pannello offre il collegamento al browser Phantom. Sotto soglia, disconnessione, dati scaduti o errori di verifica mettono in pausa e impediscono di continuare finché lo stesso wallet non riceve una verifica fresca sopra soglia; le vite residue restano quelle della partita. Cambiare wallet richiede una nuova partita. Creazione e riscatto avvengono su DevFridge, con no-early-withdrawal e fee del 2% al riscatto. Accesso e punteggi sono gestiti nel browser: i record sono locali e non verificati, senza autenticazione server, classifiche o premi. [Regola, evidenze e limiti](ACCESS.md).

## Avvio locale

È un sito statico e non richiede build.
```sh
npx serve .        # oppure: python3 -m http.server 8080
```
Apri `http://localhost:3000` (o `:8080`).

## Deploy

Deploy pubblico su Vercel: [mezzo-pollo-academy.vercel.app](https://mezzo-pollo-academy.vercel.app). Il pacchetto include `vercel.json` per l'hosting statico, senza build. La [pagina demo](demo.html) accompagna la submission.

## Dipendenze

- three.js **r128**, caricato da cdnjs con versione fissata: [licenza MIT](https://github.com/mrdoob/three.js/blob/r128/LICENSE)
- Google Fonts: [Caveat Brush](https://github.com/google/fonts/blob/main/ofl/caveatbrush/OFL.txt) e [Fredoka](https://github.com/google/fonts/blob/main/ofl/fredoka/OFL.txt), entrambi SIL Open Font License 1.1
- Nessuna variabile d'ambiente, nessun segreto

## Asset e diritti

La documentazione fornita attribuisce il concept Mezzo Pollo al team Pappardelle. Il sorgente `index.html` costruisce pollo, pista, staccionate, alberi, balle di fieno e lavagne con geometrie e texture procedurali su canvas; sintetizza gli effetti sonori con WebAudio. La colonna sonora generata con Google Lyria è inclusa come MP3 sullo stesso host, con la provenienza in [SOUNDTRACK.md](SOUNDTRACK.md). Le dipendenze esterne sono la libreria e i font elencati sopra, con le rispettive licenze. Non viene assegnata qui una licenza al codice originale o alla musica generata.

Pacchetto di submission aggiornato con Codex il **25 settembre 2026**. Il contributo originario di Claude e quello di packaging di Codex sono descritti nel build log.

## Documenti

- [SUBMISSION.md](SUBMISSION.md): scheda di progetto per l'hackathon
- [BUILD_LOG.md](BUILD_LOG.md): log di sviluppo con AI
- [VERIFICATION.md](VERIFICATION.md): test eseguiti e limiti
- [ACCESS.md](ACCESS.md): mint, soglia e verifica dei timelock MEMEZZO
