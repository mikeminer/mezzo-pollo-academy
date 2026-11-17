import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateMonthlyTransaction} from '../monthly-transaction.mjs';
import {createMonthlyClient} from '../monthly-client.mjs';
import {createLockAccess} from '../monthly-access.mjs';
import {createMonthlyHandler} from '../api/monthly.mjs';
import {VersionedTransaction,TransactionMessage,PublicKey,SystemProgram} from '@solana/web3.js';
const fixture=JSON.parse(await readFile(new URL('fixtures/monthly-unsigned-simulation.json',import.meta.url)));
const now=()=>fixture.createdAt+1;
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const record=()=>structuredClone(fixture);
function changed(fn){const r=record();const tx=VersionedTransaction.deserialize(Buffer.from(r.transaction,'base64'));const msg=TransactionMessage.decompile(tx.message);fn(msg);r.transaction=Buffer.from(new VersionedTransaction(msg.compileToV0Message()).serialize()).toString('base64');return r;}
test('unsigned mainnet simulation fixture contains exact 0.2 SOL atomic purchase and 30-day subscription',()=>{assert.ok(validateMonthlyTransaction(fixture,fixture.wallet,now()));});
test('monthly validator rejects tampered price, mint, owner, amount, expiry, route and stale quote',()=>{
 for(const [key,value] of Object.entries({priceLamports:'200000001',mint:SystemProgram.programId.toBase58(),wallet:SystemProgram.programId.toBase58(),minimumRaw:'1',expiresAt:fixture.expiresAt+1,days:31,plan:'weekly',deposit:fixture.wallet,lockId:'65',route:'unknown',quoteExpiresAt:now()}))assert.throws(()=>validateMonthlyTransaction({...fixture,[key]:value},fixture.wallet,now()),key);
});
test('monthly validator rejects altered instructions, accounts, input, extra transfer and compute limits',()=>{
 const changes=[m=>m.instructions.push(SystemProgram.transfer({fromPubkey:new PublicKey(fixture.wallet),toPubkey:SystemProgram.programId,lamports:1})),m=>m.instructions[3].data[8]^=1,m=>m.instructions[3].data[16]^=1,m=>m.instructions[3].data[24]^=1,m=>m.instructions[3].keys[4].pubkey=SystemProgram.programId,m=>m.instructions[2].data[8]^=1,m=>m.instructions[2].data[16]^=1,m=>m.instructions[2].keys[2].pubkey=SystemProgram.programId,m=>m.instructions[0].data[1]^=1,m=>m.instructions.pop()];
 for(const f of changes)assert.throws(()=>validateMonthlyTransaction(changed(f),fixture.wallet,now()));
});
test('durable payment record precedes wallet handoff; unknown outcome cannot trigger another purchase',async()=>{
 const c=createMonthlyClient({storage:storage(),now});let calls=0;
 await assert.rejects(c.approve(record(),async fn=>{calls++;assert.equal(c.pending().status,'awaiting-wallet');throw Error('timeout');}));
 assert.equal(c.pending().status,'unknown');await assert.rejects(c.approve(record(),async()=>{calls++;}),/payment_pending/);assert.equal(calls,1);
});
test('storage failure prevents wallet handoff; account changes and authoritative rejection permit a new review',async()=>{
 const c=createMonthlyClient({storage:{getItem:()=>null,setItem:()=>{throw Error('quota');}},now});
 await assert.rejects(c.approve(record(),()=>assert.fail('must not hand off')),/quota/);
 for(const provider of [{publicKey:'different',isConnected:true},{publicKey:fixture.wallet,isConnected:true,isPhantom:true,signAndSendTransaction:()=>{throw Object.assign(Error('declined'),{code:4001});}}]){
  const next=createMonthlyClient({storage:storage(),now});await assert.rejects(next.approve(record(),fn=>fn(provider)));assert.equal(next.pending(),null);
 }
});
test('exact verified purchase is recovered without its signature; unrelated active subscription does not clear pending',async()=>{
 let locks=[];const c=createMonthlyClient({storage:storage(),now,fetchImpl:async()=>({ok:true,json:async()=>({wallet:fixture.wallet,mint:fixture.mint,ts:now(),activeLocks:locks})})});
 await assert.rejects(c.approve(record(),()=>{throw Error('lost');}));
 locks=[{address:'other',depositor:fixture.wallet,mint:fixture.mint,amount:fixture.minimumRaw,unlockAt:fixture.expiresAt}];assert.equal((await c.recover()).confirmed,false);assert.ok(c.pending());
 locks[0].address=fixture.deposit;assert.equal((await c.recover()).confirmed,true);assert.equal(c.pending(),null);
});
test('any positive verified subscription grants ten lives and expires at latest end, not amount threshold',async()=>{
 let time=fixture.createdAt,scheduled=[];
 const provider={isPhantom:true,isConnected:true,publicKey:fixture.wallet,connect:async()=>{},on(){},removeListener(){}};
 const controller=createLockAccess({getProvider:()=>provider,now:()=>time,timers:{setTimeout:(fn,ms)=>{scheduled.push({fn,ms});return fn;},clearTimeout:id=>{scheduled=scheduled.filter(t=>t.fn!==id);}},readEvidence:async()=>({wallet:fixture.wallet,mint:fixture.mint,ts:time,activeLocks:[{address:'a',depositor:fixture.wallet,mint:fixture.mint,amount:'1',createdAt:time-10,unlockAt:fixture.createdAt+5}]})});
 await controller.connect();assert.equal(controller.getState().eligible,true);assert.equal(controller.getState().livesPerGame,10);assert.equal(controller.getState().expiresAt,time+5);
 time+=5;scheduled.find(t=>t.ms===5000).fn();assert.equal(controller.getState().eligible,false);controller.destroy();
});
test('monthly route rejects missing secrets, cross-origin requests and untrusted parameters',async()=>{
 let calls=0;const h=createMonthlyHandler({env:{},prepare:()=>{calls++;}});
 async function req(body,origin='https://mezzopollo.it'){let result;const res={setHeader(){},end:s=>{result=JSON.parse(s);}};await h({method:'POST',headers:{'content-type':'application/json',origin},body},res);return [res.statusCode,result];}
 assert.equal((await req({wallet:fixture.wallet}))[0],503);assert.equal((await req({wallet:fixture.wallet},'https://evil.example'))[0],403);assert.equal((await req({wallet:fixture.wallet,rpcUrl:'https://evil.example'}))[0],400);assert.equal(calls,0);
});

