import {prepareMonthly} from '../server/monthly-purchase.mjs';
const ORIGINS=new Set(['https://mezzopollo.it','https://www.mezzopollo.it','https://mezzo-pollo-academy.vercel.app']);
const SAFE=new Set(['invalid_wallet','invalid_slippage','route_unavailable','token_unavailable','subscription_slots_full','insufficient_sol','simulation_failed','quote_too_small','transaction_too_large','fee_unavailable']);
export function createMonthlyHandler({env=process.env,prepare=prepareMonthly,now=Date.now}={}){
 let busy=0,windowStart=0,count=0;
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
  if(req.headers?.origin&&!ORIGINS.has(req.headers.origin)||req.headers?.['sec-fetch-site']==='cross-site')return send(403,{error:'origin_not_allowed'});
  if(req.method!=='POST')return send(405,{error:'method_not_allowed'});
  if(!String(req.headers?.['content-type']).startsWith('application/json')||Number(req.headers?.['content-length']||0)>1024)return send(400,{error:'invalid_request'});
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body||Object.keys(body).some(k=>!['wallet','slippageBps'].includes(k))||!/^\w{32,44}$/.test(body.wallet)||JSON.stringify(body).length>1024)throw Error();
  }catch{return send(400,{error:'invalid_request'});}
  let rpcUrl;try{const u=new URL(env.SUBSCRIPTION_SOLANA_RPC_URL);if(u.protocol!=='https:'||u.hostname!=='mainnet.helius-rpc.com'||!u.searchParams.get('api-key'))throw Error();rpcUrl=u.href;}catch{return send(503,{error:'purchase_unavailable'});}
  if(now()-windowStart>=60000){count=0;windowStart=now();}if(++count>20||busy>=4){res.setHeader('Retry-After','30');return send(429,{error:'retry_later'});}
  busy++;
  try{return send(200,await prepare(body,{rpcUrl}));}catch(e){return send(503,{error:SAFE.has(e.code)?e.code:'purchase_unavailable'});}finally{busy--;}
 };
}
export default createMonthlyHandler();
