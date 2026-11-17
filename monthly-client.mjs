import {validateMonthlyTransaction} from './monthly-transaction.mjs';
const KEY='mp_monthly_pending_v1';
export function createMonthlyClient({storage,fetchImpl=fetch,now=()=>Math.floor(Date.now()/1000)}){
 let busy=false;
 const pending=()=>{const value=storage.getItem(KEY);if(!value)return null;const p=JSON.parse(value);if(p.plan!=='monthly'||typeof p.wallet!=='string'||typeof p.deposit!=='string')throw Error('pending_invalid');return p;};
 const save=p=>storage.setItem(KEY,JSON.stringify(p));
 async function single(fn){if(busy)throw Error('payment_busy');busy=true;try{return await fn();}finally{busy=false;}}
 return {
  pending,
  prepare:(wallet,{cherry=false}={})=>single(async()=>{
   if(pending())throw Error('payment_pending');
   const r=await fetchImpl('/api/monthly',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wallet,slippageBps:200,...(cherry?{cherry:true}:{})}),cache:'no-store',signal:AbortSignal.timeout(45000)});
   const data=await r.json();if(!r.ok)throw Error(data.error||'purchase_unavailable');if(Boolean(data.cherry)!==cherry)throw Error('payment_mismatch');validateMonthlyTransaction(data,wallet,now());return data;
  }),
  approve:(record,withSession)=>single(async()=>{
   if(pending())throw Error('payment_pending');
   validateMonthlyTransaction(record,record.wallet,now());
   // Synchronous durable write precedes any wallet handoff. No automatic retries.
   save({...record,transaction:undefined,status:'awaiting-wallet'});
   try{
    const result=await withSession(async provider=>{
     if(provider.publicKey?.toString()!==record.wallet||provider.isConnected===false)throw Error('payer_mismatch');
     const tx=validateMonthlyTransaction(record,record.wallet,now());
     if(Boolean(record.cherry)!==(provider.isMezzoCherry===true))throw Error('payment_mismatch');
     if(provider.isMezzoCherry&&provider.payMonthly)return provider.payMonthly(tx);
     if(provider.isMezzoWebWallet&&provider.payMonthly)return provider.payMonthly(record);
     if(provider.isPhantom===true&&provider.signAndSendTransaction)return provider.signAndSendTransaction(tx);
     throw Error('unsupported_wallet');
    });
    if(typeof result?.signature!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(result.signature))throw Error('unknown_outcome');
    save({...pending(),signature:result.signature,status:'submitted'});return result;
   }catch(e){
    if(e?.code===4001||e?.code==='USER_REJECTED'||['payer_mismatch','unsupported_wallet','payment_mismatch'].includes(e.message))storage.removeItem(KEY);
    else save({...pending(),status:'unknown'});
    throw e;
   }
  }),
  recover:()=>single(async()=>{
   const p=pending();if(!p)return null;
   const r=await fetchImpl(`/api/subscription?wallet=${encodeURIComponent(p.wallet)}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('verification_unavailable');
   const evidence=await r.json();
   if(evidence.wallet!==p.wallet||evidence.mint!==p.mint||!Number.isSafeInteger(evidence.ts)||now()-evidence.ts>90||evidence.ts>now()+5)throw Error('verification_unavailable');
   const match=evidence.activeLocks?.find(d=>d.address===p.deposit&&d.depositor===p.wallet&&d.mint===p.mint&&d.amount===p.minimumRaw&&d.unlockAt===p.expiresAt);
   if(match){storage.removeItem(KEY);return {confirmed:true,evidence};}
   const response=await fetchImpl('/api/monthly-recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wallet:p.wallet,deposit:p.deposit,lockId:p.lockId,blockhash:p.blockhash,lastValidBlockHeight:p.lastValidBlockHeight}),cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(response.ok){const status=await response.json();if(status.retrySafe===true&&status.wallet===p.wallet&&status.deposit===p.deposit&&status.blockhash===p.blockhash&&status.lastValidBlockHeight===p.lastValidBlockHeight&&Number.isSafeInteger(status.finalizedHeight)&&status.finalizedHeight>p.lastValidBlockHeight){storage.removeItem(KEY);return {confirmed:false,retrySafe:true};}}
   return {confirmed:false};
  }),
 };
}
