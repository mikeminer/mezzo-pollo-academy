# Mezzo Pollo — Mezza piuma, doppio volo

The user requested an original Italian brainrot theme for Mezzo Pollo, generated with Google Lyria. The track was created using Gemini's Create Music interface on 25 September 2026 and downloaded through its MP3 export. The app reported 2:10; the downloaded file decodes to 130.612 seconds of stereo audio at 44.1 kHz.

The file `media/mezzo-pollo-lyria.mp3` is the original generated export, including its embedded provenance metadata. It is hosted with the game, without a runtime connection to Gemini. No third-party song or artist imitation was requested. No additional licence or independent rights clearance is asserted by this document.

## Successful generation prompt

> Crea una canzone brainrot in italiano di circa 2 minuti intitolata "Mezzo Pollo". Eurodance e hyperpop a 148 BPM, basso rimbalzante, cowbell, cori buffi "co-co-cocò", voce italiana cantata chiara. Un pollo di peluche dimezzato corre su tre corsie, sceglie la metà giusta e si immobilizza quando arriva POLLO INTERO. Ritornello: "Mezzo pollo, mezzo pollo, mezza piuma, doppio volo! Mezzo pollo, cocò-cocò, metà di me ma tutto il flow!". Due strofe assurde e divertenti, ritornello ripetuto, pausa musicale con grido "POLLO INTERO!", poi grande drop e finale.

The earlier full-lyrics request returned a text plan rather than audio. The short request above triggered generation, with Standard duration and vocals enabled. The recording may interpret the requested arrangement and lyrics.

## Game adaptation

Codex integrated a single looping player. It starts only after Play, defaults to 25% gain and preserves the position across pauses and new runs. Music settings persist locally. Web Audio gain lowers the song under event cues and throughout an active WHOLE CHICKEN obstacle. The song's lyrics are entertainment, not a source of game timing: the board and actual game events remain authoritative.

Music stops in menus, at game over and in background tabs. Failed or blocked playback never blocks the game. The complete track is available separately on the demo page.

## English subtitles

The game and demo player share an English WebVTT track at `media/mezzo-pollo-en.vtt`. The **CC English** control switches subtitles on or off and remembers the setting. Cues follow the actual media time, including seeks, pauses and looping; no separate lyric timer drifts between runs.

The 43 cues are based on local multilingual Whisper small transcription of the generated MP3, translated and reviewed by Codex. They are not copied from the earlier proposed full lyrics, because the generated first verse differs. Non-lexical chopped vocals are labelled rather than assigned invented words. Transcription and phrase timing are approximate; no professional transcription or human bilingual review is claimed. [Caption decisions and uncertain phrases](CAPTIONS.md).