test('every reviewed route account and account flag is validated',()=>{
 for(let i=0;i<18;i++)if(i!==7)assert.throws(()=>validateMonthlyTransaction(changed(m=>m.instructions[2].keys[i].pubkey=new PublicKey('11111111111111111111111111111111')),fixture.wallet,now()),String(i));
 assert.throws(()=>validateMonthlyTransaction(changed(m=>m.instructions[2].keys[0].isWritable=true),fixture.wallet,now()));
});

test('Cherry payment pins the attribution account and hands off the validated transaction once',async()=>{
 const reference=new PublicKey('CD8Ve27Fy5R7mqfFbvaQUSYdkB27Y6GTws5XLctjP3Ry');
 const add=(m,key)=>m.instructions[3].keys.push({pubkey:key,isSigner:false,isWritable:false});
 const cherry={...changed(m=>add(m,reference)),cherry:true};
 assert.ok(validateMonthlyTransaction(cherry,fixture.wallet,now()));
 assert.throws(()=>validateMonthlyTransaction({...record(),cherry:true},fixture.wallet,now()));
 assert.throws(()=>validateMonthlyTransaction({...changed(m=>add(m,new PublicKey(fixture.blockhash))),cherry:true},fixture.wallet,now()));
 const c=createMonthlyClient({storage:storage(),now});
 let calls=0;
 await c.approve(cherry,fn=>fn({isMezzoCherry:true,isConnected:true,publicKey:fixture.wallet,payMonthly:async tx=>{
  calls++; assert.equal(c.pending().status,'awaiting-wallet');
  assert.equal(Buffer.from(tx.serialize()).toString('base64'),cherry.transaction);
  return {signature:'1'.repeat(64)};
 }}));
 await assert.rejects(c.approve(cherry,()=>assert.fail()),/payment_pending/);
 assert.equal(calls,1);
});
