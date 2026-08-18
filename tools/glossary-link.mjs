#!/usr/bin/env node
//
// glossary-link.mjs — first-mention auto-linker for settled glossary terms
//
// Wires every settled term recorded in translations/glossary.md § 5 into a
// first-mention hyperlink, per article, per locale, pointing at that locale's
// own glossary anchor. Idempotent: a term already linked anywhere in a file
// is left alone, so re-running is a no-op once every article is wired.
//
// This tool WRITES to the working tree. Unlike seo-check.mjs and
// term-check.mjs — read-only gates safe to run from a git hook — this is an
// editorial tool you run deliberately, after both of those pass. Linking
// before consistency is verified would bake in whatever rendering happened
// to be wrong at the time; it is not wired into .githooks/pre-push, and
// should not be.
//
//   node tools/glossary-link.mjs            # apply links, write files
//   node tools/glossary-link.mjs --check    # report what WOULD change, exit 1 if anything would
//   node tools/glossary-link.mjs --verbose  # also list every skip reason
//
// Scope: only terms parseable from glossary.md § 5.1-5.4 (the settled-term
// tables term-check.mjs also reads). Ringi is excluded by construction — it
// has no § 5.1/5.2/5.3 row, since § 5.5(b) is still open.
//
// Exits 0 when clean (nothing to do, or --check found nothing pending),
// 1 if --check finds pending links, 2 if glossary.md cannot be parsed.
//
// ---------------------------------------------------------------------------
// WHAT THIS CAN AND CANNOT DO — read before trusting a clean run.
//
// CAN:  find the first eligible plain-text mention of a settled term's exact
//       locale rendering in an article's body prose, and wrap it in a link to
//       that locale's own glossary anchor, skipping citation blocks and
//       anything already inside a link.
//
// CANNOT: recognize a paraphrase. If an article never uses a term's literal
//       settled rendering, this tool has nothing to attach a link to, the
//       same limitation term-check.mjs documents for its own string matching.
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const GLOSSARY = 'translations/glossary.md';
const LOCALES = ['ja', 'es', 'fr', 'de'];
const CHECK = process.argv.includes('--check');
const VERBOSE = process.argv.includes('--verbose');

// ---------------------------------------------------------------------------
// Parse translations/glossary.md — same table shapes term-check.mjs reads,
// duplicated here rather than shared, matching this project's existing
// pattern of self-contained, zero-dependency tools/*.mjs scripts.
// ---------------------------------------------------------------------------

const md = readFileSync(join(ROOT, GLOSSARY), 'utf8');

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
      if (cells.every((c) => /^-+$/.test(c))) continue;
      rows.push(cells);
    } else if (started && line.trim() === '') {
      break;
    }
  }
  return rows.length ? rows : null;
}

const clean = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').trim();
const isEnglishCell = (s) => /^english$/i.test(clean(s));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// concept: { id, english, settled: {locale: rendering|null} }
const concepts = [];
const seen = new Set();
function addConcept(english, settledByLocale) {
  const id = slugify(english);
  if (seen.has(id)) return; // e.g. talk-to-listen ratio also appears in § 6.1's collision table
  seen.add(id);
  concepts.push({ id, english, settled: settledByLocale });
}

const t51 = tableAfter('### 5.1 Settled treatments — all four locales');
if (!t51) { console.error(`glossary-link: cannot find the 5.1 table in ${GLOSSARY}`); process.exit(2); }
for (const [term, treatment] of t51.slice(1)) {
  if (!term || !isEnglishCell(treatment)) continue;
  addConcept(clean(term), Object.fromEntries(LOCALES.map((l) => [l, null])));
}

for (const heading of [
  '### 5.2 Settled — named things stay English',
  '### 5.3 Settled — borrowed concepts are translated',
]) {
  const rows = tableAfter(heading);
  if (!rows) { console.error(`glossary-link: cannot find the table under "${heading}"`); process.exit(2); }
  const header = rows[0].map((h) => clean(h).toLowerCase());
  const idx = Object.fromEntries(LOCALES.map((l) => [l, header.indexOf(l)]));
  if (Object.values(idx).some((i) => i < 1)) {
    console.error(`glossary-link: "${heading}" table is missing a locale column`); process.exit(2);
  }
  for (const row of rows.slice(1)) {
    const term = clean(row[0]);
    if (!term) continue;
    const settledByLocale = {};
    for (const l of LOCALES) {
      const cell = row[idx[l]] ?? '';
      settledByLocale[l] = isEnglishCell(cell) ? null : clean(cell);
    }
    addConcept(term, settledByLocale);
  }
}

