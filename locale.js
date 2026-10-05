/* Country/region choices select language, never wallet eligibility. */
(() => {
  'use strict';
  const packs = window.MezzoTranslations;
  const countries = Object.fromEntries(Object.entries(packs).map(([key, pack]) => [key, pack.meta]));
  let code = 'en';
  try { const saved = localStorage.getItem('mp_country'); if (Object.hasOwn(countries, saved)) code = saved; } catch {}
  let ready = false, returnFocus = null;
  const t = (key, params = {}) => (packs[code].core[key] ?? packs.en.core[key] ?? key).replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
  const number = (value, options) => new Intl.NumberFormat(countries[code].locale, options).format(value);
  const lifeWord = count => packs[code].life[new Intl.PluralRules(countries[code].locale).select(count)] ?? packs[code].life.other;
  const graphemes = text => typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(countries[code].locale, {granularity:'grapheme'}).segment(text)].map(item=>item.segment) : Array.from(text);
  const normalize = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  const gate = document.createElement('div');
  gate.id = 'countryGate'; gate.className = 'country-gate';
  gate.setAttribute('role','dialog'); gate.setAttribute('aria-modal','true'); gate.setAttribute('aria-labelledby','countryHeading'); gate.setAttribute('aria-describedby','countryNote');
  gate.innerHTML = '<section class="country-panel"><header class="country-header"><div class="country-brand">Mezzo Pollo <span>Academy</span></div><h1 id="countryHeading"></h1><p id="countryNote"></p><input id="countrySearch" type="search" autocomplete="off" spellcheck="false"></header><div class="country-options"></div><p id="countryEmpty" role="status" hidden></p></section>';
  const options = gate.querySelector('.country-options');
  const search = gate.querySelector('#countrySearch');
  for (const [key, country] of Object.entries(countries)) {
    const button = document.createElement('button'); button.type='button'; button.className='country-option'; button.dataset.country=key; button.lang=country.locale; button.dir=country.dir;
    button.setAttribute('aria-label', `${country.country} — ${country.language}`);
    const flag=document.createElement('img');flag.className='country-flag';flag.src=`flags/${country.flag}.svg`;flag.alt='';flag.width=64;flag.height=48;flag.setAttribute('aria-hidden','true');
    const name=document.createElement('span');name.className='country-name';name.textContent=country.country;
    const language=document.createElement('span');language.className='country-language';language.textContent=country.language;
    button.append(flag,name,language);options.append(button);
  }
  document.body.prepend(gate);
  const roots=[...document.querySelectorAll('[data-country-root]')];
  function filter(){
    const query=normalize(search.value.trim());let visible=0;
    for(const button of options.querySelectorAll('[data-country]')){
      button.hidden=!!query&&!button.dataset.search.includes(query);if(!button.hidden)visible++;
    }
    gate.querySelector('#countryEmpty').hidden=visible!==0;
  }
  function apply(){
    document.documentElement.lang=countries[code].locale;document.documentElement.dir=countries[code].dir;
    gate.querySelector('#countryHeading').textContent=t('chooseCountry');gate.querySelector('#countryNote').textContent=t('chooseNote');
    search.placeholder=t('searchLanguages');search.setAttribute('aria-label',t('searchLanguages'));gate.querySelector('#countryEmpty').textContent=t('noLanguages');
    for(const button of options.querySelectorAll('[data-country]')){
      const country=countries[button.dataset.country];button.setAttribute('aria-pressed',String(button.dataset.country===code));
      const labels=[button.dataset.country,country.locale,country.country,country.language];
      for(const locale of [countries[code].locale,'en']){try{if(country.flag!=='global')labels.push(new Intl.DisplayNames([locale],{type:'region'}).of(country.flag.toUpperCase()));labels.push(new Intl.DisplayNames([locale],{type:'language'}).of(country.locale));}catch{}}
      button.dataset.search=normalize(labels.join(' '));
    }
    for(const entry of window.MezzoContent[code].static)for(const element of document.querySelectorAll(entry.selector)){
      if(entry.attr)element.setAttribute(entry.attr,entry.text);else if(entry.html!==undefined)element.innerHTML=entry.html;else element.textContent=entry.text;
    }
    for(const button of document.querySelectorAll('[data-country-open]')){button.textContent=`${countries[code].country} · ${t('changeCountry')}`;button.setAttribute('aria-label',t('changeCountry'));}
    filter();
  }
  function open(){
    returnFocus=document.activeElement;ready=false;search.value='';filter();
    for(const root of roots)root.inert=true;for(const media of document.querySelectorAll('audio,video'))media.pause();
    gate.hidden=false;document.dispatchEvent(new Event('mezzopollo:countryopen'));
    requestAnimationFrame(()=>{const button=gate.querySelector(`[data-country="${code}"]`);button.focus({preventScroll:true});button.scrollIntoView({block:'nearest'});});
  }
  function choose(next){
    if(!Object.hasOwn(countries,next))return;code=next;
    try{localStorage.setItem('mp_country',code);}catch{}
    apply();ready=true;document.dispatchEvent(new CustomEvent('mezzopollo:language',{detail:{code,locale:countries[code].locale}}));
    gate.hidden=true;for(const root of roots)root.inert=false;
    const focus=returnFocus?.matches('[data-country-open]')?returnFocus:document.getElementById('btnPlay')||document.querySelector('[data-country-open]');focus?.focus({preventScroll:true});
  }
  search.addEventListener('input',filter);
  gate.addEventListener('click',event=>{const button=event.target.closest('[data-country]');if(button)choose(button.dataset.country);});
  gate.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const buttons=[search,...options.querySelectorAll('[data-country]')].filter(element=>!element.hidden);
    if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}
  });
  for(const button of document.querySelectorAll('[data-country-open]'))button.addEventListener('click',open);
  window.MezzoLocale=Object.freeze({get code(){return code;},get locale(){return countries[code].locale;},get direction(){return countries[code].dir;},get ready(){return ready;},t,number,lifeWord,graphemes,words:()=>window.MezzoContent[code].words,open});
  apply();open();
})();
