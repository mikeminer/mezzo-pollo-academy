import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRecoveryHandler} from '../api/monthly-recovery.mjs';
const f=JSON.parse(await readFile(new URL('fixtures/monthly-unsigned-simulation.json',import.meta.url)));
test('recovery requires finalized expiry, invalid blockhash and absence at a sufficiently recent slot',async()=>{
 for(const [height,valid,exists,expected]of [[f.lastValidBlockHeight,false,false,false],[f.lastValidBlockHeight+1,true,false,false],[f.lastValidBlockHeight+1,false,true,false],[f.lastValidBlockHeight+1,false,false,true]]){
  const h=createRecoveryHandler({env:{SUBSCRIPTION_SOLANA_RPC_URL:'https://mainnet.helius-rpc.com/?api-key=test-only'},connect:()=>({getBlockHeight:async()=>height,isBlockhashValid:async()=>({value:valid,context:{slot:123}}),getAccountInfoAndContext:async(_address,options)=>{assert.equal(options.commitment,'finalized');assert.equal(options.minContextSlot,123);return {value:exists?{}:null};}})});
  let data;const res={setHeader(){},end:s=>data=JSON.parse(s)};await h({method:'POST',headers:{'content-type':'application/json'},body:{wallet:f.wallet,deposit:f.deposit,lockId:f.lockId,blockhash:f.blockhash,lastValidBlockHeight:f.lastValidBlockHeight}},res);assert.equal(res.statusCode,200);assert.equal(data.retrySafe,expected);
 }
});
