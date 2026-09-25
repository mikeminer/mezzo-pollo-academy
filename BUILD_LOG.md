# AI build log: Mezzo Pollo Academy

## Log storico fornito dal team

La sezione seguente riporta la documentazione ricevuta con il progetto; non è una trascrizione verificata della conversazione originaria.

**Strumento AI dichiarato:** Claude (Anthropic), in chat su claude.ai, con la skill DevFridge Game Builder v1.4 letta da world.devfridge.cool/skill.
**Revisione umana dichiarata nel log:** decisioni di design e approvazioni attribuite a Pappardelle, come riportato nella tabella.

| # | Prompt / richiesta | Output | Decisione umana |
|---|---|---|---|
| 1 | Discussione su copyright e marchi del meme "6-7" | Il log riferisce una discussione preliminare; nessuna conclusione legale è verificata in questo pacchetto | Creare un meme originale invece di usare 6-7 |
| 2 | "Crea da zero un meme virale e un gioco scemo ma istruttivo" | Concept "Mezzo pollo" con cinque modalità cognitive | Approvato |
| 3 | Documento markdown del concept | `mezzo-pollo.md` | Approvato |
| 4 | Progettazione con la skill DevFridge | Intervista della skill (tre domande) | Runner 3D; token non lanciato → practice; policy "qualsiasi lock attivo" |
| 5 | Build brief secondo la skill | Brief con decisioni confermate, proposte e bloccanti | Approvato ("procedi") |
| 6 | Implementazione | `index.html` single-file, Three.js r128 | In revisione |
| 7 | Test headless | Il log storico riferisce una scena nera, una sostituzione di PMREM con equirect LDR, modifiche al dispose e alla coda. La rimozione di PMREM non corrisponde al sorgente attuale: vedere la nota sotto. | Accettato, secondo il log |
| 8 | Pacchetto di submission | README, SUBMISSION, BUILD_LOG, VERIFICATION, JSON di registro | Da completare con URL e video |

## Cosa ha fatto l'AI

Secondo il log storico: codice di gioco, geometrie e texture procedurali, generatori di domande, testi UI, documentazione.

## Cosa non ha fatto l'AI

La build iniziale documentata nel log storico non collegava wallet, non firmava transazioni e non comprava token. Le revisioni successive collegano Phantom per leggere i lock; il gioco continua a non richiedere firme o transazioni e non contiene un nuovo contratto.

## Packaging con Codex — 25 settembre 2026

Richiesta dell'utente: preparare e inviare la submission a hackathon.devfridge.cool usando il progetto fornito. Codex ha aggiornato i link pubblici, la documentazione e il pacchetto per la submission; è inclusa la configurazione di hosting Vercel. Il codice del gioco non è stato modificato durante questo packaging.

