import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GAME_ROOT, buildLocales, loadLocaleSources, renderBundle, resolveLocales,
  validateLocales, validateMetadata, validatePack, validateRegistry, validateWords,
} from '../scripts/build-locales.mjs';

const english = JSON.parse(await readFile(new URL('../locales/en.json', import.meta.url), 'utf8'));
const selectors = JSON.parse(await readFile(new URL('../locales/selectors.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
const meta = (locale, flag, dir = 'ltr') => ({ locale, flag, dir, country: 'Test country', language: 'Test language' });
const checkEnglish = value => validatePack('en', value, english);

test('every registered locale is complete and the committed offline bundle is current', async () => {
  const result = await buildLocales(GAME_ROOT, { check: true });
  assert.deepEqual(Object.keys(result.packs), result.registry);
  const sandbox = { window: {} };
  vm.runInNewContext(result.output, sandbox, { timeout: 1000 });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.MezzoTranslations)), result.packs);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.MezzoSelectors)), result.selectors);
  assert.deepEqual(Object.keys(sandbox.window.MezzoTranslations), result.registry);
});

test('registry rejects duplicate, unsafe, unsupported and missing reference codes', () => {
  for (const [registry, error] of [
    [['en', 'en'], /duplicate/], [['en', '../it'], /invalid/],
    [['en', 'xx'], /unsupported/], [['it'], /English/],
  ]) assert.throws(() => validateRegistry(registry), error);
});

test('recursive schema rejects unknown and missing keys, including tutorial arrays', () => {
  let pack = clone(english);
  pack.tutorial.surprise = 'Unexpected';
  assert.throws(() => checkEnglish(pack), /tutorial.*unknown keys.*surprise/);
  pack = clone(english);
  delete pack.access.check;
  assert.throws(() => checkEnglish(pack), /access.*missing keys.*check/);
  pack = clone(english);
  pack.tutorial.left.pop();
  assert.throws(() => checkEnglish(pack), /tutorial.left.*array of 2/);
  pack = clone(english);
  pack.static.pop();
  assert.throws(() => checkEnglish(pack), /static.*49/);
});

test('placeholders preserve names and exact multiplicity', () => {
  for (const value of ['Double?', 'Double {number}?', 'Double {n} {n}?', 'Double {n?']) {
    const pack = clone(english);
    pack.core.double = value;
    assert.throws(() => checkEnglish(pack), /placeholder/);
  }
  const pack = clone(english);
  pack.core.livesRemaining = 'Of {total}: {remaining} remain';
  assert.doesNotThrow(() => checkEnglish(pack));
});

test('HTML keeps the reference tags and refuses attributes, scripts and broken nesting', () => {
  for (const value of ['<b onclick="alert(1)">Move</b>', '<script>alert(1)</script>', '<b>Move<i> now</b></i>', 'No emphasis']) {
    const pack = clone(english);
    pack.static[10] = value;
    assert.throws(() => checkEnglish(pack), /HTML/);
  }
  const altered = clone(selectors);
  altered[0].kind = 'innerHTML';
  assert.throws(() => validateLocales(['en'], { en: english }, altered), /DOM destination/);
});

test('plural forms are derived from the actual Intl locale', () => {
  const pack = clone(english);
  delete pack.life.other;
  assert.throws(() => checkEnglish(pack), /plural category.*other/);
  pack.life.other = 'lives';
  pack.life.plural = 'lives';
  assert.throws(() => checkEnglish(pack), /unknown plural category/);
});

test('word sets require enough unique native words, short gates and safe grapheme boundaries', () => {
  assert.throws(() => validateWords(english.words.slice(0, 23), 'en-US'), /at least 24/);
  let words = clone(english.words);
  words[1] = clone(words[0]);
  assert.throws(() => validateWords(words, 'en-US'), /duplicate complete word/);
  words = clone(english.words);
  words[0] = ['CHIC', '', 'Bird'];
  assert.throws(() => validateWords(words, 'en-US'), /nonempty/);
  words = clone(english.words);
  words[0] = ['ABCDEFGHI', 'JK', 'Too long'];
  assert.throws(() => validateWords(words, 'en-US'), /gate half/);
  words = clone(english.words);
  words[0] = ['A', '\u0301B', 'Broken accent'];
  assert.throws(() => validateWords(words, 'en-US'), /grapheme boundary/);
  words = clone(english.words);
  words[0] = ['क्', 'ष', 'Broken conjunct'];
  assert.throws(() => validateWords(words, 'hi-IN'), /grapheme boundary/);
  words = clone(english.words);
  words[0] = ['CAF', 'É', 'Accent retained'];
  assert.doesNotThrow(() => validateWords(words, 'fr-FR'));
  words[0] = ['cá ', 'heo', 'Valid Vietnamese compound'];
  assert.doesNotThrow(() => validateWords(words, 'vi-VN'));
  words[0] = ['cá  ', 'heo', 'Repeated space'];
  assert.throws(() => validateWords(words, 'vi-VN'), /spacing/);
  words[0] = [' cá ', 'heo', 'Leading space'];
  assert.throws(() => validateWords(words, 'vi-VN'), /spacing/);
  words = Array.from({ length: 24 }, (_, i) => ['A', String.fromCharCode(65 + i), 'No possible wrong answer']);
  assert.throws(() => validateWords(words, 'en-US'), /two distinct wrong suffixes/);
});

