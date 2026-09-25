# Mezzo Pollo Academy 🐔✂️

Un runner 3D per browser in cui un pollo di peluche tagliato a metà corre verso la porta con la metà giusta: numeri, parole e figure da completare.
Il gioco è costruito con la skill **DevFridge Game Builder v1.4** per l'hackathon DevFridge.

> **Stato:** prototipo in **modalità prova**. Il token non è ancora lanciato, quindi non c'è connessione wallet, non c'è gate e non ci sono transazioni.

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
Qualsiasi hosting statico HTTPS va bene. Per Vercel: importa il repo, framework "Other", nessun build command, output directory `.`.

## Dipendenze
- three.js **r128** (MIT), caricato da cdnjs con versione fissata
- Google Fonts: Caveat Brush, Fredoka (SIL OFL)
- Nessuna variabile d'ambiente, nessun segreto

## Asset e diritti
Tutta la grafica (pollo, pista, staccionate, alberi, balle di fieno, lavagne) è generata a runtime con geometrie e texture procedurali su canvas. Non ci sono immagini, modelli o suoni esterni: gli effetti sonori sono sintetizzati con WebAudio.

## Documenti
- [SUBMISSION.md](SUBMISSION.md): scheda di progetto per l'hackathon
- [BUILD_LOG.md](BUILD_LOG.md): log di sviluppo con AI
- [VERIFICATION.md](VERIFICATION.md): test eseguiti e limiti
