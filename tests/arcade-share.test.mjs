import test from 'node:test';import assert from 'node:assert/strict';
import {arcadeTweetUrl} from '../arcade-share.mjs';
test('X sharing uses the actual Arcade score and required hashtag without posting automatically',()=>{
 const u=new URL(arcadeTweetUrl({score:1234,tier:'medium'}));assert.equal(u.origin,'https://x.com');assert.equal(u.searchParams.get('hashtags'),'mezzopollo');assert.match(u.searchParams.get('text'),/1234/);assert.equal(u.searchParams.get('url'),'https://mezzopollo.it/');
 assert.throws(()=>arcadeTweetUrl({score:-1,tier:'medium'}));assert.throws(()=>arcadeTweetUrl({score:10,tier:'subscription'}));
});
