import {CHERRY_APP_ID} from '../server/cherry-config.mjs';
import {verifyLaunchToken} from '@cherrydotfun/miniapp-sdk';
import {PublicKey} from '../vendor/solana-transaction.mjs';
export default async function(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type','application/json');
 const send=(code,body)=>{res.statusCode=code;res.end(JSON.stringify(body));};
 if(req.method!=='POST')return send(405,{error:'method_not_allowed'});
 if(req.headers?.origin&&req.headers.origin!=='https://mezzopollo.it')return send(403,{error:'origin_not_allowed'});
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
