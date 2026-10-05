/* Generated language packs keep copy separate from controls and game state. */
(() => {
  window.MezzoContent = Object.fromEntries(Object.entries(window.MezzoTranslations).map(([code, pack]) => [code, {
    static: window.MezzoSelectors.map(({selector, kind}, index) => kind === 'html'
      ? {selector, html: pack.static[index]} : kind === 'text'
      ? {selector, text: pack.static[index]} : {selector, attr: kind, text: pack.static[index]}),
    words: pack.words
  }]));
})();