test('metadata verifies RTL direction, explicit country flags, language and global exception', () => {
  assert.doesNotThrow(() => validateMetadata('ar', meta('ar-MA', 'ma', 'rtl')));
  assert.throws(() => validateMetadata('ar', meta('ar-MA', 'ma')), /expected rtl/);
  assert.throws(() => validateMetadata('en', meta('en-US', 'gb')), /flag/);
  assert.throws(() => validateMetadata('es-MX', meta('es-ES', 'es')), /explicit region/);
  assert.throws(() => validateMetadata('fr', meta('en-US', 'us')), /language/);
  assert.doesNotThrow(() => validateMetadata('global', meta('en-001', 'global')));
  assert.throws(() => validateMetadata('global', meta('en-US', 'us')), /en-001/);
});

test('a new language cannot silently ship an entire English group', () => {
  const copied = clone(english);
  copied.meta = meta('de-DE', 'de');
  copied.life = { one: 'Leben', other: 'Leben' };
  assert.throws(() => validatePack('de', copied, english), /core.*untranslated English copy/);
});

test('variants inherit maps, replace arrays, respect registry order and do not mutate sources', () => {
  const registry = ['global', 'en-GB', 'en'];
  const sources = {
    global: { extends: 'en', meta: meta('en-001', 'global') },
    'en-GB': { extends: 'en', meta: meta('en-GB', 'gb'), core: { ready: 'All set…' }, words: english.words.slice(0, 24) },
    en: clone(english),
  };
  const original = clone(sources);
  const packs = validateLocales(registry, sources, selectors);
  assert.deepEqual(Object.keys(packs), registry);
  assert.equal(packs['en-GB'].core.ready, 'All set…');
  assert.equal(packs['en-GB'].core.resume, english.core.resume);
  assert.equal(packs['en-GB'].words.length, 24);
  assert.deepEqual(sources, original);
  packs['en-GB'].core.resume = 'Changed';
  assert.equal(packs.en.core.resume, english.core.resume);
});

test('inheritance reports missing parents, cycles and incomplete variant metadata', () => {
  assert.throws(() => resolveLocales(['en', 'en-GB'], {
    en: english, 'en-GB': { extends: 'en-NG', meta: meta('en-GB', 'gb') },
  }), /missing registered parent/);
  assert.throws(() => resolveLocales(['en', 'en-GB', 'en-NG'], {
    en: english,
    'en-GB': { extends: 'en-NG', meta: meta('en-GB', 'gb') },
    'en-NG': { extends: 'en-GB', meta: meta('en-NG', 'ng') },
  }), /inheritance cycle/);
  assert.throws(() => resolveLocales(['en', 'en-GB'], {
    en: english, 'en-GB': { extends: 'en', meta: { locale: 'en-GB' } },
  }), /meta.*missing keys/);
});

test('generation is stable across source key order and safely embeds markup', () => {
  const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)])) : value;
  const output = renderBundle(['en'], { en: english }, selectors);
  assert.equal(output, renderBundle(['en'], { en: reverseKeys(english) }, reverseKeys(selectors)));
  assert.ok(!output.includes('<b>'));
  assert.ok(output.includes('\\u003cb>'));
});

test('build check fails for stale or missing output and succeeds after rebuilding', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mezzo-locales-'));
  try {
    await mkdir(join(root, 'locales'));
    await Promise.all([
      writeFile(join(root, 'locales', 'registry.json'), JSON.stringify(['en'])),
      writeFile(join(root, 'locales', 'selectors.json'), JSON.stringify(selectors)),
      writeFile(join(root, 'locales', 'en.json'), JSON.stringify(english)),
    ]);
    await assert.rejects(buildLocales(root, { check: true }), /missing/);
    const first = await buildLocales(root);
    assert.equal((await buildLocales(root, { check: true })).output, first.output);
    await writeFile(join(root, 'language-packs.js'), `${first.output}// stale\n`);
    await assert.rejects(buildLocales(root, { check: true }), /stale generated asset/);
    await buildLocales(root);
    await assert.doesNotReject(buildLocales(root, { check: true }));
    assert.deepEqual((await loadLocaleSources(root)).registry, ['en']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
