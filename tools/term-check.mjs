#!/usr/bin/env node
//
// term-check.mjs — settled-terminology consistency gate for technicalmarketing.org
//
// Catches a settled glossary term rendered inconsistently inside one translated page:
// the English term in one paragraph and a local-language paraphrase of the same concept
// a few lines below, so a reader cannot tell the two mentions name one thing.
//
// Reads translations/glossary.md as the single source of truth. No second copy of the
// term list exists, and a change to the document's shape is a hard error rather than a
// silently stale check.
//
// Zero dependencies. Plain Node ESM.
//
//   node tools/term-check.mjs            # check every locale page
//   node tools/term-check.mjs --verbose  # also print the parsed term tables
//
// Exits 0 when clean, 1 on any violation, 2 if glossary.md cannot be parsed.
//
// ---------------------------------------------------------------------------
// WHAT THIS CAN AND CANNOT CATCH — read before trusting a green run.
//
// CAN:  a rendering already known to be wrong reappearing anywhere (check 1);
//       two different known renderings of one concept inside a single file (check 2);
//       a settled-English term silently dropped from a locale page (check 3);
//       a settled-translated term left in English (check 4).
//
// CANNOT: a brand-new paraphrase nobody has seen before. String matching has no way to
//       know that "the pitching-to-questioning ratio" names the same thing as
//       "talk-to-listen ratio". That is exactly how the original defect entered, and a
//       count comparison would not have caught it either — the English source used one
//       phrasing in the bio and another in the teaser, so both files held exactly one
//       match. First discovery of that class still needs a human reading the page.
//
// The value here is that once a defect is found by hand and its rendering recorded in
// glossary.md, it can never come back — in this file or any other.
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const GLOSSARY = 'translations/glossary.md';
const LOCALES = ['ja', 'es', 'fr', 'de'];
const VERBOSE = process.argv.includes('--verbose');

const violations = [];
const fail = (check, file, message) => violations.push({ check, file, message });

// ---------------------------------------------------------------------------
// Parse translations/glossary.md
// ---------------------------------------------------------------------------

const md = readFileSync(join(ROOT, GLOSSARY), 'utf8');

// Returns the rows of the first markdown table appearing after `heading`.
function tableAfter(heading) {
  const at = md.indexOf(heading);
  if (at === -1) return null;
  const lines = md.slice(at).split('\n');
  const rows = [];
  let started = false;
  for (const line of lines) {
    const isRow = line.trim().startsWith('|');
    if (isRow) {
      started = true;
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue; // separator
      rows.push(cells);
    } else if (started && line.trim() === '') {
      break;
    }
  }
  return rows.length ? rows : null;
}

const clean = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').trim();
const isEnglishCell = (s) => /^english$/i.test(clean(s));

// A concept: the English term plus every rendering known for it, good or rejected.
// term -> { english, settled: {locale: rendering|null}, rejected: {locale: [renderings]} }
const concepts = new Map();
const conceptFor = (english) => {
  if (!concepts.has(english)) {
    concepts.set(english, { english, settled: {}, rejected: {} });
  }
  return concepts.get(english);
};

// --- 5.1: settled English in all four locales (Term | Treatment | Evidence)
const t51 = tableAfter('### 5.1 Settled treatments — all four locales');
if (!t51) { console.error(`term-check: cannot find the 5.1 table in ${GLOSSARY}`); process.exit(2); }
for (const [term, treatment] of t51.slice(1)) {
  if (!term || !isEnglishCell(treatment)) continue;
  const c = conceptFor(clean(term));
  for (const l of LOCALES) c.settled[l] = null; // null = keep the English form
}

// --- 5.2 / 5.3: per-locale renderings (Term | JA | ES | FR | DE | …)
for (const heading of [
  '### 5.2 Settled — named things stay English',
  '### 5.3 Settled — borrowed concepts are translated',
]) {
  const rows = tableAfter(heading);
  if (!rows) { console.error(`term-check: cannot find the table under "${heading}"`); process.exit(2); }
  const header = rows[0].map((h) => clean(h).toLowerCase());
  const idx = Object.fromEntries(LOCALES.map((l) => [l, header.indexOf(l)]));
  if (Object.values(idx).some((i) => i < 1)) {
    console.error(`term-check: "${heading}" table is missing a locale column`); process.exit(2);
  }
  for (const row of rows.slice(1)) {
    const term = clean(row[0]);
    if (!term) continue;
    const c = conceptFor(term);
    for (const l of LOCALES) {
      const cell = row[idx[l]] ?? '';
      c.settled[l] = isEnglishCell(cell) ? null : clean(cell);
    }
  }
}

