import { ACCESS_POLICY } from './access-policy.mjs';
import { createLockAccess } from './monthly-access.mjs';
import { readSubscriptionEvidence } from './subscription-client.mjs';

const byId = id => document.getElementById(id);
const trustedOrigins = ['https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app'];
const origin = trustedOrigins.includes(location.origin) ? location.origin : trustedOrigins[2];
byId('phantomBrowse').href = `https://phantom.com/ul/browse/${encodeURIComponent(origin + '/')}?ref=${encodeURIComponent(origin)}`;
let amountFormat = new Intl.NumberFormat('en-US');
let lastState = null, copyMessage = 'copyMint';
function languageCode() {
  const code = window.MezzoLocale?.code || document.documentElement.lang;
  return Object.hasOwn(window.MezzoAccessTranslations || {}, code) ? code : 'en';
}
function translated(key, params = {}) {
  const dictionaries = window.MezzoAccessTranslations;
  const template = dictionaries?.[languageCode()]?.[key] ?? dictionaries?.en?.[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}
function lifeWord(count) {
  if (window.MezzoLocale?.lifeWord) return window.MezzoLocale.lifeWord(count);
  const code = languageCode();
  const category = new Intl.PluralRules(code).select(count);
  if (code === 'pl') return category === 'one' ? 'życie' : category === 'few' ? 'życia' : 'żyć';
  return code === 'it' ? (count === 1 ? 'vita' : 'vite') : (count === 1 ? 'life' : 'lives');
}
function wholeTokens(raw) {
  // Display is rounded down; eligibility always uses exact BigInt raw amounts.
  return amountFormat.format(BigInt(raw) / (10n ** BigInt(ACCESS_POLICY.decimals)));
}
let allowCherryReconnect=false;
function render(state, notify = true) {
  if(state.eligible && (!Number.isSafeInteger(state.expiresAt)||state.expiresAt<=Date.now()/1000||state.livesPerGame!==10))
    state={...state,eligible:false,livesPerGame:0,status:'insufficient'};
  lastState = state;
  const locale = window.MezzoLocale?.locale || { it: 'it-IT', en: 'en-US', pl: 'pl-PL' }[languageCode()];
  amountFormat = new Intl.NumberFormat(locale);
  const connected = !!state.wallet;
  const busy = state.status === 'connecting' || state.status === 'checking';
  byId('connectWallet').hidden = connected || (document.documentElement?.dataset?.cherryWallet===''&&!allowCherryReconnect);
  byId('connectWallet').disabled = busy;
  byId('connectWallet').textContent = translated(busy ? 'connectingButton' : 'connect');
  byId('checkLocks').hidden = !connected;
  byId('checkLocks').disabled = busy;
  byId('checkLocks').textContent = translated(busy ? 'checkingButton' : 'check');
  byId('disconnectWallet').hidden = !connected;
  byId('playMember').hidden = !state.eligible;
  byId('accessWallet').hidden = !connected;
  byId('accessWallet').textContent = connected ? translated('wallet', { wallet: state.wallet }) : '';
  byId('phantomBrowse').hidden = state.status !== 'missing-wallet';
  const messageKey = window.MezzoAccessTranslations?.en?.[state.status] ? state.status : 'unavailable';
  byId('accessStatus').textContent = translated(messageKey, {
    amount: wholeTokens(state.totalRaw), minimum: wholeTokens(ACCESS_POLICY.minimumRaw.toString()),
    lives: amountFormat.format(state.livesPerGame), lifeWord: lifeWord(state.livesPerGame),
  });
  byId('copyMint').textContent = translated(copyMessage);
  byId('accessStatus').dataset.status = state.status;
  if (notify) document.dispatchEvent(new CustomEvent('mezzopollo:access', { detail: { eligible: state.eligible, wallet: state.wallet, status: state.status, livesPerGame: state.livesPerGame, expiresAt:state.expiresAt } }));
}
const access = createLockAccess({ getProvider: () => {
  if (typeof window.MezzoWallet?.getProvider === 'function') return window.MezzoWallet.getProvider();
  // Keep the existing APK and legacy Phantom injection working when the web
  // adapter is absent. Never select an unrelated window.solana provider.
  if (window.MezzoAndroid?.provider?.isMezzoMobile === true) return window.MezzoAndroid.provider;
  if (window.phantom?.solana?.isPhantom === true) return window.phantom.solana;
  return window.solana?.isPhantom === true ? window.solana : null;
}, onChange: render, readEvidence: readSubscriptionEvidence });
let shopOpen = false;
window.MezzoShopAccess = Object.freeze({
  getState: access.getState,
  cancelPending: access.cancelPending,
  refresh: access.refresh,
  connect: access.connect,
});
lastState = access.getState();
render(lastState, false);
byId('connectWallet').disabled = false;
byId('connectWallet').addEventListener('click', () => { if (shopOpen) void access.connect(); });
byId('disconnectWallet').addEventListener('click', () => { allowCherryReconnect=true;void access.disconnect(); });
byId('checkLocks').addEventListener('click', () => { if (shopOpen) void access.refresh(); });
byId('copyMint').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(ACCESS_POLICY.mint); copyMessage = 'copied'; }
  catch { copyMessage = 'copyFallback'; }
  byId('copyMint').textContent = translated(copyMessage);
});
document.addEventListener('mezzopollo:language', () => render(lastState, false));
document.addEventListener('mezzopollo:shopopen', () => { shopOpen = true; if(location.pathname==='/cherry'&&window.MezzoWallet?.getProvider()?.isMezzoCherry&&window.MezzoWallet.getProvider().isConnected)void access.connect(); });
document.addEventListener('mezzopollo:cherry-ready',()=>{if(shopOpen)void access.connect();});
document.addEventListener('mezzopollo:shopclose', () => {
  shopOpen = false;
  access.cancelPending();
});

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&access.getState().wallet)void access.refresh();});
