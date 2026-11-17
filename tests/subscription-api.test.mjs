import test from 'node:test';
import assert from 'node:assert/strict';
import {createSubscriptionHandler} from '../api/subscription.mjs';
import {readSubscriptionEvidence} from '../subscription-client.mjs';
const wallet='11111111111111111111111111111111';
const rpc='https://mainnet.helius-rpc.com/?api-key=test-only';
const evidence={wallet,ts:2000000000,activeLocks:[]};
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=JSON.parse(body)}};}
async function call(handler,url=`/api/subscription?wallet=${wallet}`,method='GET',headers={}){const res=response();await handler({url,method,headers},res);return res;}
test('server uses configured Helius only, deduplicates and preserves evidence freshness',async()=>{
 let count=0;const handler=createSubscriptionHandler({env:{SUBSCRIPTION_SOLANA_RPC_URL:rpc},read:async(w,options)=>{count++;assert.equal(w,wallet);assert.equal(options.rpcUrl,rpc);return evidence;},now:()=>2000000000000});
 const results=await Promise.all([call(handler),call(handler)]);assert.equal(count,1);assert.equal(results[0].statusCode,200);assert.deepEqual(results[0].body,evidence);
 await call(handler);assert.equal(count,1);assert.ok(!JSON.stringify(results).includes('test-only'));
});
test('missing configuration, unsafe upstreams, unexpected input and RPC errors fail safely',async()=>{
 for(const env of [{},{SUBSCRIPTION_SOLANA_RPC_URL:'https://example.com/?api-key=x'}]){const h=createSubscriptionHandler({env,read:()=>{throw Error('must not call')}});assert.equal((await call(h)).statusCode,503);}
 const h=createSubscriptionHandler({env:{SUBSCRIPTION_SOLANA_RPC_URL:rpc},read:()=>{throw Error(rpc)}});
 assert.equal((await call(h,'/api/subscription?wallet=bad')).statusCode,400);
 assert.equal((await call(h,`/api/subscription?wallet=${wallet}&url=elsewhere`)).statusCode,400);
 assert.equal((await call(h,undefined,'POST')).statusCode,405);
 assert.equal((await call(h,undefined,'GET',{origin:'https://evil.example'})).statusCode,403);
 const result=await call(h);assert.equal(result.statusCode,503);assert.ok(!JSON.stringify(result).includes('test-only'));
});
test('client calls same-origin endpoint and propagates rate limits',async()=>{
 const result=await readSubscriptionEvidence(wallet,{fetchImpl:async(url)=>{assert.equal(url,`/api/subscription?wallet=${wallet}`);return {ok:true,json:async()=>evidence}}});assert.deepEqual(result,evidence);
 await assert.rejects(readSubscriptionEvidence(wallet,{fetchImpl:async()=>({ok:false,status:429})}),e=>e.retryAfterSeconds===30);
});
