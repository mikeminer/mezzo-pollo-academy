import { transact } from './vendor/mwa.mjs';
import { createWebWallet, supportsMobileWallet } from './web-wallet.mjs';

const changed = () => document.dispatchEvent(new Event('mezzopollo:wallet'));
// Chrome's Local Network Access permission, read once and kept current, so a click can check it
// synchronously and still open the wallet within its user activation (see web-wallet.mjs).
const localNetwork = (() => {
  let state = 'unsupported';
  (async () => {
    for (const name of ['loopback-network', 'local-network-access']) {
      try {
        const status = await navigator.permissions.query({ name });
        state = status.state;
        status.onchange = () => { state = status.state; changed(); };
        return;
      } catch { /* this browser doesn't know that permission name */ }
    }
  })();
  return {
    state: () => state,
    // any request to this phone raises Chrome's question; the answer arrives through onchange
    request: () => { fetch('http://localhost:1/', { mode: 'no-cors' }).catch(() => {}); },
  };
})();
window.MezzoWallet = createWebWallet({
  nativeProvider: () => window.MezzoAndroid?.provider,
  phantomProvider: () => window.phantom?.solana,
  legacyProvider: () => window.solana,
  mobileSupported: supportsMobileWallet(navigator.userAgent, window.isSecureContext),
  transact, origin: location.origin, onChange: changed, localNetwork,
});
changed();
