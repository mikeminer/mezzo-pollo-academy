/* Mode selection is independent from the optional shop's wallet session. */
(() => {
  'use strict';
  let selected = 'hard';
  const copy = Object.fromEntries(Object.entries(window.MezzoTranslations).map(([code,pack])=>[code,pack.mode]));
  const text = (key, params = {}) => ((copy[window.MezzoLocale?.code] || copy.en)[key] || key)
    .replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
  function config(name = selected, unlockedLives = 0) {
    if (!['hard', 'easy'].includes(name)) throw new TypeError('Unknown game mode');
    if (name === 'easy' && (!Number.isSafeInteger(unlockedLives) || unlockedLives < 1)) return null;
    return Object.freeze(name === 'hard'
      ? {name, lives:2, speed:11, minSpeed:10, maxSpeed:24, acceleration:1.2, maxLevel:3, reaction:5.2, minReaction:3.1, ruleSeconds:30, scoreKey:'mp_hard_best'}
      : {name, lives:unlockedLives, speed:8, minSpeed:7, maxSpeed:14, acceleration:.7, maxLevel:2, reaction:7.8, minReaction:5.2, ruleSeconds:45, scoreKey:'mp_easy_best'});
  }
  function select(name) {
    if (!['hard', 'easy'].includes(name)) return;
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
