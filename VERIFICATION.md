# Verification: Mezzo Pollo Academy

## Revised mandatory access and lives — 25 September 2026

The revised rule requires at least 1,000,000 active MEMEZZO across locks of the same wallet and exact mint, without any minimum duration. Each new run receives one total life per full active million, with no base lives: 1,000,000 → 1; 1,999,999 → 1; 2,000,000 → 2. There is no free-play path or cosmetic-only gate.

The revised rule passed **43 unit checks and 53 browser checks**. Unit coverage includes exact raw thresholds, flooring, aggregation, expiration, stale evidence, provider events and response races. Browser coverage includes 1m → 1 life, 2m → 2, 1,999,999 → 1, blocked play below threshold, keyboard admission, natural loss of a life, no refill on refresh/resume, next-run recalculation, paused audio on lost access, and same-wallet revalidation before resume. Desktop, 390 × 844 portrait and 844 × 390 landscape were tested with Chromium 153.0.8010.12. No uncaught page errors or signature/send requests were observed. The access run preceded the caption file and logged that expected missing asset plus the intentionally injected SDK network failure; caption checks are recorded separately. [Current access results](evidence/timelock-verification.json).

These checks use a mock Phantom provider, synthetic API evidence and an explicit fixture clock. They do not establish real wallet approval or mainnet transaction success. Earlier cosmetic-gate results are superseded. The older evidence below is historical coverage of prior revisions.

A further **7 focused browser checks passed** after cancelling the delayed game-over timer on menu/reset. A natural collision reduced lives to zero, followed by rapid pause/menu/new-run input; the earlier timer did not end the healthy new run. Pausing a dead run until its timer elapsed and then resuming correctly showed game over. No internal game state was altered in these checks.

Required verification includes threshold/aggregation boundaries; per-run life snapshots; no refill after refresh or resume; balance changes above threshold taking effect on the next run only; blocking continuation after lost access, disconnect, stale evidence or errors; recovery only with fresh qualifying evidence for the same wallet; and a new run after switching wallets.

## Historical submission checks — 25 September 2026

Checked by Codex using Playwright with Chromium 153.0.8010.12 (Playwright browser revision 1243) in headless mode. The game source was not modified during testing. Browser interactions used keyboard/pointer input, without changing scores, lives or other game state. These are browser tests and mobile emulation, not physical-device certification or a performance benchmark.

| Check | Environment | Result |
|---|---|---|
| Inline JavaScript syntax | Extracted script, `node --check`, Node 24.18.0 | Pass |
| Menu, visible 3D scene, start and question gates | Desktop, 1280 × 720 | Pass |
| Movement, pause, resume, game over and restart | Desktop, keyboard/pointer input | Pass |
| Menu, game start, question gates, pause and resume | Mobile emulation, 390 × 844 | Pass; no horizontal overflow |
| Touch swipe | Mobile emulation | Input dispatched; before/after screenshots captured |
| Uncaught JavaScript exceptions | Desktop and mobile runs | None observed |
| Public production smoke test | Fresh browser, https://mezzo-pollo-academy.vercel.app/ | HTTP 200; start, questions, pause/resume pass; no JS errors, failed requests or HTTP error responses |

The initial local-server run logged HTTP 404 console messages. They did not recur in the supplementary local check or the production smoke test; their original cause was not established. They are not reported as a confirmed game defect or silently treated as a clean initial console.

## Historical recordings and evidence

