import { transact } from './vendor/mwa.mjs';
import { createWebWallet, supportsMobileWallet } from './web-wallet.mjs';

const changed = () => document.dispatchEvent(new Event('mezzopollo:wallet'));
window.MezzoWallet = createWebWallet({
  nativeProvider: () => window.MezzoAndroid?.provider,
  phantomProvider: () => window.phantom?.solana,
  legacyProvider: () => window.solana,
  mobileSupported: supportsMobileWallet(navigator.userAgent, window.isSecureContext),
  transact, origin: location.origin, onChange: changed,
});
changed();
