# Verification: Mezzo Pollo Academy

## Eseguito
| Test | Ambiente | Esito |
|---|---|---|
| Sintassi JS | `node --check` | OK |
| Caricamento, menu, avvio partita | Chromium 1194 headless, SwiftShader (rendering software), viewport 390×844 | OK, nessun errore JS |
| Spawn delle porte con domanda, ostacoli, piume | Stesso ambiente | OK |
| Fix scena nera (env map) | Stesso ambiente, prima/dopo con screenshot | Corretto |

Nota: con il rendering software il test girava a ~2 fps, quindi non misura le prestazioni reali.

## Non ancora eseguito
- Test su **telefono fisico** (touch, orientamento, audio dopo il blocco schermo, fps)
- Test **Phantom** desktop/mobile: nessun wallet è integrato in questa build
- Gate DevFridge: non implementato (non esiste ancora un mint)
- Partita completa fino al game over in modo automatico
- Perdita del contesto WebGL su dispositivo reale

## Autorità del punteggio
Solo record locali nel browser, non verificati. Nessuna classifica, nessun premio, nessuna scrittura on-chain.

## Sicurezza
Nessuna chiave, segreto o dato personale nel repo. Nessuna richiesta di rete oltre a three.js da cdnjs e Google Fonts.
