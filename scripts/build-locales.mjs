import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GAME_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STATIC_COUNT = 49;
export const MIN_WORDS = 24;
export const MAX_HALF_GRAPHEMES = 8;
export const MAX_WORD_GRAPHEMES = 14;
const META_KEYS = ['locale', 'country', 'language', 'flag', 'dir'];
const PLURAL_KEYS = ['zero', 'one', 'two', 'few', 'many', 'other'];
const SPECIAL_KEYS = new Set(['meta', 'life', 'words']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };

function exactKeys(value, keys, path) {
  if (!isObject(value)) fail(path, 'expected an object');
  const missing = keys.filter(key => !Object.hasOwn(value, key));
  const unknown = Object.keys(value).filter(key => !keys.includes(key));
  if (missing.length) fail(path, `missing keys: ${missing.join(', ')}`);
  if (unknown.length) fail(path, `unknown keys: ${unknown.join(', ')}`);
}

function text(value, path) {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'expected nonempty text');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)) {
    fail(path, 'control characters and directional overrides are not allowed');
  }
}

function placeholders(value, path) {
  const matches = value.match(/\{[^{}]*\}/g) || [];
  if (/[{}]/.test(value.replace(/\{[^{}]*\}/g, ''))) fail(path, 'malformed placeholder');
  return matches.sort();
}

function tags(value, path) {
  const matches = value.match(/<\/?[bi]>/g) || [];
  if (/[<>]/.test(value.replace(/<\/?[bi]>/g, ''))) fail(path, 'only plain <b> and <i> HTML tags are allowed');
  const stack = [];
  for (const tag of matches) {
    if (tag[1] === '/') {
      if (stack.pop() !== tag[2]) fail(path, 'unbalanced HTML tags');
    } else stack.push(tag[1]);
  }
  if (stack.length) fail(path, 'unbalanced HTML tags');
  return matches;
}

function sameList(a, b) { return a.length === b.length && a.every((value, i) => value === b[i]); }

function validateShape(value, reference, path) {
  if (typeof reference === 'string') {
    text(value, path);
    if (!sameList(placeholders(value, path), placeholders(reference, path))) fail(path, 'placeholder names/counts must exactly match English');
    if (!sameList(tags(value, path), tags(reference, path))) fail(path, 'HTML tags must match the English tag sequence');
  } else if (Array.isArray(reference)) {
    if (!Array.isArray(value) || value.length !== reference.length) fail(path, `expected an array of ${reference.length} entries`);
    reference.forEach((item, i) => validateShape(value[i], item, `${path}[${i}]`));
  } else if (isObject(reference)) {
    exactKeys(value, Object.keys(reference), path);
    for (const key of Object.keys(reference)) validateShape(value[key], reference[key], `${path}.${key}`);
  } else fail(path, 'unsupported schema value');
}

