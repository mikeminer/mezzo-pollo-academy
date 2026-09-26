# Submission: Mezzo Pollo Academy

## Progetto

- **Nome:** Mezzo Pollo Academy
- **Pitch:** Un pollo di peluche dimezzato corre su tre corsie e deve passare sotto la porta con la metà giusta (numeri, parole, figure), senza farsi fregare dal POLLO INTERO.
- **Community:** Mezzo Pollo (meme originale: *"mezzo pollo"* + gesto della mano che taglia il polso)
- **Team:** Pappardelle (pappardelle.eth)
- **Contatto pubblico:** [github.com/mikeminer](https://github.com/mikeminer)

## Loop di gioco

Endless runner 3D a tre corsie. In alto appare una domanda-metà, e sulla pista arrivano tre porte-lavagna con tre risposte. Scegli la corsia giusta, salta balle di fieno e secchi, raccogli piume. Una vita totale ("coscia") per ogni milione intero di MEMEZZO attivo all'inizio della partita, combo e difficoltà adattiva. A fine partita ricevi un grado (Uovo → Pollo leggendario), un record locale e un'immagine condivisibile. Nel gioco principale una nuova partita richiede una verifica valida dell'accesso. La demo gratuita per i revisori parte invece sempre con 2 vite, senza wallet o token.

Modalità: Mezzo Numero (calcolo, frazioni), Mezza Parola (lessico), Mezza Figura (simmetria), POLLO INTERO (controllo inibitorio: non cambiare corsia), Cambio Regola ogni 30 secondi (flessibilità cognitiva).

All’apertura si sceglie una bandiera: Italia per l’italiano, Stati Uniti per l’inglese, Polonia per il polacco. La scelta aggiorna anche le domande, i messaggi del wallet e la pagina demo. Ogni lingua dispone di 40 parole da completare. Il selettore ricompare a ogni caricamento e ricorda l’ultima scelta; il menu permette di cambiarla. La preferenza linguistica non modifica la regola dei timelock.

Colonna sonora originale generata con Google Lyria in Gemini: avvio con Gioca, volume regolabile, musica disattivabile separatamente dagli effetti, pausa sincronizzata e riduzione del volume durante gli avvisi. Il brano completo è nella [pagina demo](https://mezzo-pollo-academy.vercel.app/demo#soundtrack); provenienza e prompt in [SOUNDTRACK.md](SOUNDTRACK.md).

## Token e accesso

- **Regola della build aggiornata:** accesso al gioco principale riservato ai wallet con la soglia MEMEZZO richiesta, tramite connessione Phantom e lettura dei timelock. La demo pubblica separata `/practice` è gratuita, senza wallet o token, con esattamente 2 vite a ogni nuova partita. Pausa e ripresa non ripristinano vite; il record demo è locale e separato. Il gioco non richiede firme o transazioni. Regola verificata con 43 test della logica e 53 controlli nel browser, usando wallet e lock simulati.
- **Rete:** Solana mainnet-beta.
- **Mint MEMEZZO:** `Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump`.
- **Token program / estensioni:** Token-2022, sei decimali, estensioni metadataPointer/tokenMetadata; verifica RPC e limiti in [ACCESS.md](ACCESS.md).
- **Programma riutilizzato:** DevFridge `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`, nessun nuovo contratto.
- **Policy:** somma dei timelock attivi dello stesso wallet e mint, minimo **1.000.000 MEMEZZO** (`1000000000000` unità raw), senza durata minima originale o residua. I lock scaduti smettono immediatamente di contare.
- **Vite iniziali:** `floor(MEMEZZO attivi / 1.000.000)` a ogni nuova partita, calcolate con quantità raw esatte e senza vite di base. 1.000.000 → 1 vita; 1.999.999 → 1; 2.000.000 → 2. Sotto 1.000.000 l'accesso è bloccato.
- **Continuità:** le vite iniziali sono fissate all'inizio della partita. Aggiornamenti o ripresa non ricaricano vite; variazioni del totale ancora sopra soglia si applicano alla partita successiva. Perdita della soglia, disconnessione, dati scaduti o errore bloccano la continuazione finché lo stesso wallet non torna verificato sopra soglia. Un cambio wallet richiede una nuova partita.
- **Disclosure:** nessun ritiro anticipato; fee del 2% al riscatto per comprare e bruciare PASTA, oltre ai costi di rete. MEMEZZO richiede una route Jupiter eseguibile al riscatto. Nessun premio né rendimento promesso. Wallet e lock sono pensati per maggiorenni. I controlli nel browser non autenticano sessioni server e non verificano i punteggi. Record solo locali; sfide stagionali, classifiche e premi non sono implementati.

## Link

- **Play URL:** [mezzopollo.it](https://mezzopollo.it/)
- **Repository:** [mikeminer/mezzo-pollo-academy](https://github.com/mikeminer/mezzo-pollo-academy), commit indicato nel file di registro
- **Demo giocabile gratuita:** [2 vite, senza wallet](https://mezzopollo.it/practice).
- **Video e musica:** [pagina pubblica](https://mezzopollo.it/demo), [copia nel progetto](demo.html). I video silenziosi attuali mostrano l’interfaccia inglese, con wallet e saldo simulati dichiarati in sovrimpressione. Non attestano approvazioni reali di Phantom o transazioni mainnet. I vecchi video restano evidenze storiche nel repository. La canzone italiana dispone di sottotitoli inglesi.

## Setup

Sito statico: `npx serve .`. Nessuna variabile d'ambiente. three.js r128 fissato da cdnjs. Configurazione di hosting Vercel inclusa.

## AI e contributi

Secondo il log fornito dal team, Claude ha realizzato il gioco con la skill DevFridge Game Builder v1.4; il programma DevFridge e la skill erano preesistenti, mentre concept, gioco e asset procedurali sono stati realizzati per il progetto. Codex ha preparato il pacchetto di submission, integrato la colonna sonora generata da Google Lyria e aggiornato la documentazione il **25 settembre 2026**. Provenienza e limiti delle dichiarazioni storiche: [BUILD_LOG.md](BUILD_LOG.md).

## Asset e licenze

Geometrie, texture su canvas ed effetti WebAudio sono generati nel sorgente del gioco. La colonna sonora è un MP3 generato con Google Lyria per questo progetto, incluso sullo stesso host; dettagli in [SOUNDTRACK.md](SOUNDTRACK.md). Libreria three.js r128: MIT; font Caveat Brush e Fredoka: SIL OFL 1.1. Le fonti delle licenze sono nel [README](README.md#dipendenze). Queste licenze riguardano le dipendenze; non viene attribuita una licenza al codice originale o alla musica generata.

## Test e limiti

Vedi [VERIFICATION.md](VERIFICATION.md).
