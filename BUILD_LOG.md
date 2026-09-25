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

La build presentata non collega wallet, non firma transazioni e non compra token. Non contiene un nuovo contratto.

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