- [Gioco pubblico](https://mezzo-pollo-academy.vercel.app)
- [Repository pubblico](https://github.com/mikeminer/mezzo-pollo-academy)
- [Demo pubblica](https://mezzo-pollo-academy.vercel.app/demo) e [pagina nel progetto](demo.html)

**Rettifica PMREM:** `index.html` usa ancora `THREE.PMREMGenerator`. La verifica desktop corrente ha mostrato la scena renderizzata; non riproduce né conferma la correzione storica descritta al punto 7. Le verifiche correnti e i limiti sono registrati separatamente in [VERIFICATION.md](VERIFICATION.md).

**Provenienza degli asset:** il sorgente genera geometrie, texture canvas e suoni WebAudio; le dipendenze esterne sono three.js e i font Google indicati con le rispettive fonti di licenza nel [README](README.md#dipendenze). Questa preparazione non assegna una licenza al codice originale né attesta una nuova revisione umana.

## Colonna sonora e integrazione — 25 settembre 2026

L'utente ha successivamente richiesto una canzone brainrot completa con Google Lyria, poi di adattarla al gioco. Codex ha preparato testo e direzione musicale; Gemini Create Music ha generato un MP3 di circa 2:10. Prompt e provenienza sono in [SOUNDTRACK.md](SOUNDTRACK.md).

Codex ha aggiunto un controller musicale separato e adattato gli eventi di gioco: avvio dopo gesto dell'utente, volume iniziale 25%, loop, conservazione della posizione tra partite, pausa su fine partita/menu/background, impostazioni persistenti e riduzione del volume durante gli avvisi. Il menu, la pausa e l'HUD permettono di gestire la musica. Il player completo e il download sono nella demo. Questa fase modifica il codice di gioco, a differenza del packaging iniziale; le prove aggiornate sono in [VERIFICATION.md](VERIFICATION.md).

## Prima integrazione MEMEZZO — storico, 25 settembre 2026

L'utente ha fornito il mint `Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump` e richiesto qualsiasi timelock attivo con minimo 1.000.000 MEMEZZO. Codex ha verificato mint, decimali ed estensioni tramite RPC mainnet e adottato la somma dei lock attivi dello stesso wallet e mint. La prima integrazione conservava la modalità educativa gratuita e sbloccava una skin Pollo dorato. Questa scelta è stata superata dalla successiva regola dell'utente descritta sotto.

Il controller legge l'endpoint dietro l'SDK DevFridge e usa il valutatore esatto della skill, perché le subscription dell'SDK arrotondano i giorni residui. Connessione Phantom su gesto, cancellazione delle prove al cambio wallet, controlli di freschezza/scadenza e gestione degli errori sono separati dal rendering e dall'audio. Non sono state firmate transazioni, creati lock reali o introdotti contratti, classifiche o premi. Evidenze e limiti in [ACCESS.md](ACCESS.md).

## Revisione richiesta: accesso obbligatorio e vite — 25 settembre 2026

L'utente ha precisato che per giocare occorrono almeno **1.000.000 MEMEZZO** attivi, sommati tra tutti i lock dello stesso wallet e mint, senza durata minima. Ogni milione intero corrisponde a **una vita totale**, senza vite di base, per ogni nuova partita: 1.000.000 → 1 vita; 1.999.999 → 1; 2.000.000 → 2. La revisione elimina il free play e lo sblocco soltanto cosmetico.

Le vite iniziali vengono fissate all'avvio della partita e non si ricaricano con refresh o ripresa. Finché il totale resta sopra soglia, le variazioni cambiano soltanto le vite della partita successiva. Perdita della soglia, disconnessione, dati scaduti o errore mettono in pausa e bloccano la continuazione fino a una verifica fresca dello stesso wallet sopra soglia. Un cambio wallet richiede una nuova partita.

La documentazione e i metadata di submission sono aggiornati a questa regola, verificata con 43 test della logica e 53 controlli nel browser su wallet e lock simulati. Le prove precedenti del gate cosmetico e i video anteriori a musica e wallet sono evidenze storiche. Punteggi e vite restano lato browser, senza autenticazione server, classifica o premi.

## Sottotitoli inglesi — 25 settembre 2026

Su richiesta dell'utente, Codex ha trascritto localmente il file MP3 generato, tradotto il testo cantato e aggiunto una traccia WebVTT inglese. Il player del gioco e quello della demo leggono gli stessi cue dal tempo effettivo dell'audio; pausa, seek e loop non dipendono da un timer separato. Il controllo CC English salva la preferenza. I passaggi vocali senza parole riconoscibili sono segnalati, senza sostituirli con versi del vecchio draft. Provenienza e limiti in [SOUNDTRACK.md](SOUNDTRACK.md).

## English interface — 25 September 2026

The user requested English for all visible text. Codex translated the game and demo interface, accessible labels, wallet status messages, music/subtitle controls, generated prompts, feedback, ranks and share card. The word-completion bank now contains 40 English targets with short clues, and math prompts use decimal points. The project name and MEMEZZO mint stay the same. The existing rule remains one total life per full active million, with no access below one million.

English desktop and portrait recordings replace the historical recordings embedded on the demo page. Their wallet and lock evidence is explicitly simulated, including an on-screen label; gameplay inputs do not modify internal game state. The original Italian song keeps its English subtitle track. Focused verification passed 43 checks, plus 3 question checks after a clue refinement. Details and limitations are in [VERIFICATION.md](VERIFICATION.md).

## Country and language choice — 25 September 2026

The user requested an opening country choice with the flags of Italy, America and Poland. Codex added an accessible country dialog with bundled SVG flags for Italy, the United States and Poland. It appears on every page load, highlights the last saved choice and selects Italian, English or Polish. The game menu and demo navigation can reopen it. Selecting a language updates static copy, wallet messages, music controls, prompts, ranks and sharing text without reconnecting a wallet or altering its access evidence. Each language has 40 native word-completion targets. Country choice does not change token access or starting lives.

The soundtrack still uses the original Italian audio with English subtitles. Existing demo recordings remain explicitly labelled as English browser captures with simulated wallet evidence. Country preference is stored locally; unavailable storage falls back to an in-memory choice. Keyboard focus stays within the chooser until a country is selected, and game input is disabled during selection.