// --- 6.1: renderings that must never reappear (Locale | Term | Rejected rendering)
const tRej = tableAfter('| Locale | Term | Rejected rendering |');
if (!tRej) { console.error('term-check: cannot find the rejected-rendering table'); process.exit(2); }
for (const row of tRej.slice(1)) {
  const [loc, term, bad] = row.map(clean);
  if (!loc || !term || !bad) continue;
  const c = conceptFor(term);
  (c.rejected[loc.toLowerCase()] ??= []).push(bad);
}

if (VERBOSE) {
  console.log(`Parsed ${concepts.size} settled concepts from ${GLOSSARY}:\n`);
  for (const c of concepts.values()) {
    const per = LOCALES.map((l) => `${l}:${c.settled[l] ?? 'EN'}`).join('  ');
    const rej = Object.values(c.rejected).flat();
    console.log(`  ${c.english}\n      ${per}${rej.length ? `\n      rejected: ${rej.join(' | ')}` : ''}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Collect the pages to check: every locale HTML file with an English counterpart
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (entry.endsWith('.html')) out.push(relative(ROOT, abs).split(sep).join('/'));
  }
  return out;
}

const pages = [];
for (const loc of LOCALES) {
  let files;
  try { files = walk(join(ROOT, loc)); } catch { continue; }
  for (const f of files) {
    const en = f.slice(loc.length + 1); // strip "ja/" etc.
    pages.push({ locale: loc, file: f, en });
  }
}

// The body, plus the head text that readers actually see: <title> and the
// description/og/twitter meta values, which surface in search results and link
// previews. Terminology drifts there as easily as in prose, and scanning only
// <body> missed a rejected rendering sitting in a meta description.
// This site writes accented characters as HTML entities in some places and as
// literal UTF-8 in others — often in the same file. Without decoding,
// "proporci&oacute;n" and "proporción" are different strings, and a rejected
// rendering hides behind whichever form the checker was not looking for.
const ENTITIES = {
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  ntilde: 'ñ', uuml: 'ü', ccedil: 'ç', agrave: 'à', egrave: 'è',
  ecirc: 'ê', ocirc: 'ô', acirc: 'â', iuml: 'ï', euml: 'ë',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
  szlig: 'ß', Uuml: 'Ü', Ouml: 'Ö', Auml: 'Ä', ouml: 'ö', auml: 'ä',
  amp: '&', quot: '"', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', iquest: '¿', iexcl: '¡', le: '≤', ge: '≥',
};
const decode = (s) => s
  .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-fA-F]+);/g, (m, n) => String.fromCodePoint(parseInt(n, 16)));

const bodyOf = (relPath) => {
  const html = decode(readFileSync(join(ROOT, relPath), 'utf8'));
  const i = html.indexOf('<body');
  const body = i === -1 ? html : html.slice(i);
  const head = i === -1 ? '' : html.slice(0, i);
  const visibleHead = [
    ...[...head.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((m) => m[1]),
    ...[...head.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:title|og:description|twitter:title|twitter:description)["'][^>]*content=["']([^"']*)["']/gi)].map((m) => m[1]),
  ].join('\n');
  return `${visibleHead}\n${body}`;
};

const countOf = (hay, needle) => needle ? hay.split(needle).length - 1 : 0;

// A multi-word term counted with a plain space also has to count as present when a
// locale compounds it with hyphens instead — "Copley Plan" rendered "Copley-Plan-Jahre"
// in German, attributive-compound hyphenation the same as this site's existing
// Great-Demo-Ansatz / Long-Context-Modell. That is the same term, not a different one;
// only the counting method needs to know both spellings are the same string.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termCountRe = (needle) => {
  const words = needle.trim().split(/\s+/).map(escapeRe);
  const sep = words.length > 1 ? '[ -]' : '';
  return new RegExp(`\\b${words.join(sep)}\\b`, 'gi');
};

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

let checked = 0;

for (const { locale, file, en } of pages) {
  let body;
  try { body = bodyOf(file); } catch { continue; }
  let enBody = null;
  try { enBody = bodyOf(en); } catch { /* no English counterpart */ }
  checked++;

  // Case-insensitive containment. A rendering that opens a sentence is the same
  // rendering: "La proporción entre exponer y preguntar." in a twitter:description
  // is the string recorded as rejected, capitalised. Matching case-sensitively let
  // exactly that instance through.
  const has = (hay, needle) => needle && hay.toLowerCase().includes(needle.toLowerCase());
  const countCI = (hay, needle) => {
    if (!needle) return 0;
    const m = hay.match(termCountRe(needle));
    return m ? m.length : 0;
  };

  for (const c of concepts.values()) {
    const settled = c.settled[locale];          // null => the English form is correct here
    const expected = settled ?? c.english;
    const rejected = c.rejected[locale] ?? [];

    // CHECK 1 — a rendering already recorded as wrong has reappeared.
    for (const bad of rejected) {
      if (has(body, bad)) {
        fail('rejected-rendering', file,
          `"${bad}" is a rejected rendering of "${c.english}" — use "${expected}"`);
      }
    }

    // CHECK 2 — two different known renderings of one concept in the same file.
    //
    // Same-page glossary cross-reference link text ("See also", inline mentions)
    // renders the TARGET entry's own href-anchor convention, which is not
    // necessarily how the CURRENT entry renders that concept elsewhere. JA in
    // particular always keeps such link text in English regardless of the
    // target's own settled translation — see editorial-judgment, shipped before
    // this check existed: every JA "See also" link reads "Editorial judgment",
    // never 編集判断, even though the entry's own heading is 編集判断. That is a
    // deliberate, already-shipped furniture convention, not drift, so it must
    // not count as a second rendering of the concept here.
    const bodyForMixedCheck = body.replace(/<a href="#[a-z0-9-]+">[^<]*<\/a>/gi, '');
    const present = [];
    if (has(bodyForMixedCheck, c.english)) present.push(c.english);
    if (settled && has(bodyForMixedCheck, settled)) present.push(settled);
    for (const bad of rejected) if (has(bodyForMixedCheck, bad)) present.push(bad);
    const distinct = [...new Set(present)];
    if (distinct.length > 1) {
      fail('mixed-rendering', file,
        `"${c.english}" appears in ${distinct.length} different forms: ${distinct.map((d) => `"${d}"`).join(', ')} — pick one`);
    }

    // CHECK 3 — a settled-English term dropped from the locale page.
    //
    // Skipped on the glossary pages themselves. A term missing from ja/glossary.html is
    // the locale-glossary backfill (glossary.md § 5.6) — those files carry 47 entries
    // against the English 63 — not a consistency defect in prose. Letting it fire here
    // buries the real findings under 35 known-gap reports. Checks 1, 2 and 4 still apply
    // to the glossary pages, since a wrong or mixed rendering there is a genuine bug.
    const isGlossaryPage = /(^|\/)glossary\.html$/.test(file);
    if (settled === null && enBody && !isGlossaryPage) {
      const enN = countCI(enBody, c.english);
      const locN = countCI(body, c.english);
      if (enN > 0 && locN < enN) {
        fail('dropped-term', file,
          `"${c.english}" appears ${enN}× in ${en} but ${locN}× here — ${enN - locN} mention(s) translated away or lost`);
      }
    }

    // CHECK 4 — a settled-translated term left in English.
    if (settled && has(body, c.english) && !has(body, settled)) {
      fail('untranslated-term', file,
        `"${c.english}" should render as "${settled}" in ${locale.toUpperCase()}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const LABELS = {
  'rejected-rendering': 'Renderings already recorded as wrong, reappearing',
  'mixed-rendering': 'One concept rendered inconsistently within a single file',
  'dropped-term': 'Settled English terms missing from a locale page',
  'untranslated-term': 'Settled translated terms left in English',
};

if (violations.length === 0) {
  console.log(`✓ term-check passed — ${concepts.size} settled concepts across ${checked} locale pages, no inconsistencies.`);
  process.exit(0);
}

console.error(`\n✗ term-check FAILED — ${violations.length} violation${violations.length === 1 ? '' : 's'}\n`);
for (const [check, label] of Object.entries(LABELS)) {
  const group = violations.filter((v) => v.check === check);
  if (!group.length) continue;
  console.error(`${label} (${group.length}):`);
  for (const v of group) console.error(`  ${v.file}\n      ${v.message}`);
  console.error('');
}
console.error(`Settled terms are recorded in ${GLOSSARY} §5. Fix the page, or if the`);
console.error('decision itself changed, update the glossary first so the two stay in step.\n');
process.exit(1);
