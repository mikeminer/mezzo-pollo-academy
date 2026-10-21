/* Mode selection is independent from the optional shop's wallet session. */
(() => {
  'use strict';
  let selected = 'free';
  const copy = Object.fromEntries(Object.entries(window.MezzoTranslations).map(([code,pack])=>[code,pack.mode]));
  const text = (key, params = {}) => (key === 'arcade' ? (window.MezzoTranslations[window.MezzoLocale?.code] || window.MezzoTranslations.en).arcade.name : (copy[window.MezzoLocale?.code] || copy.en)[key] || key)
    .replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
  function config(name = selected, unlockedLives = 0, arcadeTier = 'medium') {
    if (!['free', 'arcade', 'subscription'].includes(name)) throw new TypeError('Unknown game mode');
    if (name === 'subscription' && (!Number.isSafeInteger(unlockedLives) || unlockedLives < 10)) return null;
    if (name === 'free') return Object.freeze({name, lives:1, speed:11, minSpeed:10, maxSpeed:24, acceleration:1.2, maxLevel:3, reaction:5.2, minReaction:3.1, ruleSeconds:30, scoreKey:'mp_free_best'});
    // Keep valid older paid Hard receipts playable, although Hard is no longer sold.
    const arcadeLives = {hard:1,medium:3,easy:9,god:32};
    if (name === 'arcade' && !Object.hasOwn(arcadeLives, arcadeTier)) throw new TypeError('Unknown Arcade level');
    return Object.freeze(name === 'arcade'
      ? {name, tier:arcadeTier, lives:arcadeLives[arcadeTier], speed:11, minSpeed:10, maxSpeed:24, acceleration:1.2, maxLevel:3, reaction:5.2, minReaction:3.1, ruleSeconds:30, scoreKey:`mp_arcade_${arcadeTier}_best`}
      : {name, lives:unlockedLives, speed:8, minSpeed:7, maxSpeed:14, acceleration:.7, maxLevel:2, reaction:7.8, minReaction:5.2, ruleSeconds:45, scoreKey:'mp_easy_best'});
  }
  function select(name) {
    if (!['free', 'arcade', 'subscription'].includes(name)) return;
    selected = name;
    render();
    document.dispatchEvent(new Event('mezzopollo:mode'));
  }
  function render() {
    if (document.getElementById('modeChoices')) document.title = text('title');
    for (const link of document.querySelectorAll('[data-review-link]')) { link.href='/practice'; link.textContent=text('link'); }
    for (const label of document.querySelectorAll('[data-review-label]')) label.hidden=true;
    for (const element of document.querySelectorAll('[data-mode-text]')) element.textContent=text(element.dataset.modeText);
    for (const button of document.querySelectorAll('[data-mode-select]')) button.setAttribute('aria-pressed', String(button.dataset.modeSelect === selected));
    document.getElementById('modeChoices')?.setAttribute('aria-label', text('choose'));
  }
  window.MezzoMode=Object.freeze({get selected(){return selected;}, select, config, text, render});
  document.addEventListener('mezzopollo:language', render);
  for (const button of document.querySelectorAll('[data-mode-select]')) button.addEventListener('click', () => select(button.dataset.modeSelect));
  render();
})();
