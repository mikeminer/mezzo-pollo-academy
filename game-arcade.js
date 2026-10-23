/* Explicit per-run checkout. Loading the game never contacts a wallet. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const tiers = Object.freeze({ hard: { lives: 1, price: '0.001' }, medium: { lives: 3, price: '0.002' }, easy: { lives: 9, price: '0.003' }, god: { lives: 32, price: '0.01' } });
  const diagnosticCodes = new Set(['USER_REJECTED', 'already_started', 'arcade_unavailable', 'chain_unavailable',
    'intent_not_found', 'invalid_action', 'invalid_address', 'invalid_intent', 'invalid_json', 'invalid_request', 'invalid_tier',
    'invalid_wallet_response', 'json_required', 'local_network_blocked', 'local_network_prompt', 'method_not_allowed', 'missing_wallet', 'origin_not_allowed',
    'payer_mismatch', 'payment_already_used', 'payment_busy', 'payment_conflict', 'payment_mismatch', 'payment_needs_review',
    'payment_pending', 'payment_required', 'pending_tier', 'rate_limited', 'recipient_unavailable', 'request_too_large',
    'storage_unavailable', 'tier_mismatch', 'unavailable', 'wallet_disconnected', 'wrong_network']);
  const diagnosticNames = new Set(['Error', 'TypeError', 'SyntaxError', 'RangeError', 'DOMException', 'AbortError', 'TimeoutError']);
  let tier = 'medium', client, loading, visible = false, callback, admission = false, status = 'connecting', ready = false, working = false, timer, generation = 0;
  let walletConnecting = false, walletError = null;
  const provider = () => window.MezzoWallet?.getProvider() || window.MezzoAndroid?.provider || window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
  const walletAddress = () => {
    const wallet = provider();
    return wallet?.isConnected === false ? null : wallet?.publicKey?.toString() || null;
  };
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
    byId('arcadeStatus').textContent = status === 'connecting'
      ? (walletAddress() ? '' : text('connectHint')) : text(status, params());
    byId('arcadePay').hidden = ready;
    byId('arcadePay').disabled = working || walletConnecting || !walletAddress();
    if (byId('arcadeConnect')) {
      const address = walletAddress();
      byId('arcadeConnect').hidden = Boolean(address);
      // Connection must remain usable even if saved-payment recovery or the backend fails.
      byId('arcadeConnect').disabled = walletConnecting;
      byId('arcadeConnect').textContent = text(walletConnecting ? 'connectingWallet' : 'connectWallet');
      byId('arcadeConnection').textContent = address ? text('connectedWallet', { wallet: address.slice(0, 6) + '…' + address.slice(-4) })
        : text(walletConnecting ? 'connectingWallet' : walletError || 'connectHint');
    }
    byId('arcadeStart').hidden = !ready;
    byId('arcadeStart').disabled = working;
    byId('arcadeCheck').hidden = !client?.pending || ready;
    byId('arcadeCheck').disabled = working;
    byId('arcadeBack').disabled = working;
    byId('arcadeWallet').hidden = Boolean(walletAddress()) || Boolean(window.MezzoAndroid);
    byId('arcadeWallet').href = `https://phantom.com/ul/browse/${encodeURIComponent('https://mezzopollo.it/')}?ref=${encodeURIComponent('https://mezzopollo.it')}`;
    const signature = client?.pending?.signature;
    byId('arcadeReceipt').hidden = !signature;
    if (signature && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) byId('arcadeReceipt').href = `https://explorer.solana.com/tx/${signature}`;
  }
  function notify(next) { status = next; render(); }
  function failure(error) {
    const code = error?.code || error?.message;
    // Retain a short cause while redacting identifiers and credentials. Never
    // log error/request objects, stack traces or the saved payment record.
    const diagnosticCode = typeof code === 'number' && Number.isSafeInteger(code) ? code
      : typeof code === 'string' && diagnosticCodes.has(code) ? code : 'unknown';
    const diagnosticName = diagnosticNames.has(error?.name) ? error.name : 'Error';
    const diagnosticPhase = ['checking', 'connecting', 'signing', 'pending', 'ready', 'recovery', 'consumed', 'unavailable', 'failed', 'rejected'].includes(status) ? status : 'unknown';
    const diagnosticDetail = (typeof error?.message === 'string' ? error.message.slice(0, 2048) : '')
      .replace(/\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.)[^\s<>"']+/gi, '[redacted]')
      .replace(/\b[A-Za-z]:[\\/][^\r\n<>"']+/g, '[redacted]')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[redacted]')
      .replace(/[1-9A-HJ-NP-Za-km-z]{32,}/g, '[redacted]')
      .replace(/\b(?:bearer\s+|(?:authorization|api[-_ ]?key|secret|auth[-_ ]?token|token|signature|wallet|payer|reference|intent[-_ ]?id)\s*[:=]\s*["']?)[^\s,<>"']+/gi, '[redacted]')
      .replace(/[A-Za-z0-9_+/=-]{20,}/g, '[redacted]')
      .replace(/[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, 160);
    console.warn(`[MezzoPollo Arcade] phase=${diagnosticPhase} code=${diagnosticCode} name=${diagnosticName} detail=${diagnosticDetail}`);
    const diagnosticTarget = byId('arcadeStatus');
    if (diagnosticTarget) {
      diagnosticTarget.dataset.lastErrorCode = String(diagnosticCode);
      diagnosticTarget.dataset.lastErrorName = diagnosticName;
      diagnosticTarget.dataset.lastErrorPhase = diagnosticPhase;
      diagnosticTarget.dataset.lastErrorDetail = diagnosticDetail;
    }
    status = code === 4001 || code === 'USER_REJECTED' ? 'rejected'
      : code === 'missing_wallet' ? 'missingWallet'
      : code === 'local_network_prompt' ? 'allowNetwork'
      : code === 'local_network_blocked' ? 'networkBlocked'
      : code === 'already_started' ? 'consumed'
      : code === 'payment_busy' ? 'busy'
      : code === 'payer_mismatch' ? 'walletMismatch'
      : code === 'pending_tier' ? 'recovery'
      : !client?.pending?.attempted ? 'unavailable' : 'failed';
    render();
  }
  async function ensure() {
    if (client) return client;
    if (!loading) loading = import('./arcade-client.mjs').then(({ createArcadeClient }) => {
      client = createArcadeClient({ request, getProvider: provider, storage: localStorage, notify, canReleaseDraft: Boolean(navigator.locks),
        withLock: operation => navigator.locks ? navigator.locks.request('mezzopollo-arcade-checkout', operation) : operation() }); return client;
    }).catch(error => { loading = null; throw error; });
    return loading;
  }
  function accept(result) {
    ready = result?.status === 'paid';
    if (result?.tier && result.status !== 'started') tier = result.tier;
    else if (!result || result.status === 'started') { if (tier === 'hard') tier = 'medium'; }
    status = result?.status === 'started' ? 'consumed' : client.state;
    render();
  }
  async function run(operation) {
    if (working) return;
    working = true; render();
    try { await ensure(); await operation(); } catch (error) { failure(error); }
    finally { working = false; render(); }
  }
  async function connectWallet() {
    if (walletConnecting) return;
    walletConnecting = true; walletError = null; render();
    try {
      // Launch before any API call, dynamic import or Web Lock: Android requires a user gesture.
      const wallet = provider();
      if (!wallet?.connect) throw Error('missing_wallet');
      await (window.MezzoWallet ? window.MezzoWallet.connect() : wallet.connect());
      if (!walletAddress()) throw Error('missing_wallet');
    } catch (error) {
      walletError = Number(error?.code) === 4001 || error?.code === 'USER_REJECTED' ? 'rejected'
        : error?.message === 'missing_wallet' ? 'missingWallet'
        : error?.code === 'local_network_prompt' ? 'allowNetwork'
        : error?.code === 'local_network_blocked' ? 'networkBlocked' : 'walletFailed';
    } finally { walletConnecting = false; render(); }
  }
  async function payFromGesture() {
    if (working || walletConnecting) return;
    if (!walletAddress()) { await connectWallet(); return; }
    working = true; render();
    try {
      const pay = async sessionProvider => { await ensure(); return client.pay(tier, sessionProvider); };
      // Open MWA now, then keep authorization, receipt recovery and signing in that session.
      const result = window.MezzoWallet ? await window.MezzoWallet.withPaymentSession(pay) : await pay(provider());
      accept(result);
      if (ready && visible) await startPaid(); else scheduleCheck();
    } catch (error) { failure(error); }
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
  byId('arcadeConnect')?.addEventListener('click', () => void connectWallet());
  byId('arcadePay')?.addEventListener('click', () => void payFromGesture());
  byId('arcadeCheck')?.addEventListener('click', () => void run(async () => { accept(await client.check()); scheduleCheck(); }));
  byId('arcadeStart')?.addEventListener('click', () => void run(startPaid));
  document.addEventListener('mezzopollo:language', render);
  document.addEventListener('mezzopollo:wallet', render);
  render();
})();
