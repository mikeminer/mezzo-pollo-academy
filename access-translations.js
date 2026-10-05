/* The soundtrack keeps its original Italian audio and English lyric cues. */
window.MezzoAccessTranslations = Object.freeze(Object.fromEntries(Object.entries(window.MezzoTranslations).map(([code,pack])=>[code,Object.freeze(pack.access)])));