// § 5.4 Scaling the expert: prose-only entry (English in all locales), not a table row.
addConcept('Scaling the expert', Object.fromEntries(LOCALES.map((l) => [l, null])));

if (VERBOSE) {
  console.log(`Parsed ${concepts.length} linkable concepts from ${GLOSSARY}:`);
  for (const c of concepts) console.log(`  ${c.id} <- "${c.english}"`);
  console.log('');
}

// ---------------------------------------------------------------------------
// Collect target files: every locale HTML file with an EN counterpart,
// excluding glossary.html itself in every locale (no self-linking) and the
// root glossary.html.
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (entry.endsWith('.html')) out.push(relative(ROOT, abs).split(sep).join('/'));
  }
  return out;
}

function allHtmlFiles() {
  const out = [];
  for (const entry of readdirSync(ROOT)) {
    const abs = join(ROOT, entry);
    let st;
    try { st = statSync(abs); } catch { continue; }
    if (st.isDirectory()) {
      if (['.git', 'node_modules', 'tools'].includes(entry)) continue;
      walk(abs, out);
    } else if (entry.endsWith('.html')) {
      out.push(entry);
    }
  }
  return out;
}

const targets = allHtmlFiles().filter((f) => basename(f) !== 'glossary.html');

// ---------------------------------------------------------------------------
// Protected-region computation: byte ranges within <body> that must not be
// touched — existing <a>...</a> tags (don't double-link, don't link inside a
// link), <script>/<style> blocks, and the citation section
// (<section class="cite-card" ...>...</section>, covers .cite-text and the
// BibTeX <pre> block alike).
// ---------------------------------------------------------------------------

