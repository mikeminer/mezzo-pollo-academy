import {CHERRY_APP_ID} from '../server/cherry-config.mjs';
import {verifyLaunchToken} from '@cherrydotfun/miniapp-sdk';
import {PublicKey} from '../vendor/solana-transaction.mjs';
const ORIGINS=new Set(['https://mezzopollo.it','https://chat.cherry.fun','https://portal.cherry.fun']);
export default async function(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type','application/json');
 const send=(code,body)=>{res.statusCode=code;res.end(JSON.stringify(body));};
 const origin=req.headers?.origin;
 res.setHeader('Vary','Origin');
 if(origin&&!ORIGINS.has(origin))return send(403,{error:'origin_not_allowed'});
 if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
 if(req.method==='OPTIONS'){
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.statusCode=204;
  return res.end();
 }
 if(req.method!=='POST')return send(405,{error:'method_not_allowed'});
 const appId=CHERRY_APP_ID;
 if(!appId)return send(503,{error:'cherry_not_configured'});
 const token=req.headers?.authorization?.match(/^Bearer ([\w.-]{1,8192})$/)?.[1];
 if(!token)return send(401,{error:'invalid_launch'});
 try{
  const claims=await verifyLaunchToken(token,{appId});
  const wallet=claims.payment_wallet||claims.sub;
  if(new PublicKey(wallet).toBase58()!==wallet)throw Error();
  return send(200,{wallet});
 }catch{return send(401,{error:'invalid_launch'});}
}
