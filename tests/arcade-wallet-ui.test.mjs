import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const file = new URL('../game-arcade.js', import.meta.url);
const source = await readFile(file, 'utf8');
const address = 'GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W';
const tick = () => new Promise(resolve => setTimeout(resolve, 15));

function setup({ connected = false, brokenStorage = false, missing = false, requestError = Error('offline') } = {}) {
  const events = [], warnings = [], elements = new Map();
  const ids = ['arcadeTiers', 'arcadeStatus', 'arcadePay', 'arcadeConnect', 'arcadeConnection', 'arcadeStart', 'arcadeCheck', 'arcadeBack', 'arcadeWallet', 'arcadeReceipt'];
  for (const id of ids) elements.set(id, Object.assign(new EventTarget(), { hidden: false, disabled: false, textContent: '', dataset: {}, setAttribute() {} }));
  const wallet = { isPhantom: true, isConnected: connected, publicKey: connected ? address : null,
    connect() { events.push('connect'); this.isConnected = true; this.publicKey = address; return Promise.resolve({ publicKey: address }); } };
  const document = Object.assign(new EventTarget(), { getElementById: id => elements.get(id) || null, querySelectorAll: () => [] });
  const window = { MezzoTranslations: { en: { arcade: { connectedWallet: 'Connected: {wallet}', connectHint: 'Connect first', connectWallet: 'Connect wallet' } } },
    MezzoWallet: { getProvider: () => missing ? null : wallet,
      connect: () => wallet.connect(),
      withPaymentSession: operation => { events.push('session'); return operation(wallet); } } };
  const context = vm.createContext({ window, document, navigator: {}, localStorage: {
    getItem() { if (brokenStorage) return '{broken'; return null; },
    setItem() { throw Error('unexpected write'); }, removeItem() { throw Error('unexpected deletion'); },
  }, setTimeout, clearTimeout, AbortSignal, console: { warn: (...args) => warnings.push(args) },
    fetch: async () => { events.push('http'); throw requestError; } });
  new vm.Script(source, { filename: fileURLToPath(file), importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER }).runInContext(context);
  return { window, document, wallet, elements, events, warnings, click: id => elements.get(id).dispatchEvent(new Event('click')) };
}

test('Arcade connects directly from the gesture without backend, storage or payment work', async () => {
  const h = setup({ brokenStorage: true });
  assert.equal(h.elements.get('arcadePay').disabled, true);
  h.click('arcadeConnect');
  assert.deepEqual(h.events, ['connect'], 'Wallet launch happens synchronously in the click');
  await tick();
  assert.equal(h.elements.get('arcadeConnect').hidden, true);
  assert.equal(h.elements.get('arcadePay').disabled, false);
  assert.match(h.elements.get('arcadeConnection').textContent, /Connected: GxPoKN/);
});

test('failed saved-payment recovery leaves a separate working connect control and preserves storage', async () => {
  const h = setup({ brokenStorage: true });
  h.window.MezzoArcade.open(() => assert.fail('Must not admit a run'));
  await tick(); await tick();
  assert.equal(h.elements.get('arcadeConnect').disabled, false);
  h.click('arcadeConnect');
  assert.equal(h.events.includes('connect'), true);
  await tick();
  assert.equal(h.elements.get('arcadeConnect').hidden, true);
  assert.equal(h.events.includes('http'), false);
});

test('payment opens the mobile session in the click before async client loading and failed HTTP', async () => {
  const h = setup({ connected: true });
  h.click('arcadePay');
  assert.deepEqual(h.events, ['session']);
  await tick(); await tick();
  assert.deepEqual(h.events, ['session', 'http']);
  assert.equal(h.elements.get('arcadePay').disabled, false);
});

test('account disconnect revokes the visible connection and disables Pay without erasing a receipt', () => {
  const h = setup({ connected: true, brokenStorage: true });
  h.wallet.publicKey = null; h.wallet.isConnected = false;
  h.document.dispatchEvent(new Event('mezzopollo:wallet'));
  assert.equal(h.elements.get('arcadePay').disabled, true);
  assert.equal(h.elements.get('arcadeConnect').hidden, false);
});

test('missing provider keeps the actionable Phantom fallback visible', async () => {
  const h = setup({ missing: true });
  h.click('arcadeConnect'); await tick();
  assert.equal(h.elements.get('arcadeConnection').textContent, 'missingWallet');
  assert.equal(h.elements.get('arcadeWallet').hidden, false);
  assert.match(h.elements.get('arcadeWallet').href, /^https:\/\/phantom\.com\/ul\/browse\//);
  assert.deepEqual(h.events, []);
});

test('payment diagnostics expose only protocol codes and approved error names', async t => {
  const secret = 'private-url-or-receipt-secret';
  const cases = [
    { error: Object.assign(Error(secret), { code: -32603, request: { secret } }), code: -32603, name: 'Error' },
    { error: Object.assign(new TypeError(secret), { code: 'chain_unavailable' }), code: 'chain_unavailable', name: 'TypeError' },
    { error: Object.assign(Error(secret), { code: secret, name: secret, signature: secret }), code: 'unknown', name: 'Error' },
  ];
  for (const item of cases) await t.test(String(item.code), async () => {
    const h = setup({ connected: true, requestError: item.error });
    h.click('arcadePay'); await tick(); await tick();
    assert.equal(h.warnings.length, 1);
    assert.equal(h.warnings[0][0], '[MezzoPollo Arcade]');
    assert.equal(JSON.stringify(h.warnings[0][1]), JSON.stringify({ code: item.code, name: item.name }));
    assert.equal(h.elements.get('arcadeStatus').dataset.lastErrorCode, String(item.code));
    assert.equal(h.elements.get('arcadeStatus').dataset.lastErrorName, item.name);
    assert.equal(JSON.stringify(h.warnings).includes(secret), false);
    assert.equal(JSON.stringify(h.elements.get('arcadeStatus').dataset).includes(secret), false);
    assert.equal(h.elements.get('arcadePay').disabled, false);
  });
});