- [Public demo page](https://mezzo-pollo-academy.vercel.app/demo)
- [Desktop gameplay recording](media/mezzo-pollo-gameplay-desktop.webm): start, movement, pause/resume, game over and restart; silent browser capture.
- [Mobile emulation recording](media/mezzo-pollo-gameplay-mobile.webm): portrait layout and emulated touch controls; silent browser capture.
- [Desktop question screenshot](media/desktop-question.png)
- [Mobile question screenshot](media/mobile-question.png)
- [Recorded test results](evidence/verification-results.json)
- [Supplementary checks](evidence/supplemental-results.json)
- [Production checks](evidence/production-verification.json)
- [Mobile production recording checks](evidence/mobile-recording-results.json)

These recordings and screenshots predate music and wallet integration. They show the earlier gameplay and layout, not the current access requirement, starting-life calculation or recovery behavior.

The supplied historical verification described a PMREM environment-map fix. The source at these checks still used `PMREMGenerator`; the desktop/mobile screenshots show a rendered scene. The historical fix itself was not reproduced or independently established.

## Historical music integration checks — 25 September 2026

The actual MP3 was decoded and exercised with the browser's default autoplay policy: no bypass flag. Desktop 1280 × 800, phone portrait 390 × 844 and phone landscape 844 × 390 were tested in headless Chromium 153.0.8010.12. All 38 music checks passed. Phone profiles are emulation, not physical Safari/iPhone tests.

- No MP3 download or autoplay before **Gioca**; clicking it loads and plays the 130.612-second stereo recording.
- Pause freezes playback; resume, menu return, game over and a new run keep the intended music state. New runs continue the song rather than repeatedly playing its intro.
- Music mute works with keyboard Space without jumping, while synthesized gameplay effects still work.
- Volume and mute survive reload. Web Audio gain is adjusted separately from sound effects and is reduced during an actual game cue.
- Rapid pause/resume causes no stale playback or unhandled promise rejection.
- An injected MP3 HTTP 404 leaves the game playable; **Riprova musica** recovers after the injected failure is removed.
- Music and pause buttons remain visible in portrait and landscape without horizontal overflow. Screenshots were visually inspected.
- Seeking the actual MP3 near its end demonstrated a real loop boundary: 129.632 seconds to 0.089 seconds, with playback continuing.

Synthetic lifecycle checks explicitly override `document.hidden` and dispatch `visibilitychange`: hiding pauses the game/audio and suspends AudioContext, returning leaves playback paused, and a trusted **Riprendi** click resumes it. This verifies the earlier handler, not physical background-tab behavior: the original headless background/foreground attempt did not produce a true hidden-document transition. Physical screen lock, browser interruptions and iOS audio behavior remain unverified. Detailed historical results: [music-verification.json](evidence/music-verification.json). Music behavior after the mandatory-access revision requires current regression checks.

## Earlier MEMEZZO integration evidence — 25 September 2026

The exact user-supplied mint and its six decimals were checked through finalized Solana mainnet RPC. The live SDK endpoint and published response schema were inspected read-only. See [ACCESS.md](ACCESS.md) for slots, sources, policy and API cache limitations.

The earlier automated tests used synthetic lock evidence and a mock Phantom provider. They do not establish the revised mandatory-access/life policy or that a physical Phantom extension/mobile wallet or a real user's qualifying lock has completed this flow. No token was bought, locked or redeemed, and no signature or transaction was requested during those checks.

## English subtitle checks — 25 September 2026

All **26 browser checks passed** with the actual MP3 and 43 native WebVTT cues. Captions do not trigger MP3 prefetch or autoplay before an authorized Play gesture. Cue text follows playback and seeks, clears on pause, returns on resume, and follows a real loop boundary. The on/off preference survives reload and applies to the demo player. Portrait 390 × 844 and landscape 844 × 390 screenshots were inspected: two-line English captions fit without covering the question or HUD. No console errors, page errors, unhandled promises or wallet signing/sending occurred. Game admission used synthetic qualifying evidence. [Caption results](evidence/caption-verification.json); [transcription and timing limitations](CAPTIONS.md).

## Not tested or not implemented

- Physical phones, real touch hardware and physical landscape orientation, sustained frame rate, audio after screen lock, and WebGL context loss on a real device.
- Physical Phantom extension/mobile integration and a complete user-approved connection against a real qualifying mainnet wallet.
- Creation, redemption and approval of real timelock transactions. The game reads existing locks and links to external DevFridge; it does not submit transactions.
- Server-authenticated access, ranked scores, multiplayer, seasonal challenges or rewards.
- Every randomly generated question or long-session gameplay boundary.
- TypeScript checks and a bundler build are not applicable to this static HTML/JavaScript prototype.

## Score authority, assets and network

Scores and personal records exist only in local browser storage and are unverified. Access checks and the starting-life calculation run client-side; they do not establish a server-authenticated session or authoritative score. There is no leaderboard, prize system, multiplayer or on-chain reward.

Art is generated by geometry and canvas textures; sound effects are synthesized using WebAudio. The soundtrack is a Google Lyria-generated MP3 hosted with the game, documented in [SOUNDTRACK.md](SOUNDTRACK.md). External dependencies are version-pinned Three.js r128 from cdnjs (MIT) and Caveat Brush/Fredoka from Google Fonts (SIL OFL). Internet access is required for these dependencies and fresh lock evidence. The original silent submission videos predate music and wallet integration and record this project's own procedural game.

The source contains no wallet keys, credentials or API secrets found in the submission review. This check is not an independent security audit.
