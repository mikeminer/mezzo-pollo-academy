# Locale sources

`registry.json` is the ordered array of language/region codes shown by the game. Every listed code has a matching UTF-8 `<code>.json` file. `en.json` defines the complete translation schema. `selectors.json` maps the 49 ordered `static` entries to their DOM destinations; keep that order intact.

Build the offline runtime asset from the game directory:

```sh
node scripts/build-locales.mjs
node scripts/build-locales.mjs --check
node --test tests/locales.test.mjs
```

Commit the source JSON and generated `language-packs.js` together. The generated script defines `window.MezzoTranslations` and `window.MezzoSelectors`, includes every resolved pack in registry order, and requires no runtime fetches. Generation has no timestamps or external dependencies. `--check` validates sources and fails if the generated file is missing or stale.

## Full packs

Translate every string in `core`, `static`, `mode`, `tutorial`, `access`, `demo` and `native`. Preserve all recursive keys and array lengths. Placeholders such as `{count}` retain their exact names and occurrence counts; they may move within a sentence. Keep the reference sequence of plain `<b>`/`<i>` tags. Other markup and attributes are rejected. An entire English group in a non-English pack is rejected, although individual proper names and shared technical terms may remain unchanged.

Metadata contains exactly `locale`, `country`, `language`, `flag`, and `dir`. Use a canonical language/region locale, native country/language labels, a lowercase two-letter country flag, and the actual `ltr`/`rtl` direction. A language-only registry code may choose its intended region (`pt` → `pt-BR`, `ar` → `ar-MA`); a region-specific code must match that region. The global English choice is the explicit exception: code `global`, locale `en-001`, flag `global`, direction `ltr`.

`life` supplies every category reported by `new Intl.PluralRules(meta.locale).resolvedOptions().pluralCategories`. Categories vary by language; Italian includes `many`, Polish includes `few` and `many`, and Arabic uses all six categories. Use a current Node runtime with full ICU, `Intl.Segmenter`, and locale text direction support.

## Regional variants

A variant can explicitly inherit another registered pack:

```json
{
  "extends": "en",
  "meta": {
    "locale": "en-GB",
    "country": "United Kingdom",
    "language": "English",
    "flag": "gb",
    "dir": "ltr"
  },
  "core": { "ready": "Ready…" }
}
```

Every variant provides its complete metadata. Nested maps merge with the parent; arrays replace the entire parent array. A regional Spanish variant can inherit `es` and override vocabulary, wording or the complete word list. Missing parents, cycles and invalid resolved schemas fail the build. Inheritance is resolved at build time, so no `extends` values reach the browser.

## Word gates

Provide at least 24 distinct `[prefix, suffix, clue]` triples. Choose native words with concise, unambiguous clues; do not translate English splits mechanically or transliterate native scripts into ASCII. Prefix plus suffix must form a real word. Use letters and necessary combining marks/joiners, NFC Unicode normalization, single internal spaces for compound words when native spelling requires them, no punctuation, no more than 8 graphemes in either gate half, and no more than 14 in the complete word. The split must occur at a grapheme boundary in the complete word, preserving accents, vowel signs and conjuncts. Complete words must be unique regardless of case. Each prefix must have at least two distinct alternative suffixes in the complete pool that neither equal its answer nor form another known complete word.

The validator checks structure, Unicode boundaries and duplicates. A fluent reviewer must still assess spelling, clue accuracy, natural phrasing and visual fit. It cannot prove that a string is an authentic word or that a clue has only one interpretation.

## Content rules

Keep MEMEZZO, DevFridge, Phantom and PASTA brand names intact. Hard is always free and starts every run with 2 lives. Easy gives 1 total starting life per full million of active locked MEMEZZO, with no base lives. Verification is explicitly requested in the Shop, persists for the page session, and never interrupts an ongoing run. Preserve those facts in every translation.

Translate controls describing English subtitles while keeping the song audio and English subtitle content unchanged. The native privacy-link label must clearly indicate that its destination is in English. Historical demo descriptions must retain their simulation and older-rule limitations.
