import test from 'node:test';
import assert from 'node:assert/strict';
import {communityError} from '../community-errors.mjs';
import handler from '../api/community.mjs';
test('publication errors distinguish service, subscription, account and cancelled signature',()=>{
 assert.match(communityError(Error('community_unavailable'),'it'),/servizio/);
 assert.match(communityError(Error('subscription_required'),'it'),/abbonamento attivo/);
 assert.match(communityError(Error('wallet_changed'),'it'),/stesso wallet/);
 assert.match(communityError({code:4001},'it'),/annullata/);
 assert.match(communityError(Error('private upstream URL'),'it'),/non confermata/);
});
test('community API loads and reports missing configuration as JSON instead of crashing',async()=>{
 const saved=[process.env.ARCADE_DATABASE_URL,process.env.DATABASE_URL,process.env.SUBSCRIPTION_SOLANA_RPC_URL];
 delete process.env.ARCADE_DATABASE_URL;delete process.env.DATABASE_URL;delete process.env.SUBSCRIPTION_SOLANA_RPC_URL;
 try{let body;const response={setHeader(){},end:s=>body=JSON.parse(s)};await handler({method:'GET',headers:{}},response);assert.equal(response.statusCode,503);assert.equal(body.error,'community_not_configured');}
 finally{for(const [i,k]of ['ARCADE_DATABASE_URL','DATABASE_URL','SUBSCRIPTION_SOLANA_RPC_URL'].entries())if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];}
});
