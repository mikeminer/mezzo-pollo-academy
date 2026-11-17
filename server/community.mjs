import {randomUUID,createPublicKey,verify} from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import {readVerifiedTimelocks} from '../timelock-chain.mjs';
import {scoreMessage} from '../community-protocol.mjs';
// Social score sharing only: a signature proves authorship, not honest gameplay.
export class Community {
 constructor({sql,rpcUrl,read=readVerifiedTimelocks,now=Date.now}){Object.assign(this,{sql,rpcUrl,read,now});}
 async query(text,values=[]){return this.sql.query(text,values,{fetchOptions:{signal:AbortSignal.timeout(8000)}});}
 async ready(){await this.query(`CREATE TABLE IF NOT EXISTS public.mezzopollo_social_scores(wallet text PRIMARY KEY,score bigint NOT NULL CHECK(score>=0),expires_at bigint NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())`);await this.query(`CREATE TABLE IF NOT EXISTS public.mezzopollo_social_challenges(id uuid PRIMARY KEY,wallet text NOT NULL,score bigint NOT NULL,message text NOT NULL,expires_at bigint NOT NULL)`);}
 async list(){return this.query(`SELECT wallet,score::text,updated_at FROM public.mezzopollo_social_scores WHERE expires_at>$1 ORDER BY score DESC,updated_at ASC LIMIT 100`,[Math.floor(this.now()/1000)]);}
 async challenge({wallet,score}){
  const key=new PublicKey(wallet);if(!PublicKey.isOnCurve(key.toBytes())||key.toBase58()!==wallet||!Number.isSafeInteger(score)||score<0||score>10000000)throw Error('invalid_score');
  const evidence=await this.read(wallet,{rpcUrl:this.rpcUrl});if(!evidence.activeLocks.some(d=>d.unlockAt>this.now()/1000&&BigInt(d.amount)>0n))throw Error('subscription_required');
  const id=randomUUID(),expiresAt=Math.floor(this.now()/1000)+300;
  const message=scoreMessage({wallet,score,id,expiresAt});
  await this.query('DELETE FROM public.mezzopollo_social_challenges WHERE expires_at<$1',[Math.floor(this.now()/1000)]);
  // One unconsumed challenge per wallet; global/IP limits are enforced by the route.
  await this.query('DELETE FROM public.mezzopollo_social_challenges WHERE wallet=$1',[wallet]);
  await this.query('INSERT INTO public.mezzopollo_social_challenges(id,wallet,score,message,expires_at) VALUES($1::uuid,$2,$3,$4,$5)',[id,wallet,score,message,expiresAt]);return {id,wallet,score,message,expiresAt};
 }
 async publish({id,signature}){
  if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id)||typeof signature!=='string'||signature.length>100)throw Error('invalid_signature');
  const c=(await this.query('SELECT * FROM public.mezzopollo_social_challenges WHERE id=$1::uuid AND expires_at>$2',[id,Math.floor(this.now()/1000)]))[0];if(!c)throw Error('challenge_expired');
  const sig=Buffer.from(signature,'base64');const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),new PublicKey(c.wallet).toBuffer()]),format:'der',type:'spki'});
  if(sig.length!==64||!verify(null,Buffer.from(c.message),key,sig))throw Error('invalid_signature');
  const evidence=await this.read(c.wallet,{rpcUrl:this.rpcUrl});const expiry=Math.max(0,...evidence.activeLocks.filter(d=>BigInt(d.amount)>0n).map(d=>d.unlockAt));if(expiry<=this.now()/1000)throw Error('subscription_required');
  const rows=await this.query(`WITH consumed AS (DELETE FROM public.mezzopollo_social_challenges WHERE id=$1::uuid AND expires_at>$2 RETURNING wallet,score) INSERT INTO public.mezzopollo_social_scores(wallet,score,expires_at) SELECT wallet,score,$3 FROM consumed ON CONFLICT(wallet) DO UPDATE SET score=GREATEST(mezzopollo_social_scores.score,EXCLUDED.score),expires_at=EXCLUDED.expires_at,updated_at=now() RETURNING wallet`,[id,Math.floor(this.now()/1000),expiry]);
  if(rows.length!==1)throw Error('challenge_expired');return {published:true};
 }
}