export function validateRegistry(registry) {
  if (!Array.isArray(registry) || !registry.length) fail('registry', 'expected a nonempty ordered array of codes');
  const seen = new Set();
  for (const code of registry) {
    if (typeof code !== 'string' || !/^(?:global|[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/.test(code)) fail('registry', `invalid language code: ${String(code)}`);
    if (seen.has(code.toLowerCase())) fail('registry', `duplicate code: ${code}`);
    seen.add(code.toLowerCase());
    if (code !== 'global' && !Intl.PluralRules.supportedLocalesOf([code]).length) fail('registry', `unsupported language code: ${code}`);
  }
  if (!registry.includes('en')) fail('registry', 'English (en) is required as the schema reference');
  return registry;
}

export function validateMetadata(code, meta) {
  exactKeys(meta, META_KEYS, `${code}.meta`);
  for (const key of META_KEYS) {
    text(meta[key], `${code}.meta.${key}`);
    if (tags(meta[key], `${code}.meta.${key}`).length) fail(`${code}.meta.${key}`, 'metadata must be plain text');
  }
  let locale;
  try { locale = new Intl.Locale(meta.locale); } catch { fail(`${code}.meta.locale`, 'invalid locale'); }
  if (!Intl.PluralRules.supportedLocalesOf([meta.locale]).length) fail(`${code}.meta.locale`, 'locale is unavailable in this Node runtime');
  if (locale.toString() !== meta.locale || !locale.region) fail(`${code}.meta.locale`, 'use a canonical locale with an explicit region');
  if (code === 'global') {
    if (meta.locale !== 'en-001' || meta.flag !== 'global') fail(`${code}.meta`, 'global requires locale en-001 and flag global');
  } else {
    const codeLocale = new Intl.Locale(code);
    if (locale.language !== codeLocale.language || (codeLocale.region && codeLocale.region !== locale.region)) fail(`${code}.meta.locale`, 'locale must match the registry code language and any explicit region');
    if (!/^[a-z]{2}$/.test(meta.flag) || meta.flag !== locale.region.toLowerCase()) fail(`${code}.meta.flag`, 'flag must be the lowercase two-letter locale region');
  }
  const direction = (typeof locale.getTextInfo === 'function' ? locale.getTextInfo() : locale.textInfo)?.direction;
  if (!direction) fail(`${code}.meta.dir`, 'this Node runtime does not provide Intl locale direction');
  if (meta.dir !== direction) fail(`${code}.meta.dir`, `expected ${direction} for ${meta.locale}`);
  return locale;
}

export function validateWords(words, locale, path = 'words') {
  if (!Array.isArray(words) || words.length < MIN_WORDS) fail(path, `at least ${MIN_WORDS} word triples are required`);
  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  const seen = new Set();
  words.forEach((triple, i) => {
    const itemPath = `${path}[${i}]`;
    if (!Array.isArray(triple) || triple.length !== 3) fail(itemPath, 'expected [prefix, suffix, clue]');
    triple.forEach((item, j) => {
      text(item, `${itemPath}[${j}]`);
      if (tags(item, `${itemPath}[${j}]`).length) fail(itemPath, 'words and clues must be plain text');
      if (placeholders(item, itemPath).length) fail(itemPath, 'word triples cannot contain placeholders');
    });
    const [prefix, suffix] = triple, word = prefix + suffix;
    if (word !== word.trim() || / {2}/.test(word)) fail(itemPath, 'word spacing must be single internal spaces');
    for (const half of [prefix, suffix]) {
      if (!/^[\p{L}\p{M}\u200c\u200d ]+$/u.test(half) || !/\p{L}/u.test(half)) fail(itemPath, 'word halves must contain letters, marks, necessary joiners or word spaces only');
      if ([...segmenter.segment(half)].length > MAX_HALF_GRAPHEMES) fail(itemPath, `a gate half exceeds ${MAX_HALF_GRAPHEMES} graphemes`);
    }
    const segments = [...segmenter.segment(word)];
    if (!segments.some(segment => segment.index === prefix.length)) fail(itemPath, 'split must fall on a full-word grapheme boundary');
    if (word !== word.normalize('NFC')) fail(itemPath, 'word must use NFC normalization');
    if (segments.length > MAX_WORD_GRAPHEMES) fail(itemPath, `word exceeds ${MAX_WORD_GRAPHEMES} graphemes`);
    if (segments.some(segment => segment.segment !== ' ' && !/^\p{L}/u.test(segment.segment))) fail(itemPath, 'each word grapheme must start with a letter');
    const identity = word.toLocaleLowerCase(locale).normalize('NFC');
    if (seen.has(identity)) fail(itemPath, `duplicate complete word: ${word}`);
    seen.add(identity);
  });
  const suffixes = new Set(words.map(([, suffix]) => suffix.toLocaleLowerCase(locale).normalize('NFC')));
  for (const [i, [prefix, suffix]] of words.entries()) {
    const answer = suffix.toLocaleLowerCase(locale).normalize('NFC');
    const wrong = [...suffixes].filter(candidate => candidate !== answer && !seen.has((prefix + candidate).toLocaleLowerCase(locale).normalize('NFC')));
    if (wrong.length < 2) fail(`${path}[${i}]`, 'each prefix needs at least two distinct wrong suffixes that do not form another known word');
  }
  return words;
}

export function validateSelectors(selectors, reference) {
  if (!Array.isArray(selectors) || selectors.length !== STATIC_COUNT) fail('selectors', `expected exactly ${STATIC_COUNT} entries`);
  const seen = new Set();
  selectors.forEach((entry, i) => {
    exactKeys(entry, ['selector', 'kind'], `selectors[${i}]`);
    text(entry.selector, `selectors[${i}].selector`);
    if (!['text', 'html', 'aria-label', 'alt'].includes(entry.kind)) fail(`selectors[${i}].kind`, 'unsupported DOM destination');
    const identity = `${entry.selector}\0${entry.kind}`;
    if (seen.has(identity)) fail(`selectors[${i}]`, 'duplicate selector and destination');
    seen.add(identity);
    if (entry.kind !== 'html' && tags(reference.static[i], `en.static[${i}]`).length) fail(`selectors[${i}]`, 'markup requires an html destination');
  });
  return selectors;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

export function validatePack(code, pack, reference) {
  exactKeys(pack, Object.keys(reference), code);
  const locale = validateMetadata(code, pack.meta);
  if (!isObject(pack.life)) fail(`${code}.life`, 'expected a plural-category object');
  for (const category of Object.keys(pack.life)) {
    if (!PLURAL_KEYS.includes(category)) fail(`${code}.life`, `unknown plural category: ${category}`);
    text(pack.life[category], `${code}.life.${category}`);
    if (tags(pack.life[category], `${code}.life.${category}`).length || placeholders(pack.life[category], `${code}.life.${category}`).length) fail(`${code}.life.${category}`, 'life labels must be plain text');
  }
  const categories = new Intl.PluralRules(pack.meta.locale).resolvedOptions().pluralCategories;
  for (const category of categories) if (!Object.hasOwn(pack.life, category)) fail(`${code}.life`, `missing Intl plural category: ${category}`);
  if (!Array.isArray(pack.static) || pack.static.length !== STATIC_COUNT) fail(`${code}.static`, `expected exactly ${STATIC_COUNT} entries`);
  for (const key of Object.keys(reference)) {
    if (!SPECIAL_KEYS.has(key)) validateShape(pack[key], reference[key], `${code}.${key}`);
  }
  validateWords(pack.words, pack.meta.locale, `${code}.words`);
  if (locale.language !== 'en') {
    for (const key of Object.keys(reference).filter(key => !['meta', 'life'].includes(key))) {
      if (JSON.stringify(canonical(pack[key])) === JSON.stringify(canonical(reference[key]))) fail(`${code}.${key}`, 'entire group is an untranslated English copy');
    }
  }
  return pack;
}

function merge(base, override) {
  if (!isObject(base) || !isObject(override)) return structuredClone(override);
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(override)) {
    Object.defineProperty(result, key, { value: Object.hasOwn(base, key) ? merge(base[key], value) : structuredClone(value), enumerable: true, writable: true, configurable: true });
  }
  return result;
}

export function resolveLocales(registry, sources) {
  validateRegistry(registry);
  if (!isObject(sources)) fail('locales', 'expected a code-to-source object');
  const resolved = new Map(), visiting = new Set();
  function visit(code) {
    if (resolved.has(code)) return resolved.get(code);
    if (visiting.has(code)) fail(code, `inheritance cycle: ${[...visiting, code].join(' -> ')}`);
    if (!Object.hasOwn(sources, code) || !isObject(sources[code])) fail(code, 'missing locale source');
    visiting.add(code);
    const source = sources[code];
    let pack;
    if (Object.hasOwn(source, 'extends')) {
      if (code === 'en') fail(code, 'the English schema reference cannot inherit');
      if (typeof source.extends !== 'string' || !registry.includes(source.extends)) fail(code, `missing registered parent: ${String(source.extends)}`);
      exactKeys(source.meta, META_KEYS, `${code}.meta`);
      const { extends: parent, ...override } = source;
      pack = merge(visit(parent), override);
    } else pack = structuredClone(source);
    visiting.delete(code);
    resolved.set(code, pack);
    return pack;
  }
  return Object.fromEntries(registry.map(code => [code, visit(code)]));
}

export function validateLocales(registry, sources, selectors) {
  const packs = resolveLocales(registry, sources);
  const reference = packs.en;
  if (!Array.isArray(reference.static) || reference.static.length !== STATIC_COUNT) fail('en.static', `expected exactly ${STATIC_COUNT} entries`);
  validateSelectors(selectors, reference);
  for (const code of registry) validatePack(code, packs[code], reference);
  return packs;
}

export function renderBundle(registry, packs, selectors) {
  const serialise = value => JSON.stringify(value, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const ordered = Object.fromEntries(registry.map(code => [code, canonical(packs[code])]));
  return '// Generated by scripts/build-locales.mjs. Edit locales/*.json, then rebuild.\n' +
    `window.MezzoTranslations = ${serialise(ordered)};\n` +
    `window.MezzoSelectors = ${serialise(selectors.map(canonical))};\n`;
}

export async function loadLocaleSources(root = GAME_ROOT) {
  const readJSON = async name => {
    try { return JSON.parse(await readFile(join(root, 'locales', name), 'utf8')); }
    catch (error) { throw new Error(`locales/${name}: ${error.message}`, { cause: error }); }
  };
  const [registry, selectors] = await Promise.all([readJSON('registry.json'), readJSON('selectors.json')]);
  validateRegistry(registry);
  const sources = Object.fromEntries(await Promise.all(registry.map(async code => [code, await readJSON(`${code}.json`)])));
  return { registry, sources, selectors };
}

export async function buildLocales(root = GAME_ROOT, { check = false } = {}) {
  const { registry, sources, selectors } = await loadLocaleSources(root);
  const packs = validateLocales(registry, sources, selectors);
  const output = renderBundle(registry, packs, selectors);
  const outputPath = join(root, 'language-packs.js');
  if (check) {
    let actual;
    try { actual = await readFile(outputPath, 'utf8'); }
    catch (error) { throw new Error('language-packs.js is missing; run node scripts/build-locales.mjs', { cause: error }); }
    if (actual !== output) fail('language-packs.js', 'stale generated asset; run node scripts/build-locales.mjs');
  } else await writeFile(outputPath, output, 'utf8');
  return { registry, packs, selectors, output, outputPath };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build-locales.mjs [--check]');
    const result = await buildLocales(GAME_ROOT, { check: args.includes('--check') });
    console.log(`${args.includes('--check') ? 'Verified' : 'Built'} ${result.registry.length} locale packs in language-packs.js`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
