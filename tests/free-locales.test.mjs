import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocales, GAME_ROOT } from '../scripts/build-locales.mjs';

test('every regional choice explains Free and keeps sponsor actions distinct', async () => {
  const { packs } = await buildLocales(GAME_ROOT, { check: true });
  for (const [code, pack] of Object.entries(packs)) {
    assert.ok(pack.mode.freeStart && pack.mode.freeHint && pack.native.free, code);
    assert.match(pack.mode.freeHint, /OnlyFridge Club/, code);
    assert.equal(pack.sponsor.title, 'OnlyFridge Club', code);
    assert.match(pack.sponsor.body, /Solana dApp Store/, code);
    assert.notEqual(pack.sponsor.open, pack.sponsor.continue, code);
    assert.ok(pack.mode.title.includes(pack.mode.free), code);
  }
});

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
