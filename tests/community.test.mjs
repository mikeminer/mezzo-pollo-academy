import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import {Community} from '../server/community.mjs';
import {scoreMessage,cherryProfile} from '../community-protocol.mjs';
function setup(){
 const keys=generateKeyPairSync('ed25519'),wallet=new PublicKey(keys.publicKey.export({type:'spki',format:'der'}).subarray(-32)).toBase58();let active=true;const challenges=new Map();let published=null;
 const sql={query:async(q,p)=>{
  if(q.startsWith('INSERT INTO public.mezzopollo_social_challenges')){challenges.set(p[0],{id:p[0],wallet:p[1],score:p[2],message:p[3],expires_at:p[4]});return [];}
  if(q.startsWith('SELECT *'))return challenges.has(p[0])?[challenges.get(p[0])]:[];
  if(q.startsWith('WITH consumed')){const c=challenges.get(p[0]);if(!c)return [];challenges.delete(p[0]);published=c;return [{wallet:c.wallet}];}
  return [];
 }};
 const service=new Community({sql,now:()=>2000000000000,read:async()=>({activeLocks:active?[{amount:'1',unlockAt:2000000100}]:[]})});
 return {service,wallet,keys,challenges,get published(){return published;},set active(v){active=v;}};
}
test('Cherry links are wallet-scoped and reject injected paths',()=>{assert.match(cherryProfile('11111111111111111111111111111111'),/^https:\/\/chat.cherry.fun\/solana\//);assert.throws(()=>cherryProfile('javascript:alert(1)'));});
test('social publication needs active subscription and a valid signature for exact score and nonce; replay rejected',async()=>{
 const h=setup();const c=await h.service.challenge({wallet:h.wallet,score:123});assert.equal(c.message,scoreMessage(c));
 const signature=sign(null,Buffer.from(c.message),h.keys.privateKey).toString('base64');
 const bad=sign(null,Buffer.from(c.message.replace('Score: 123','Score: 124')),h.keys.privateKey).toString('base64');await assert.rejects(h.service.publish({id:c.id,signature:bad}),/invalid_signature/);
 assert.equal((await h.service.publish({id:c.id,signature})).published,true);assert.equal(h.published.score,123);await assert.rejects(h.service.publish({id:c.id,signature}),/challenge_expired/);
});
test('expired subscription blocks both challenge and publication, even after signing',async()=>{
 const h=setup();const c=await h.service.challenge({wallet:h.wallet,score:7});h.active=false;
 await assert.rejects(h.service.challenge({wallet:h.wallet,score:7}),/subscription_required/);
 await assert.rejects(h.service.publish({id:c.id,signature:sign(null,Buffer.from(c.message),h.keys.privateKey).toString('base64')}),/subscription_required/);assert.equal(h.published,null);
});
