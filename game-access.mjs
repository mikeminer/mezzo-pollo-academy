import { ACCESS_POLICY } from './access-policy.mjs';
import { createLockAccess } from './lock-access.mjs';

const byId = id => document.getElementById(id);
const trustedOrigins = ['https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app'];
const origin = trustedOrigins.includes(location.origin) ? location.origin : trustedOrigins[2];
byId('phantomBrowse').href = `https://phantom.app/ul/browse/${encodeURIComponent(origin + '/')}?ref=${encodeURIComponent(origin)}`;
const amountFormat = new Intl.NumberFormat('en-US');
function wholeTokens(raw) {
  // Display is rounded down; eligibility always uses exact BigInt raw amounts.
  return amountFormat.format(BigInt(raw) / (10n ** BigInt(ACCESS_POLICY.decimals)));
}
function render(state) {
  const connected = !!state.wallet;
  const busy = state.status === 'connecting' || state.status === 'checking';
  byId('connectWallet').hidden = connected;
  byId('connectWallet').disabled = busy;
  byId('connectWallet').textContent = busy ? 'Connecting…' : 'Connect Phantom';
  byId('checkLocks').hidden = !connected;
  byId('checkLocks').disabled = busy;
  byId('checkLocks').textContent = busy ? 'Checking…' : 'Check locks again';
  byId('disconnectWallet').hidden = !connected;
  byId('playMember').hidden = !state.eligible;
  byId('accessWallet').hidden = !connected;
  byId('accessWallet').textContent = connected ? `Wallet: ${state.wallet}` : '';
  byId('phantomBrowse').hidden = state.status !== 'missing-wallet';
  const messages = {
    disconnected: 'Connect Phantom to check your timelocks. The game will not request any transactions.',
    connecting: 'Approve the connection in Phantom. No transaction signature is needed.',
    checking: 'Checking this wallet’s MEMEZZO timelocks on Solana…',
    eligible: `Timelocks confirmed: ${wholeTokens(state.totalRaw)} MEMEZZO actively locked. Each new game starts with ${state.livesPerGame} ${state.livesPerGame===1?'life':'lives'}.`,
    insufficient: 'At least 1,000,000 MEMEZZO in active timelocks has not been confirmed. If you just created a lock, wait for confirmation and check again.',
    unavailable: 'Timelock verification is unavailable or out of date. The game stays locked until access is confirmed. Try again shortly.',
    rejected: 'Connection cancelled in Phantom. You can try again whenever you are ready.',
    'missing-wallet': 'Phantom is not available in this browser. On a phone, open the game in the Phantom browser to check your timelocks and play.'
  };
  byId('accessStatus').textContent = messages[state.status] || messages.unavailable;
  byId('accessStatus').dataset.status = state.status;
  document.dispatchEvent(new CustomEvent('mezzopollo:access', { detail: { eligible: state.eligible, wallet: state.wallet, status: state.status, livesPerGame: state.livesPerGame } }));
}
const access = createLockAccess({ getProvider: () => window.phantom?.solana, onChange: render });
byId('connectWallet').disabled = false;
byId('connectWallet').addEventListener('click', () => { void access.connect(); });
byId('disconnectWallet').addEventListener('click', () => { void access.disconnect(); });
byId('checkLocks').addEventListener('click', () => { void access.refresh(); });
byId('copyMint').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(ACCESS_POLICY.mint); byId('copyMint').textContent = 'Mint copied'; }
  catch { byId('copyMint').textContent = 'Select and copy the mint above'; }
});
document.addEventListener('visibilitychange', () => {
  access.revalidate();
  if (!document.hidden) void access.refresh();
});
window.addEventListener('pageshow', () => { access.revalidate(); void access.refresh(); });
// Synchronous admission check for every start/resume path, including keyboard.
document.addEventListener('mezzopollo:revalidate', () => access.revalidate());
