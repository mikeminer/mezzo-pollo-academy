import test from 'node:test';
import assert from 'node:assert/strict';
import {connectCherry} from '../cherry-wallet.mjs';
test('Cherry wallet requires verified identity and revokes access on wallet change',async()=>{
 const events={};
 const app={init:async()=>{},paymentWallet:'wallet-A',launchToken:'test-token',wallet:{signMessage:async()=>new Uint8Array(64)},on:(name,fn)=>events[name]=fn,onContextChange:fn=>events.context=fn};
 await assert.rejects(connectCherry({app,fetchImpl:async()=>({ok:true,json:async()=>({wallet:'different'})})}),/cherry_wallet_changed/);
 const provider=await connectCherry({app,fetchImpl:async(path,options)=>{
  assert.equal(path,'/api/cherry-launch');assert.equal(options.headers.Authorization,'Bearer test-token');
  return {ok:true,json:async()=>({wallet:'wallet-A'})};
 }});
 assert.equal(provider.publicKey,'wallet-A');
 assert.equal((await provider.signMessage(new Uint8Array([1]))).signature.length,64);
 let revoked=false;provider.on('disconnect',()=>revoked=true);
 app.paymentWallet='wallet-B';events.context();
 assert.equal(revoked,true);assert.equal(provider.publicKey,null);
 await assert.rejects(provider.signMessage(new Uint8Array([1])),/wallet_changed/);
});
