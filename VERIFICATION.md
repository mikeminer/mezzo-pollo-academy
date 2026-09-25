# Verification: Mezzo Pollo Academy

## Submission checks — 25 September 2026

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

## Recorded evidence

- [Public demo page](https://mezzo-pollo-academy.vercel.app/demo)
- [Desktop gameplay recording](media/mezzo-pollo-gameplay-desktop.webm): start, movement, pause/resume, game over and restart; silent browser capture.
- [Mobile emulation recording](media/mezzo-pollo-gameplay-mobile.webm): portrait layout and emulated touch controls; silent browser capture.
- [Desktop question screenshot](media/desktop-question.png)
- [Mobile question screenshot](media/mobile-question.png)
- [Recorded test results](evidence/verification-results.json)
- [Supplementary checks](evidence/supplemental-results.json)
- [Production checks](evidence/production-verification.json)
- [Mobile production recording checks](evidence/mobile-recording-results.json)

The supplied historical verification described a PMREM environment-map fix. The current source still uses `PMREMGenerator`; the present desktop/mobile screenshots show a rendered scene. The historical fix itself was not reproduced or independently established.

## Music integration checks — 25 September 2026

The actual MP3 was decoded and exercised with the browser's default autoplay policy: no bypass flag. Desktop 1280 × 800, phone portrait 390 × 844 and phone landscape 844 × 390 were tested in headless Chromium 153.0.8010.12. All 38 music checks passed. Phone profiles are emulation, not physical Safari/iPhone tests.

- No MP3 download or autoplay before **Gioca**; clicking it loads and plays the 130.612-second stereo recording.
- Pause freezes playback; resume, menu return, game over and a new run keep the intended music state. New runs continue the song rather than repeatedly playing its intro.
- Music mute works with keyboard Space without jumping, while synthesized gameplay effects still work.
- Volume and mute survive reload. Web Audio gain is adjusted separately from sound effects and is reduced during an actual game cue.
- Rapid pause/resume causes no stale playback or unhandled promise rejection.
- An injected MP3 HTTP 404 leaves the game playable; **Riprova musica** recovers after the injected failure is removed.
- Music and pause buttons remain visible in portrait and landscape without horizontal overflow. Screenshots were visually inspected.
- Seeking the actual MP3 near its end demonstrated a real loop boundary: 129.632 seconds to 0.089 seconds, with playback continuing.

Synthetic lifecycle checks explicitly override `document.hidden` and dispatch `visibilitychange`: hiding pauses the game/audio and suspends AudioContext, returning leaves playback paused, and a trusted **Riprendi** click resumes it. This verifies the handler, not physical background-tab behavior: the original headless background/foreground attempt did not produce a true hidden-document transition. Physical screen lock, browser interruptions and iOS audio behavior remain unverified. Detailed current results: [music-verification.json](evidence/music-verification.json).

## Not tested or not implemented

- Physical phones, real touch hardware and physical landscape orientation, sustained frame rate, audio after screen lock, and WebGL context loss on a real device.
- Phantom desktop/mobile: this build has no wallet connection or transaction flow.
- DevFridge gate, qualifying/non-qualifying locks, wallet cancellation and on-chain transactions: not implemented; no mint exists for this project.
- Every randomly generated question or long-session gameplay boundary.
- TypeScript checks and a bundler build are not applicable to this static HTML/JavaScript prototype.

## Score authority, assets and network

Scores and personal records exist only in local browser storage and are unverified. There is no leaderboard, prize system, multiplayer or on-chain reward.

Art is generated by geometry and canvas textures; sound effects are synthesized using WebAudio. The soundtrack is a Google Lyria-generated MP3 hosted with the game, documented in [SOUNDTRACK.md](SOUNDTRACK.md). External dependencies are version-pinned Three.js r128 from cdnjs (MIT) and Caveat Brush/Fredoka from Google Fonts (SIL OFL). Internet access is required for these dependencies. The original silent submission videos predate music integration and record this project's own procedural game.

The source contains no wallet keys, credentials or API secrets found in the submission review. This check is not an independent security audit.
