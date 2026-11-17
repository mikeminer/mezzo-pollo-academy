import {neon} from '@neondatabase/serverless';
import {Community} from '../server/community.mjs';
let service=null;
export default async function(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
 try{
  if(req.headers?.origin&&!['https://mezzopollo.it','https://www.mezzopollo.it','https://mezzo-pollo-academy.vercel.app'].includes(req.headers.origin)||req.headers?.['sec-fetch-site']==='cross-site')return send(403,{error:'origin_not_allowed'});
  if(!['GET','POST'].includes(req.method))return send(405,{error:'method_not_allowed'});
  const database=process.env.ARCADE_DATABASE_URL||process.env.DATABASE_URL,rpcUrl=process.env.SUBSCRIPTION_SOLANA_RPC_URL;
  if(!database||!rpcUrl)throw Error('community_unavailable');
  if(!service){const next=new Community({sql:neon(database),rpcUrl});await next.ready();service=next;}
  if(req.method==='GET')return send(200,{scores:await service.list(),scoreAuthority:'player-reported'});
  if(!String(req.headers?.['content-type']).startsWith('application/json')||Number(req.headers?.['content-length']||0)>1500)return send(400,{error:'invalid_request'});
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!b||JSON.stringify(b).length>1500)throw Error('invalid_request');
  // Reuse the durable per-IP arcade rate budget already provisioned in this project.
  const {PostgresStore}=await import('../server/arcade-store.mjs');
  const ip=String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown');
  await new PostgresStore(service.sql).rateLimit(`community:${ip}`,12);
  if(b.action==='challenge')return send(200,await service.challenge(b));
  if(b.action==='publish')return send(200,await service.publish(b));
  return send(400,{error:'invalid_action'});
 }catch(e){const safe=['invalid_score','subscription_required','invalid_signature','challenge_expired'].includes(e.message)?e.message:'community_unavailable';return send(503,{error:safe});}
}
