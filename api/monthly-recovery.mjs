import {Connection,PublicKey} from '@solana/web3.js';
import {lockAddress} from '../server/monthly-purchase.mjs';
const ORIGINS=new Set(['https://mezzopollo.it','https://www.mezzopollo.it','https://mezzo-pollo-academy.vercel.app']);
export function createRecoveryHandler({env=process.env,connect=url=>new Connection(url,{commitment:'finalized',disableRetryOnRateLimit:true,fetch:(url,opts)=>fetch(url,{...opts,signal:AbortSignal.timeout(6000)})})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
  const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
  try{
   if(req.headers?.origin&&!ORIGINS.has(req.headers.origin)||req.headers?.['sec-fetch-site']==='cross-site')return send(403,{error:'origin_not_allowed'});
   if(req.method!=='POST')return send(405,{error:'method_not_allowed'});
   if(!String(req.headers?.['content-type']).startsWith('application/json'))return send(400,{error:'invalid_request'});
   const p=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!p||JSON.stringify(p).length>700||!Number.isSafeInteger(p.lastValidBlockHeight)||p.lastValidBlockHeight<1||!/^([1-9]|[1-5][0-9]|6[0-4])$/.test(p.lockId))return send(400,{error:'invalid_request'});
   const wallet=new PublicKey(p.wallet),blockhash=new PublicKey(p.blockhash).toBase58();if(!PublicKey.isOnCurve(wallet.toBytes()))return send(400,{error:'invalid_request'});
   const address=lockAddress(wallet,Number(p.lockId));if(address.toBase58()!==p.deposit)return send(400,{error:'invalid_request'});
   const u=new URL(env.SUBSCRIPTION_SOLANA_RPC_URL);if(u.protocol!=='https:'||u.hostname!=='mainnet.helius-rpc.com'||!u.searchParams.get('api-key'))throw Error();
   const conn=connect(u.href),height=await conn.getBlockHeight('finalized');
   if(height<=p.lastValidBlockHeight)return send(200,{retrySafe:false});
   const validity=await conn.isBlockhashValid(blockhash,{commitment:'finalized'});
   if(validity.value)return send(200,{retrySafe:false});
   const account=await conn.getAccountInfoAndContext(address,{commitment:'finalized',minContextSlot:validity.context.slot});
   // Both facts are authoritative: transaction lifetime has ended and its exact
   // deposit is absent at a finalized slot at/after the invalid-blockhash read.
   return send(200,{retrySafe:account.value===null,wallet:wallet.toBase58(),deposit:address.toBase58(),blockhash,finalizedHeight:height,lastValidBlockHeight:p.lastValidBlockHeight});
  }catch{return send(503,{error:'verification_unavailable'});}
 };
}
export default createRecoveryHandler();
