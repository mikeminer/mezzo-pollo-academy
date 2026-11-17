export async function connectCherry({app, fetchImpl=fetch, changed=()=>{}}) {
 await app.init();
 const address=()=>app.paymentWallet || app.wallet.publicKey?.toString();
 const response=await fetchImpl('/api/cherry-launch',{method:'POST',headers:{Authorization:`Bearer ${app.launchToken}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('cherry_launch_unavailable');
 const {wallet}=await response.json();
 if(wallet!==address())throw Error('cherry_wallet_changed');
 let connected=true;
 const listeners=new Map();
 const revoke=()=>{if(!connected)return;connected=false;for(const fn of listeners.get('disconnect')||[])fn();changed();};
 app.on('walletDisconnected',revoke);
 app.on('resumed',()=>{if(address()!==wallet)revoke();});
 app.onContextChange(()=>{if(address()!==wallet)revoke();});
 return Object.freeze({
  isMezzoCherry:true,
  get isConnected(){return connected&&address()===wallet;},
  get publicKey(){return this.isConnected?wallet:null;},
  async connect(){if(!this.isConnected)throw Error('cherry_reopen_required');return {publicKey:wallet};},
  disconnect:revoke,
  on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);},
  removeListener(event,fn){listeners.get(event)?.delete(fn);},
  async signMessage(bytes){if(!this.isConnected)throw Error('wallet_changed');const signature=await app.wallet.signMessage(bytes);if(!this.isConnected)throw Error('wallet_changed');return {signature};}
 });
}
