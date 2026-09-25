# Mezzo Pollo Academy 🐔✂️

Un runner 3D per browser in cui un pollo di peluche tagliato a metà corre verso la porta con la metà giusta: numeri, parole e figure da completare.
Il gioco è costruito con la skill **DevFridge Game Builder v1.4** per l'hackathon DevFridge.

> **Stato:** prototipo in **modalità prova**. Il token non è ancora lanciato, quindi non c'è connessione wallet, non c'è gate e non ci sono transazioni.

[Gioca](https://mezzo-pollo-academy.vercel.app) · [Demo](https://mezzo-pollo-academy.vercel.app/demo) · [Repository pubblico](https://github.com/mikeminer/mezzo-pollo-academy)

## Come si gioca

- **Corsie:** swipe sinistra/destra, oppure ← → o A D
- **Salto:** swipe su, oppure ↑, W o spazio
- **Pausa:** pulsante II, oppure Esc o P
- Passa sotto la porta con la metà giusta. Con il **POLLO INTERO** non cambiare corsia. Quando la regola è **al contrario**, scegli una porta sbagliata. Hai tre cosce.

## Avvio locale

È un file statico e non richiede build.
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

La documentazione fornita attribuisce il concept Mezzo Pollo al team Pappardelle. Il sorgente `index.html` costruisce pollo, pista, staccionate, alberi, balle di fieno e lavagne con geometrie e texture procedurali su canvas; sintetizza gli effetti sonori con WebAudio. Non carica immagini, modelli o registrazioni audio esterni. Le risorse esterne sono la libreria e i font elencati sopra, con le rispettive licenze. Non viene assegnata qui una licenza al codice originale del progetto.

Pacchetto di submission aggiornato con Codex il **25 settembre 2026**. Il contributo originario di Claude e quello di packaging di Codex sono descritti nel build log.

## Documenti

- [SUBMISSION.md](SUBMISSION.md): scheda di progetto per l'hackathon
- [BUILD_LOG.md](BUILD_LOG.md): log di sviluppo con AI
- [VERIFICATION.md](VERIFICATION.md): test eseguiti e limiti
