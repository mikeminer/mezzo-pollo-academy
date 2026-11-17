import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocales, GAME_ROOT } from '../scripts/build-locales.mjs';

test('all regional profiles advertise Tutorial and the monthly price',async()=>{const {packs}=await buildLocales(GAME_ROOT,{check:true});for(const [code,pack] of Object.entries(packs)){assert.ok(pack.mode.tutorial,code);assert.match(pack.mode.subscriptionDetail,/0[.,]2 SOL/,code);assert.match(pack.static[16],/30/,code);assert.doesNotMatch(pack.static[16],/10,000,000|timelock/i,code);}});

test('current Arcade copy offers only the three active prices in all languages', async () => {
  const { packs } = await buildLocales(GAME_ROOT, { check: true });
  for (const [code, pack] of Object.entries(packs)) {
    const currentCopy = [pack.arcade.how, pack.arcade.detail, pack.mode.hardDetail,
      pack.native.arcade, pack.static[15], pack.demo.lives].join('\n');
    assert.doesNotMatch(currentCopy, /0[.,]001\s*SOL/, code);
    for (const price of [/0[.,]002\s*SOL/, /0[.,]003\s*SOL/, /0[.,]01\s*SOL/]) {
      assert.match(pack.arcade.how, price, code);
    }
    assert.ok(pack.arcade.hard, `${code}: preserve the legacy receipt label`);
  }
});
