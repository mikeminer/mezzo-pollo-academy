# Submission: Mezzo Pollo Academy

## Progetto

- **Nome:** Mezzo Pollo Academy
- **Pitch:** Un pollo di peluche dimezzato corre su tre corsie e deve passare sotto la porta con la metà giusta (numeri, parole, figure), senza farsi fregare dal POLLO INTERO.
- **Community:** Mezzo Pollo (meme originale: *"mezzo pollo"* + gesto della mano che taglia il polso)
- **Team:** Pappardelle (pappardelle.eth)
- **Contatto pubblico:** [github.com/mikeminer](https://github.com/mikeminer)

## Loop di gioco

Endless runner 3D a tre corsie. In alto appare una domanda-metà, e sulla pista arrivano tre porte-lavagna con tre risposte. Scegli la corsia giusta, salta balle di fieno e secchi, raccogli piume. Tre vite ("cosce"), combo e difficoltà adattiva. A fine partita ricevi un grado (Uovo → Pollo leggendario), un record locale e un'immagine condivisibile. Il restart è immediato.

Modalità: Mezzo Numero (calcolo, frazioni), Mezza Parola (lessico), Mezza Figura (simmetria), POLLO INTERO (controllo inibitorio: non cambiare corsia), Cambio Regola ogni 30 secondi (flessibilità cognitiva).

## Token e accesso

- **Build presentata:** modalità prova, senza mint, connessione wallet, gate o transazioni. Non verifica lock DevFridge.
- **Rete prevista:** Solana mainnet-beta
- **Mint:** nessuno, il token non è ancora lanciato. **Dichiarazione pre-launch:** questa build è solo practice.
- **Token program / estensioni:** da verificare al lancio. La compatibilità Token-2022 con DevFridge non è confermata.
- **Integrazione prevista, non implementata:** programma DevFridge esistente `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`, nessun nuovo contratto
- **Policy prevista:** qualsiasi lock attivo (non scaduto) del mint futuro, senza durata minima originale o residua. Soglia minima e aggregazione ancora da decidere. I lock scaduti smettono di contare.
- **Cosa sbloccherà:** solo skin cosmetiche e sfide di stagione. Le modalità educative restano sempre gratis.
- **Disclosure del piano futuro:** nessun ritiro anticipato; fee del 2% al riscatto per comprare e bruciare PASTA, oltre ai costi di rete. Per token diversi da PASTA serve una route Jupiter eseguibile. Queste condizioni andranno riconfermate prima dell'integrazione. Nessun premio né rendimento promesso. Wallet e lock sono pensati per maggiorenni. Dati di verifica mancanti, scaduti o in errore non dovranno concedere accesso.

## Link

- **Play URL:** [mezzo-pollo-academy.vercel.app](https://mezzo-pollo-academy.vercel.app)
- **Repository:** [mikeminer/mezzo-pollo-academy](https://github.com/mikeminer/mezzo-pollo-academy), commit indicato nel file di registro
- **Demo:** [pagina pubblica](https://mezzo-pollo-academy.vercel.app/demo), [copia nel progetto](demo.html)

## Setup

File statico: `npx serve .`. Nessuna variabile d'ambiente. three.js r128 fissato da cdnjs. Configurazione di hosting Vercel inclusa.

## AI e contributi

Secondo il log fornito dal team, Claude ha realizzato il gioco con la skill DevFridge Game Builder v1.4; il programma DevFridge e la skill erano preesistenti, mentre concept, gioco e asset procedurali sono stati realizzati per il progetto. Codex ha preparato il pacchetto di submission e aggiornato la documentazione il **25 settembre 2026**. Provenienza e limiti delle dichiarazioni storiche: [BUILD_LOG.md](BUILD_LOG.md).

## Asset e licenze

Geometrie, texture su canvas e suoni WebAudio sono generati nel sorgente del gioco. Non sono inclusi modelli, immagini o registrazioni audio di terzi. Libreria three.js r128: MIT; font Caveat Brush e Fredoka: SIL OFL 1.1. Le fonti delle licenze sono nel [README](README.md#dipendenze). Queste licenze riguardano le dipendenze; non viene attribuita una licenza al codice originale del progetto.

## Test e limiti

Vedi [VERIFICATION.md](VERIFICATION.md).
