/* Explicit per-run checkout. Loading the game never contacts a wallet. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const tiers = Object.freeze({ hard: { lives: 1, price: '0.001' }, medium: { lives: 3, price: '0.002' }, easy: { lives: 9, price: '0.003' }, god: { lives: 32, price: '0.01' } });
  let tier = 'hard', client, loading, visible = false, callback, admission = false, status = 'connecting', ready = false, working = false, timer, generation = 0;
  const provider = () => window.MezzoAndroid?.provider || window.phantom?.solana;
  function text(key, params = {}) {
    const pack = window.MezzoTranslations[window.MezzoLocale?.code] || window.MezzoTranslations.en;
    return (pack.arcade?.[key] || key).replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match));
  }
  function params(name = tier) {
    const selected = tiers[name], locale = window.MezzoLocale;
    return { level: text(name), lives: `${locale?.number(selected.lives) || selected.lives} ${locale?.lifeWord(selected.lives) || 'lives'}`, price: selected.price };
  }
  async function request(input) {
    const mobile = provider();
    if (mobile?.isMezzoMobile) {
      if (typeof mobile.arcadeRequest !== 'function') throw Error('unavailable');
      return mobile.arcadeRequest(input);
    }
    const config = input.action === 'config';
    const response = await fetch('/api/arcade', {
      method: config ? 'GET' : 'POST', cache: 'no-store', credentials: 'same-origin',
      ...(config ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.json();
    if (!response.ok || body.error || (config && body.available !== true && body.enabled !== true)) {
      const error = Error(typeof body.error === 'string' ? body.error : body.error?.code || 'unavailable');
      error.code = error.message; throw error;
    }
    return body;
  }
  function render() {
    for (const element of document.querySelectorAll('[data-arcade-text]')) element.textContent = text(element.dataset.arcadeText, params());
    for (const button of document.querySelectorAll('[data-arcade-tier]')) {
      const name = button.dataset.arcadeTier;
      button.querySelector('strong').textContent = text(name);
      button.querySelector('small').textContent = text('tierDetail', params(name));
      button.setAttribute('aria-pressed', String(name === tier));
      button.disabled = working || Boolean(client?.pending);
    }
    byId('arcadeTiers')?.setAttribute('aria-label', text('choose'));
    if (!byId('arcadeStatus')) return;
    byId('arcadeStatus').textContent = text(status, params());
    byId('arcadePay').hidden = ready;
    byId('arcadePay').disabled = working;
    byId('arcadeStart').hidden = !ready;
    byId('arcadeStart').disabled = working;
    byId('arcadeCheck').hidden = !client?.pending || ready;
    byId('arcadeCheck').disabled = working;
    byId('arcadeBack').disabled = working;
    byId('arcadeWallet').hidden = status !== 'missingWallet' || Boolean(window.MezzoAndroid);
    byId('arcadeWallet').href = `https://phantom.app/ul/browse/${encodeURIComponent('https://mezzopollo.it/')}?ref=${encodeURIComponent('https://mezzopollo.it')}`;
    const signature = client?.pending?.signature;
    byId('arcadeReceipt').hidden = !signature;
    if (signature && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) byId('arcadeReceipt').href = `https://explorer.solana.com/tx/${signature}`;
  }
  function notify(next) { status = next; render(); }
  function failure(error) {
    const code = error?.code || error?.message;
    status = code === 4001 || code === 'USER_REJECTED' ? 'rejected'
      : code === 'missing_wallet' ? 'missingWallet'
      : code === 'already_started' ? 'consumed'
      : code === 'payment_busy' ? 'busy'
      : code === 'pending_tier' || code === 'payer_mismatch' ? 'recovery'
      : !client?.pending?.attempted ? 'unavailable' : 'failed';
    render();
  }
  async function ensure() {
    if (client) return client;
    if (!loading) loading = import('./arcade-client.mjs').then(({ createArcadeClient }) => {
      client = createArcadeClient({ request, getProvider: provider, storage: localStorage, notify,
        withLock: operation => navigator.locks ? navigator.locks.request('mezzopollo-arcade-checkout', operation) : operation() }); return client;
    }).catch(error => { loading = null; throw error; });
    return loading;
  }
  function accept(result) {
    ready = result?.status === 'paid';
    if (result?.tier && result.status !== 'started') tier = result.tier;
    status = ready ? 'ready' : result?.status === 'started' ? 'consumed' : result ? 'recovery' : 'connecting';
    render();
  }
  async function run(operation) {
    if (working) return;
    working = true; render();
    try { await ensure(); await operation(); } catch (error) { failure(error); }
    finally { working = false; render(); }
  }
  async function startPaid() {
    if (!visible || !ready) return;
    const current = generation;
    const receipt = await client.start();
    ready = false;
    // A navigation during consumption must never start a hidden run.
    if (!visible || generation !== current) { status = 'consumed'; return; }
    admission = true;
    const begin = callback;
    visible = false; clearTimeout(timer);
    begin?.(receipt);
    admission = false;
  }
  function scheduleCheck(attempt = 0) {
    clearTimeout(timer);
    if (!visible || ready || !client?.pending?.attempted || attempt >= 10) return;
    timer = setTimeout(() => {
      if (working || !visible) { scheduleCheck(attempt); return; }
      void run(async () => {
        accept(await client.check());
        if (ready && visible) await startPaid();
        else scheduleCheck(attempt + 1);
      });
    }, 3000);
  }
  window.MezzoArcade = Object.freeze({
    get tier() { return tier; }, text, params,
    consumeAdmission() { const allowed = admission; admission = false; return allowed; },
    open(begin) {
      visible = true; callback = begin; generation++; ready = false;
      void run(async () => { accept(await client.recover()); scheduleCheck(); });
    },
    close() { visible = false; callback = null; admission = false; generation++; clearTimeout(timer); },
  });
  for (const button of document.querySelectorAll('[data-arcade-tier]')) button.onclick = () => {
    if (!working && !client?.pending) { tier = button.dataset.arcadeTier; render(); }
  };
  byId('arcadePay')?.addEventListener('click', () => void run(async () => {
    accept(await client.pay(tier));
    if (ready && visible) await startPaid(); else scheduleCheck();
  }));
  byId('arcadeCheck')?.addEventListener('click', () => void run(async () => { accept(await client.check()); scheduleCheck(); }));
  byId('arcadeStart')?.addEventListener('click', () => void run(startPaid));
  document.addEventListener('mezzopollo:language', render);
  render();
})();
