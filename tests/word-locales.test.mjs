import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const context = {window:{}};
vm.runInNewContext(await readFile(new URL('../language-packs.js',import.meta.url),'utf8'), context);
const html = await readFile(new URL('../index.html',import.meta.url),'utf8');
const questionSource = html.slice(html.indexOf('function qParola('),html.indexOf('function randHalf('));

test('native word questions always offer one answer and two distinct incorrect gates at every level', () => {
  for (const [code,pack] of Object.entries(context.window.MezzoTranslations)) {
    const segmenter = new Intl.Segmenter(pack.meta.locale,{granularity:'grapheme'});
    const known = new Set(pack.words.map(([a,b])=>a+b));
    let selected = 0;
    const runtime = {
      L:{words:()=>pack.words,graphemes:text=>[...segmenter.segment(text)]},
      pick:pool=>pool[selected % pool.length], shuffle:values=>values,
    };
    vm.runInNewContext(questionSource,runtime);
    for (const level of [1,2,3]) for (selected=0;selected<pack.words.length;selected++) {
      const question = runtime.qParola(level);
      assert.ok(known.has(question.prefix + question.ans), code);
      assert.equal(question.wrong.length,2, code);
      assert.equal(new Set([question.ans,...question.wrong]).size,3, code);
      for (const answer of question.wrong) assert.ok(!known.has(question.prefix + answer),code);
      assert.ok(!question.text.includes('undefined'),code);
    }
  }
});
