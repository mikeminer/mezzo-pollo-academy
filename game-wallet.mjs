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

// The dedicated listing URL never falls back to external wallets inside Cherry.
// Match the Cherry SDK's strict host markers. A regular visit to /cherry
// still uses the standalone wallet and can buy the monthly pass.
const cherryHost = !!window.__cherry ||
 (window.parent!==window && new URLSearchParams(location.search).get('cherry_embed')==='1');
if(/^\/cherry\/?$/.test(location.pathname)&&cherryHost){
 document.documentElement.dataset.cherryWallet = '';
 let cherryProvider=null;
 window.MezzoWallet=Object.freeze({
  getProvider:()=>cherryProvider,
  async connect(){if(!cherryProvider)throw Error('cherry_launch_unavailable');return cherryProvider.connect();},
  async withPaymentSession(operation){if(!cherryProvider?.isConnected)throw Error('cherry_launch_unavailable');return operation(cherryProvider);}
 });
 const label=document.createElement('p');
 label.setAttribute('role','status');
 document.getElementById('modeChoices').before(label);
 const it=()=>window.MezzoLocale?.code==='it';
 label.textContent=it()?'Collegamento a Cherry…':'Connecting to Cherry…';
 for(const selector of ['[data-mode-select="arcade"]','#monthlyBuy','#monthlyCheck','#connectWallet']){
  const element=document.querySelector(selector);if(element)element.hidden=true;
 }
 void (async()=>{
  try{
   const [{CherryMiniApp,isInsideCherry},{connectCherry}]=await Promise.all([import('./vendor/cherry.mjs'),import('./cherry-wallet.mjs')]);
   if(!isInsideCherry({strict:true}))throw Error();
   cherryProvider=await connectCherry({app:new CherryMiniApp({strict:true}),changed:()=>{changed();label.textContent=it()?'Wallet scollegato. Riapri il gioco da Cherry.':'Wallet disconnected. Reopen the game from Cherry.';}});
   label.textContent=it()?'Wallet Cherry collegato':'Cherry wallet connected';
   changed();document.dispatchEvent(new Event('mezzopollo:cherry-ready'));
  }catch{label.textContent=it()?'Apri Mezzopollo dalla sua scheda mini app in Cherry.':'Open MezzoPollo from its mini app listing in Cherry.';}
 })();
}
