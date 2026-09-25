# English captions for the generated Mezzo Pollo recording

Source: `media/mezzo-pollo-lyria.mp3` (130.612 seconds).
Output: `media/mezzo-pollo-en.vtt`.

The captions were derived from the **actual MP3**, using local multilingual Whisper small (CPU/int8), a complete pass with 12-second chunks, and additional passes on difficult excerpts. The older planned lyrics were not substituted for the recording: the first sung verse and the opening arrangement are different. Model output and word timestamps remain in `.asr-temp/`; runtime dependencies are in `.asr-deps/`. Neither directory belongs in the game or deployment.

## Editorial decisions and limits

- These are an English translation with approximate phrase timings, not a karaoke word-alignment or an independently human-listened transcript. Vocal effects, repetition and singing reduce ASR accuracy.
- The character name **Mezzo Pollo** is retained (literally **Half Chicken**). **LUNA** is kept in Italian because cutting its four letters in half yields **LU**; translating that word to MOON would break the sung word puzzle.
- The actual first verse, approximately 12.84–25.64 seconds, was recovered as: “Guarda il becco, guarda la piuma / corro forte come la schiuma / tre corsie di pura follia / salto a sinistra e volo via / prendo la metà nel biscotto / sono un peluche ma non sono cotto / scivolo sopra un budino rosa / questa corsa è favolosa.” “Scivolo sopra un budino rosa” was normalized from phonetic recognition across two clipped passes; “nel biscotto” is translated naturally as half a cookie.
- **39.98–50.88 seconds:** recognition becomes unstable in the vocal effects, including a classic false “sottotitoli … QTSS” hallucination. That text was discarded. The VTT says **[Chopped vocals over the beat]** and does not invent a missing sentence. One pass suggested a chopped version of “stai fermissimo davvero”; it was not confidently enough recovered to include as a translated instruction.
- **60.28–63.50 seconds:** “non son cotto … col piumino da surfista” is a context-supported normalization. ASR repeatedly confuses *cotto* with *cocco* and *surfista* with *surface*. The draft supports the normalized reading, but this specific wording would benefit from human listening.
- **92.64–95.52 seconds:** “non fare boh” is normalized from the first whole-file recognition “non farebò”; other passes collapsed it to “non faremo”. It is translated “Don't say ‘dunno’!” This short phrase is a remaining uncertainty.
- **114.10–120.28 seconds:** the processed final refrain is normalized against repeated occurrences of the same hook. Multiple passes support the rhythm and partial words but disagree on consonants; these captions should not be described as independently human-verified.
- Silence and short transitions generally clear the text. Musical passages at the opening and tail are described as instrumental.

## Validation

The VTT uses UTF-8, valid HH:MM:SS.mmm timestamps, ordered non-overlapping cues, and ends at the decoded track duration. English text is grouped into short phrases with no more than two lines per cue.
