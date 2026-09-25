# Submission: Mezzo Pollo Academy

## Progetto
- **Nome:** Mezzo Pollo Academy
- **Pitch:** Un pollo di peluche dimezzato corre su tre corsie e deve passare sotto la porta con la metà giusta (numeri, parole, figure), senza farsi fregare dal POLLO INTERO.
- **Community:** Mezzo Pollo (meme originale: *"mezzo pollo"* + gesto della mano che taglia il polso)
- **Team:** Pappardelle (pappardelle.eth)
- **Contatto pubblico:** github.com/mikeminer

## Loop di gioco
Endless runner 3D a tre corsie. In alto appare una domanda-metà, e sulla pista arrivano tre porte-lavagna con tre risposte. Scegli la corsia giusta, salta balle di fieno e secchi, raccogli piume. Tre vite ("cosce"), combo e difficoltà adattiva. A fine partita ricevi un grado (Uovo → Pollo leggendario), un record locale e un'immagine condivisibile. Il restart è immediato.

Modalità: Mezzo Numero (calcolo, frazioni), Mezza Parola (lessico), Mezza Figura (simmetria), POLLO INTERO (controllo inibitorio: non cambiare corsia), Cambio Regola ogni 30 secondi (flessibilità cognitiva).

## Token e accesso
- **Rete prevista:** Solana mainnet-beta
- **Mint:** nessuno, il token non è ancora lanciato. **Dichiarazione pre-launch:** questa build è solo practice.
- **Token program / estensioni:** da verificare al lancio. La compatibilità Token-2022 con DevFridge non è confermata.
- **Programma:** DevFridge esistente `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`, nessun nuovo contratto
- **Policy prevista:** qualsiasi lock attivo (non scaduto) del mint futuro, senza durata minima originale o residua. Soglia minima e aggregazione ancora da decidere. I lock scaduti smettono di contare.
- **Cosa sbloccherà:** solo skin cosmetiche e sfide di stagione. Le modalità educative restano sempre gratis.
- **Disclosure:** nessun ritiro anticipato; fee del 2% al riscatto, usata per comprare e bruciare PASTA, più i costi di rete; per token diversi da PASTA il riscatto richiede una route Jupiter eseguibile. Nessun premio né rendimento promesso. Wallet e lock sono pensati per maggiorenni.

## Link
- **Play URL:** _da inserire dopo il deploy_
- **Repository:** questo repo, commit indicato nel file di registro
- **Video demo:** _da registrare_

## Setup
File statico: `npx serve .`. Nessuna variabile d'ambiente. three.js r128 fissato da cdnjs.

## AI e contributi
Vedi [BUILD_LOG.md](BUILD_LOG.md). Prima di questo progetto esistevano solo il programma DevFridge e la skill. Gioco, meme e asset procedurali sono nuovi.

## Test e limiti
Vedi [VERIFICATION.md](VERIFICATION.md).
