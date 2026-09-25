import { ACCESS_POLICY } from './access-policy.mjs';
import { createLockAccess } from './lock-access.mjs';

const byId = id => document.getElementById(id);
const trustedOrigins = ['https://mezzopollo.it', 'https://www.mezzopollo.it', 'https://mezzo-pollo-academy.vercel.app'];
const origin = trustedOrigins.includes(location.origin) ? location.origin : trustedOrigins[2];
byId('phantomBrowse').href = `https://phantom.app/ul/browse/${encodeURIComponent(origin + '/')}?ref=${encodeURIComponent(origin)}`;
const amountFormat = new Intl.NumberFormat('it-IT');
function wholeTokens(raw) {
  // Display is rounded down; eligibility always uses exact BigInt raw amounts.
  return amountFormat.format(BigInt(raw) / (10n ** BigInt(ACCESS_POLICY.decimals)));
}
function render(state) {
  const connected = !!state.wallet;
  const busy = state.status === 'connecting' || state.status === 'checking';
  byId('connectWallet').hidden = connected;
  byId('connectWallet').disabled = busy;
  byId('connectWallet').textContent = busy ? 'Connessione…' : 'Collega Phantom';
  byId('checkLocks').hidden = !connected;
  byId('checkLocks').disabled = busy;
  byId('checkLocks').textContent = busy ? 'Verifica in corso…' : 'Ricontrolla i lock';
  byId('disconnectWallet').hidden = !connected;
  byId('playMember').hidden = !state.eligible;
  byId('accessWallet').hidden = !connected;
  byId('accessWallet').textContent = connected ? `Wallet: ${state.wallet}` : '';
  byId('phantomBrowse').hidden = state.status !== 'missing-wallet';
  const messages = {
    disconnected: 'Collega Phantom per controllare i tuoi timelock. Nessuna transazione verrà richiesta dal gioco.',
    connecting: 'Conferma la connessione in Phantom. Non occorre firmare una transazione.',
    checking: 'Controllo i timelock MEMEZZO del wallet su Solana…',
    eligible: `Timelock confermato: ${wholeTokens(state.totalRaw)} MEMEZZO attivi. Inizi ogni nuova partita con ${state.livesPerGame} ${state.livesPerGame===1?'vita':'vite'}.`,
    insufficient: 'Non è confermato un totale di almeno 1.000.000 MEMEZZO in timelock attivi. Se hai appena creato un lock, attendi la conferma e ricontrolla.',
    unavailable: 'Verifica dei timelock non disponibile o scaduta. Il gioco resta bloccato finché il requisito non è confermato. Riprova tra poco.',
    rejected: 'Connessione annullata in Phantom. Puoi riprovare quando vuoi.',
    'missing-wallet': 'Phantom non è disponibile in questo browser. Su telefono apri il gioco nel browser Phantom per verificare i timelock e giocare.'
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
  try { await navigator.clipboard.writeText(ACCESS_POLICY.mint); byId('copyMint').textContent = 'Mint copiato'; }
  catch { byId('copyMint').textContent = 'Seleziona e copia il mint qui sopra'; }
});
document.addEventListener('visibilitychange', () => {
  access.revalidate();
  if (!document.hidden) void access.refresh();
});
window.addEventListener('pageshow', () => { access.revalidate(); void access.refresh(); });
// Synchronous admission check for every start/resume path, including keyboard.
document.addEventListener('mezzopollo:revalidate', () => access.revalidate());
