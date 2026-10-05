/* Demo copy follows the country selection; the recorded media remain in English. */
(function () {
  'use strict';
  const copy = Object.fromEntries(Object.entries(window.MezzoTranslations).map(([code,pack])=>[code,pack.demo]));

  function translateDemo() {
    const text = copy[window.MezzoLocale?.code] || copy.en;
    document.title = text.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', text.description);
    document.querySelectorAll('[data-demo]').forEach(element => {
      const value = text[element.dataset.demo];
      if (typeof value === 'string') element.textContent = value;
    });
    document.querySelectorAll('[data-demo-aria]').forEach(element => {
      const value = text[element.dataset.demoAria];
      if (typeof value === 'string') element.setAttribute('aria-label', value);
    });
  }

  document.addEventListener('mezzopollo:language', translateDemo);
  translateDemo();
}());
