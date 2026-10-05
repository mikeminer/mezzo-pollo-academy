import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createLockAccess } from '../lock-access.mjs';
import { ACCESS_POLICY } from '../access-policy.mjs';

const code = (await readFile(new URL('../game-access.mjs', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '');
const walletAddress = '11111111111111111111111111111111';
const now = 2_000_000_000;
const validEvidence = {
  wallet: walletAddress, mint: ACCESS_POLICY.mint, ts: now,
  activeLocks: [{ address: 'one', depositor: walletAddress, mint: ACCESS_POLICY.mint,
    amount: '1000000000000', createdAt: now - 100, unlockAt: now + 1 }],
};
async function settle() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
class DetailEvent extends Event {
  constructor(type, options) { super(type); this.detail = options?.detail; }
}
function setup(fetchImpl = async () => ({ ok: true, json: async () => validEvidence })) {
  const elements = new Map(), requests = [], notices = [];
  const doc = Object.assign(new EventTarget(), {
    documentElement: { lang: 'en' }, hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, Object.assign(new EventTarget(), { dataset: {} }));
      return elements.get(id);
    },
  });
  const wallet = {
    isPhantom: true, isConnected: true, publicKey: walletAddress,
    connect: async () => ({ publicKey: walletAddress }),
    on() {}, removeListener() {},
  };
  const win = Object.assign(new EventTarget(), {
    phantom: { solana: wallet },
    MezzoAccessTranslations: { en: { eligible: '{lives} {lifeWord}', connected: 'Ready', checking: 'Checking' } },
  });
  doc.addEventListener('mezzopollo:access', event => notices.push(event.detail));
  vm.runInNewContext(code, {
    ACCESS_POLICY, createLockAccess: options => createLockAccess({ ...options, now: () => now,
      fetchImpl: (...args) => { requests.push(args); return fetchImpl(...args); } }),
    document: doc, window: win, location: { origin: 'https://mezzopollo.it' },
    navigator: { clipboard: { writeText: async () => {} } }, CustomEvent: DetailEvent,
    Intl, encodeURIComponent,
  });
  return { doc, win, elements, requests, notices, click: id => doc.getElementById(id).dispatchEvent(new Event('click')) };
}

test('the shop UI never looks up locks on load, background, resume or open; only its buttons do', async () => {
  const h = setup();
  assert.equal(h.requests.length, 0);
  h.click('connectWallet');
  h.doc.dispatchEvent(new Event('visibilitychange'));
  h.win.dispatchEvent(new Event('pageshow'));
  h.doc.dispatchEvent(new Event('mezzopollo:revalidate'));
  await settle();
  assert.equal(h.requests.length, 0);
  h.doc.dispatchEvent(new Event('mezzopollo:shopopen'));
  await settle();
  assert.equal(h.requests.length, 0);
  h.click('connectWallet'); await settle();
  assert.equal(h.requests.length, 1);
  assert.equal(h.win.MezzoShopAccess.getState().eligible, true);
  assert.equal(h.notices.at(-1).livesPerGame, 1);
  h.doc.dispatchEvent(new Event('mezzopollo:shopclose'));
  h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange'));
  h.doc.hidden = false; h.doc.dispatchEvent(new Event('visibilitychange'));
  h.win.dispatchEvent(new Event('pageshow'));
  h.doc.dispatchEvent(new Event('mezzopollo:revalidate'));
  h.doc.dispatchEvent(new Event('mezzopollo:language'));
  h.click('connectWallet'); h.click('checkLocks'); await settle();
  assert.equal(h.requests.length, 1);
  assert.equal(h.win.MezzoShopAccess.getState().eligible, true);
  h.doc.dispatchEvent(new Event('mezzopollo:shopopen'));
  h.click('checkLocks'); await settle();
  assert.equal(h.requests.length, 2);
  h.click('disconnectWallet'); await settle();
});

test('shopclose aborts the manual UI lookup and its late result cannot grant Easy access', async () => {
  let release;
  const h = setup(() => new Promise(resolve => { release = resolve; }));
  h.doc.dispatchEvent(new Event('mezzopollo:shopopen'));
  h.click('connectWallet'); await settle();
  assert.equal(h.requests.length, 1);
  assert.equal(h.win.MezzoShopAccess.getState().status, 'checking');
  h.doc.dispatchEvent(new Event('mezzopollo:shopclose')); await settle();
  assert.equal(h.requests[0][1].signal.aborted, true);
  release({ ok: true, json: async () => validEvidence }); await settle();
  assert.equal(h.win.MezzoShopAccess.getState().eligible, false);
  assert.equal(h.notices.some(state => state.eligible), false);
  h.click('disconnectWallet'); await settle();
});
