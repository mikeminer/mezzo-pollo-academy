# AI build log: Mezzo Pollo Academy

**Strumento AI:** Claude (Anthropic), in chat su claude.ai, con la skill DevFridge Game Builder v1.4 letta da world.devfridge.cool/skill.
**Revisione umana:** Pappardelle ha preso tutte le decisioni di design e ha approvato ogni passaggio.

| # | Prompt / richiesta | Output | Decisione umana |
|---|---|---|---|
| 1 | Verifica copyright e marchio del meme "6-7" | Analisi: frase non protetta da copyright, esistono marchi registrati | Creare un meme originale invece di usare 6-7 |
| 2 | "Crea da zero un meme virale e un gioco scemo ma istruttivo" | Concept "Mezzo pollo" con cinque modalità cognitive | Approvato |
| 3 | Documento markdown del concept | `mezzo-pollo.md` | Approvato |
| 4 | Progettazione con la skill DevFridge | Intervista della skill (tre domande) | Runner 3D; token non lanciato → practice; policy "qualsiasi lock attivo" |
| 5 | Build brief secondo la skill | Brief con decisioni confermate, proposte e bloccanti | Approvato ("procedi") |
| 6 | Implementazione | `index.html` single-file, Three.js r128 | In revisione |
| 7 | Test headless | Trovato bug: env map PMREM rendeva la scena nera → sostituita con equirect LDR. Corretto il dispose dei materiali condivisi. Ridisegnata la coda. | Accettato |
| 8 | Pacchetto di submission | README, SUBMISSION, BUILD_LOG, VERIFICATION, JSON di registro | Da completare con URL e video |

## Cosa ha fatto l'AI
Codice di gioco, geometrie e texture procedurali, generatori di domande, testi UI, documentazione.

## Cosa non ha fatto l'AI
Non ha collegato wallet, non ha firmato transazioni, non ha comprato token, non ha fatto deploy di contratti.
