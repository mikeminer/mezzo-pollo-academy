import { ACCESS_POLICY } from './access-policy.mjs';
import { createLockAccess } from './lock-access.mjs';

const byId = id => document.getElementById(id);
const trustedOrigins = ['https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app'];
const origin = trustedOrigins.includes(location.origin) ? location.origin : trustedOrigins[2];
byId('phantomBrowse').href = `https://phantom.app/ul/browse/${encodeURIComponent(origin + '/')}?ref=${encodeURIComponent(origin)}`;
let amountFormat = new Intl.NumberFormat('en-US');
let lastState = null, copyMessage = 'copyMint';
function languageCode() {
  const code = window.MezzoLocale?.code || document.documentElement.lang;
  return ['it', 'en', 'pl'].includes(code) ? code : 'en';
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
function render(state, notify = true) {
  lastState = state;
  const locale = window.MezzoLocale?.locale || { it: 'it-IT', en: 'en-US', pl: 'pl-PL' }[languageCode()];
  amountFormat = new Intl.NumberFormat(locale);
  const connected = !!state.wallet;
  const busy = state.status === 'connecting' || state.status === 'checking';
  byId('connectWallet').hidden = connected;
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
  if (notify) document.dispatchEvent(new CustomEvent('mezzopollo:access', { detail: { eligible: state.eligible, wallet: state.wallet, status: state.status, livesPerGame: state.livesPerGame } }));
}
const access = createLockAccess({ getProvider: () => window.phantom?.solana, onChange: render });
lastState = access.getState();
render(lastState, false);
byId('connectWallet').disabled = false;
byId('connectWallet').addEventListener('click', () => { void access.connect(); });
byId('disconnectWallet').addEventListener('click', () => { void access.disconnect(); });
byId('checkLocks').addEventListener('click', () => { void access.refresh(); });
byId('copyMint').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(ACCESS_POLICY.mint); copyMessage = 'copied'; }
  catch { copyMessage = 'copyFallback'; }
  byId('copyMint').textContent = translated(copyMessage);
});
document.addEventListener('mezzopollo:language', () => render(lastState, false));
document.addEventListener('visibilitychange', () => {
  access.revalidate();
  if (!document.hidden) void access.refresh();
});
window.addEventListener('pageshow', () => { access.revalidate(); void access.refresh(); });
// Synchronous admission check for every start/resume path, including keyboard.
document.addEventListener('mezzopollo:revalidate', () => access.revalidate());