function protectedRanges(body) {
  const ranges = [];
  const patterns = [
    /<a\b[^>]*>[\s\S]*?<\/a>/gi,
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    /<style\b[^>]*>[\s\S]*?<\/style>/gi,
    /<section class="cite-card"[\s\S]*?<\/section>/gi,
  ];
  for (const re of patterns) {
    for (const m of body.matchAll(re)) ranges.push([m.index, m.index + m[0].length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  return ranges;
}

function isProtected(ranges, start, end) {
  return ranges.some(([a, b]) => start < b && end > a);
}

// Eligible regions: real prose paragraphs only, matching how every existing
// hand-placed glossary link on this site is positioned (checked directly —
// all six pre-existing inline links across any-questions-so-far.html,
// contributors/peter-cohan.html and what-is-technical-marketing.html sit
// inside a <p ...> tag, none inside an eyebrow, rail label, plate caption,
// aria-label, or video-callouts list). Restricting to <p> keeps the linker
// from placing a link in structural chrome just because the text happened to
// be unprotected there.
function eligibleRanges(body) {
  const ranges = [];
  for (const m of body.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function isEligible(ranges, start, end) {
  return ranges.some(([a, b]) => start >= a && end <= b);
}

// This site writes accented characters as HTML entities in some places and
// as literal UTF-8 in others, often in the same file (term-check.mjs decodes
// entities before matching for exactly this reason). This tool inserts into
// the RAW file, so it cannot decode-then-match — a match found in decoded
// text wouldn't line up with byte offsets in the original. Instead, build a
// regex where each accentable character matches either its literal form or
// its named-entity form, so the search itself is entity-tolerant without
// ever losing the original positions.
const ENTITY_OF = {
  á: 'aacute', é: 'eacute', í: 'iacute', ó: 'oacute', ú: 'uacute',
  ñ: 'ntilde', ü: 'uuml', ç: 'ccedil', à: 'agrave', è: 'egrave',
  ê: 'ecirc', ô: 'ocirc', â: 'acirc', ï: 'iuml', ë: 'euml',
  Á: 'Aacute', É: 'Eacute', Í: 'Iacute', Ó: 'Oacute', Ú: 'Uacute', Ñ: 'Ntilde',
  ß: 'szlig', Ü: 'Uuml', Ö: 'Ouml', Ä: 'Auml', ö: 'ouml', ä: 'auml',
};

// Matches a term as a whole word/phrase, tolerant of the same
// space-or-hyphen compounding term-check.mjs's termCountRe accepts, so a
// German attributive compound doesn't silently go unlinked either.
//
// \b is defined in terms of \w, which is ASCII-only — \b知識の呪い\b can
// never match, since neither the term nor its neighboring Japanese
// punctuation are \w characters, so \b never asserts a boundary at all. Only
// apply \b anchors to a term that actually contains a Latin/digit character;
// a pure-CJK term matches as a plain substring instead, which is safe here
// given how distinctive each settled rendering is.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function entityTolerant(s) {
  return [...s].map((ch) => {
    const ent = ENTITY_OF[ch];
    return ent ? `(?:${ch}|&${ent};)` : escapeRe(ch);
  }).join('');
}
function termRegex(term) {
  const hasWordChars = /[A-Za-z0-9]/.test(term);
  const words = term.trim().split(/\s+/).map(entityTolerant);
  const sep2 = words.length > 1 ? '[ -]' : '';
  const core = words.join(sep2);
  return hasWordChars ? new RegExp(`\\b${core}\\b`, 'gi') : new RegExp(core, 'gi');
}

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------

function localeOf(file) {
  const first = file.split('/')[0];
  return LOCALES.includes(first) ? first : 'en';
}

function glossaryHref(locale, id) {
  return locale === 'en' ? `/glossary#${id}` : `/${locale}/glossary#${id}`;
}

let filesChanged = 0;
let linksAdded = 0;
const pending = [];

for (const file of targets) {
  const abs = join(ROOT, file);
  const html = readFileSync(abs, 'utf8');
  const bodyStart = html.indexOf('<body');
  if (bodyStart === -1) continue;
  const body = html.slice(bodyStart);
  const locale = localeOf(file);
  const ranges = protectedRanges(body);
  const prose = eligibleRanges(body);

  const insertions = []; // {start, end, id}
  for (const c of concepts) {
    const expected = locale === 'en' ? c.english : (c.settled[locale] ?? c.english);
    const href = glossaryHref(locale, c.id);

    // Already linked anywhere in the body? Nothing to do for this concept.
    const alreadyLinked = new RegExp(`<a href="[^"]*#${c.id}"`, 'i').test(body);
    if (alreadyLinked) continue;

    const re = termRegex(expected);
    let match;
    let found = null;
    while ((match = re.exec(body))) {
      const start = match.index, end = match.index + match[0].length;
      if (isEligible(prose, start, end) && !isProtected(ranges, start, end)) {
        found = match;
        break;
      }
    }
    if (found) {
      insertions.push({ start: found.index, end: found.index + found[0].length, id: c.id, href, text: found[0] });
    } else if (VERBOSE) {
      console.log(`  skip: ${file} — no eligible mention of "${expected}" (${c.id})`);
    }
  }

  if (!insertions.length) continue;

  // Guard against two concepts claiming overlapping spans (shouldn't happen
  // given the term set, but fail loud rather than corrupt the file).
  insertions.sort((a, b) => a.start - b.start);
  for (let i = 1; i < insertions.length; i++) {
    if (insertions[i].start < insertions[i - 1].end) {
      console.error(`glossary-link: overlapping insertions in ${file} (${insertions[i - 1].id} / ${insertions[i].id}) — skipping this file`);
      insertions.length = 0;
      break;
    }
  }
  if (!insertions.length) continue;

  // Apply from the end backward so earlier offsets stay valid.
  let newBody = body;
  for (const ins of [...insertions].sort((a, b) => b.start - a.start)) {
    newBody = newBody.slice(0, ins.start) + `<a href="${ins.href}" class="glossary-auto-link">${ins.text}</a>` + newBody.slice(ins.end);
  }

  filesChanged++;
  linksAdded += insertions.length;
  pending.push({ file, count: insertions.length, terms: insertions.map((i) => i.id) });

  if (!CHECK) {
    const newHtml = html.slice(0, bodyStart) + newBody;
    writeFileSync(abs, newHtml, 'utf8');
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (!filesChanged) {
  console.log(`✓ glossary-link — ${concepts.length} concepts, ${targets.length} candidate files, nothing to link.`);
  process.exit(0);
}

const verb = CHECK ? 'would add' : 'added';
console.log(`${CHECK ? '○' : '✓'} glossary-link ${verb} ${linksAdded} link${linksAdded === 1 ? '' : 's'} across ${filesChanged} file${filesChanged === 1 ? '' : 's'}:\n`);
for (const p of pending) {
  console.log(`  ${p.file} (${p.count}): ${p.terms.join(', ')}`);
}
console.log('');

process.exit(CHECK ? 1 : 0);
