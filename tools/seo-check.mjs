#!/usr/bin/env node
//
// seo-check.mjs — URL / canonical integrity gate for technicalmarketing.org
//
// Catches the class of bug where a sitemap entry, internal link, hreflang tag or
// IndexNow ping points at a URL that redirects instead of at the canonical URL.
// Google Search Console reports those as "Page with redirect" and fails sitemap
// validation.
//
// Zero dependencies. Plain Node ESM. No build, no node_modules — matching the rest
// of the site.
//
//   node tools/seo-check.mjs            # offline checks against the working tree
//   node tools/seo-check.mjs --live     # additionally HEAD every sitemap URL
//
// Exits 0 when clean, 1 when any check fails.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ORIGIN = 'https://technicalmarketing.org';
const LIVE = process.argv.includes('--live');

// ---------------------------------------------------------------------------
// --commit <ref> — validate a single commit in isolation
//
// The filesystem checks below run against the working tree, so they cannot see
// a defect that exists only inside a commit: a sitemap entry for a page whose
// file is not in that same commit. That happens when sitemap.xml is staged
// wholesale while the pages it describes are still being staged separately, and
// it produces history where a commit advertises URLs that 404 if deployed.
//
// This mode resolves every <loc> and hreflang alternate in that commit's
// sitemap.xml through Cloudflare Pages routing and confirms the target file
// exists in the same tree.
// ---------------------------------------------------------------------------

const commitIdx = process.argv.indexOf('--commit');
if (commitIdx !== -1) {
  const ref = process.argv[commitIdx + 1];
  if (!ref) {
    console.error('--commit requires a git ref');
    process.exit(2);
  }

  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  // stdio 'pipe' on stderr so git's "fatal: path ... does not exist" chatter,
  // which is the expected result of a miss, does not leak into the report.
  const inTree = (path) => {
    try {
      execFileSync('git', ['cat-file', '-e', `${ref}:${path}`], { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
      return true;
    } catch { return false; }
  };

  let sitemap;
  try {
    sitemap = git(['show', `${ref}:sitemap.xml`]);
  } catch {
    console.log(`✓ ${ref}: no sitemap.xml in this commit — nothing to validate.`);
    process.exit(0);
  }

  // Every URL the sitemap asserts: <loc> plus each hreflang alternate.
  const urls = new Set();
  for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].trim());
  for (const m of sitemap.matchAll(/<xhtml:link[^>]*href=["']([^"']+)["']/g)) urls.add(m[1].trim());

  const broken = [];
  for (const url of urls) {
    if (!url.startsWith(ORIGIN)) { broken.push([url, 'not on the canonical origin']); continue; }
    const path = url.slice(ORIGIN.length).replace(/^\//, '');
    const candidates = path === ''
      ? ['index.html']
      : path.endsWith('/')
        ? [`${path}index.html`, `${path.replace(/\/$/, '')}.html`]
        : [`${path}.html`, `${path}/index.html`];
    if (!candidates.some(inTree)) broken.push([url, `no file in this commit (tried ${candidates.join(', ')})`]);
  }

  const subject = git(['log', '-1', '--format=%h %s', ref]).trim();
  if (broken.length === 0) {
    console.log(`✓ ${subject} — ${urls.size} sitemap URLs, all resolve within the commit.`);
    process.exit(0);
  }
  console.error(`\n✗ ${subject} — ${broken.length} sitemap URL(s) reference files absent from this commit:\n`);
  for (const [url, why] of broken) console.error(`  ${url}\n      ${why}`);
  console.error('\nA commit must contain every page its sitemap advertises, or deploying it serves 404s.\n');
  process.exit(1);
}

// Directories never served as pages.
const SKIP_DIRS = new Set(['.git', 'node_modules', 'Images', 'audio', 'css', 'js', 'functions', 'tools', '.githooks']);
// Files that are fragments or error pages, not indexable URLs.
const SKIP_FILES = new Set(['404.html']);
const SKIP_PATTERNS = [/^concierge-widget/];

// Baseline of already-known, accepted-for-now violations. These are reported as a
// count but do not fail the build, so adopting this gate does not require clearing
// every pre-existing defect first. New violations always fail.
const IGNORE_FILE = 'tools/seo-check-ignore.txt';
const ignoreRules = [];
if (existsSync(join(ROOT, IGNORE_FILE))) {
  for (const raw of readFileSync(join(ROOT, IGNORE_FILE), 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [check, ...rest] = line.split(/\s+/);
    if (check && rest.length) ignoreRules.push({ check, needle: rest.join(' ') });
  }
}

const violations = [];
const suppressed = [];

function fail(check, file, line, message) {
  const v = { check, file, line, message };
  const isKnown = ignoreRules.some(
    (r) => r.check === check && (message.includes(r.needle) || file === r.needle),
  );
  (isKnown ? suppressed : violations).push(v);
}

// ---------------------------------------------------------------------------
// Filesystem walk
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const rel = relative(ROOT, abs);
    if (SKIP_DIRS.has(entry)) continue;
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (entry.endsWith('.html')) out.push(rel.split(sep).join('/'));
  }
  return out;
}

const htmlFiles = walk(ROOT).filter((f) => {
  const base = f.split('/').pop();
  if (SKIP_FILES.has(base)) return false;
  return !SKIP_PATTERNS.some((p) => p.test(base));
});

const fileCache = new Map();
function read(relPath) {
  if (!fileCache.has(relPath)) fileCache.set(relPath, readFileSync(join(ROOT, relPath), 'utf8'));
  return fileCache.get(relPath);
}

// ---------------------------------------------------------------------------
// _redirects (Cloudflare Pages)
// ---------------------------------------------------------------------------

const redirectRules = [];
if (existsSync(join(ROOT, '_redirects'))) {
  for (const raw of readFileSync(join(ROOT, '_redirects'), 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to] = line.split(/\s+/);
    if (from && to) redirectRules.push({ from, to });
  }
}

function matchRedirect(path) {
  for (const { from, to } of redirectRules) {
    if (from.endsWith('/*')) {
      if (path.startsWith(from.slice(0, -1))) return to;
    } else if (from === path) return to;
  }
  return null;
}

// ---------------------------------------------------------------------------
// URL -> file resolution, mirroring Cloudflare Pages routing
//
//   /            -> index.html
//   /foo         -> foo.html, else foo/index.html via 308 to /foo/
//   /foo/        -> foo/index.html, else foo.html via 308 to /foo
// ---------------------------------------------------------------------------

function resolve(path) {
  if (path === '/') {
    if (existsSync(join(ROOT, 'index.html'))) return { status: 'ok', file: 'index.html' };
    return { status: 'missing' };
  }

  const bare = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const asFile = `${bare}.html`;
  const asIndex = `${bare}/index.html`;
  const hasFile = existsSync(join(ROOT, asFile));
  const hasIndex = existsSync(join(ROOT, asIndex));

  if (path.endsWith('/')) {
    if (hasIndex) return { status: 'ok', file: asIndex };
    if (hasFile) return { status: 'redirect', to: `/${bare}`, file: asFile };
  } else {
    if (hasFile) return { status: 'ok', file: asFile };
    if (hasIndex) return { status: 'redirect', to: `/${bare}/`, file: asIndex };
  }

  const rule = matchRedirect(path);
  if (rule) return { status: 'redirect', to: rule, file: null };

  return { status: 'missing' };
}

// ---------------------------------------------------------------------------
// HTML extraction
// ---------------------------------------------------------------------------

function canonicalOf(relPath) {
  const m = read(relPath).match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function isNoindex(relPath) {
  return /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(read(relPath));
}

// Returns { path, raw, line } for every internal href / hreflang target in a file.
function internalLinks(relPath) {
  const out = [];
  const lines = read(relPath).split('\n');
  lines.forEach((line, i) => {
    const re = /(?:href|content)=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(line)) !== null) {
      const raw = m[1];
      let path = null;

      if (raw.startsWith(`${ORIGIN}/`) || raw === ORIGIN) {
        path = raw.slice(ORIGIN.length) || '/';
      } else if (raw.startsWith('http://technicalmarketing.org')) {
        fail('http-scheme', relPath, i + 1, `insecure http:// link -> ${raw}`);
        continue;
      } else if (raw.startsWith('/') && !raw.startsWith('//')) {
        path = raw;
      } else {
        continue; // external, mailto:, tel:, #fragment, relative asset
      }

      path = path.split('#')[0].split('?')[0];
      if (!path) continue;
      // Skip non-page assets.
      if (/\.(png|jpe?g|svg|webp|avif|gif|ico|css|js|mjs|xml|txt|json|mp3|m4a|mp4|webm|pdf|zip|woff2?|ttf|eot)$/i.test(path)) continue;
      out.push({ path, raw, line: i + 1 });
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Sitemap parsing
// ---------------------------------------------------------------------------

const sitemapPath = 'sitemap.xml';
const sitemapLines = read(sitemapPath).split('\n');
const sitemapLocs = [];
const sitemapAlternates = [];

sitemapLines.forEach((line, i) => {
  const loc = line.match(/<loc>([^<]+)<\/loc>/);
  if (loc) sitemapLocs.push({ url: loc[1].trim(), line: i + 1 });
  const alt = line.match(/<xhtml:link[^>]*href=["']([^"']+)["']/);
  if (alt) sitemapAlternates.push({ url: alt[1].trim(), line: i + 1 });
});

const sitemapUrlSet = new Set(sitemapLocs.map((l) => l.url));

// ---------------------------------------------------------------------------
// CHECK 1 — every sitemap <loc> resolves without redirect and equals that
//           page's own <link rel="canonical">
// ---------------------------------------------------------------------------

for (const { url, line } of sitemapLocs) {
  if (!url.startsWith(ORIGIN)) {
    fail('sitemap-canonical', sitemapPath, line, `<loc> is not on ${ORIGIN}: ${url}`);
    continue;
  }
  const path = url.slice(ORIGIN.length) || '/';
  const res = resolve(path);

  if (res.status === 'missing') {
    fail('sitemap-canonical', sitemapPath, line, `<loc> resolves to no page (404): ${url}`);
    continue;
  }
  if (res.status === 'redirect') {
    fail('sitemap-canonical', sitemapPath, line, `<loc> redirects to ${ORIGIN}${res.to} — sitemap must list the destination: ${url}`);
    continue;
  }
  const canonical = canonicalOf(res.file);
  if (!canonical) {
    fail('sitemap-canonical', sitemapPath, line, `${res.file} has no <link rel="canonical">`);
  } else if (canonical !== url) {
    fail('sitemap-canonical', sitemapPath, line, `<loc> ${url} != canonical ${canonical} (${res.file})`);
  }
}

// ---------------------------------------------------------------------------
// CHECK 2 — no http:// in sitemap URLs (namespace declarations excluded)
// ---------------------------------------------------------------------------

for (const { url, line } of [...sitemapLocs, ...sitemapAlternates]) {
  if (url.startsWith('http://')) {
    fail('http-scheme', sitemapPath, line, `sitemap URL uses http:// instead of https://: ${url}`);
  }
}

// ---------------------------------------------------------------------------
// CHECK 3 — every internal link / hreflang target resolves to a real page and
//           matches that page's canonical exactly
// ---------------------------------------------------------------------------

for (const file of htmlFiles) {
  for (const { path, raw, line } of internalLinks(file)) {
    const res = resolve(path);

    if (res.status === 'missing') {
      fail('internal-link', file, line, `link target does not exist (404): ${raw}`);
      continue;
    }
    if (res.status === 'redirect') {
      fail('internal-link', file, line, `link target redirects to ${res.to} — link the canonical directly: ${raw}`);
      continue;
    }
    const canonical = canonicalOf(res.file);
    if (!canonical) continue; // page has no canonical; not a link defect
    const absolute = `${ORIGIN}${path}`;
    if (canonical !== absolute) {
      fail('internal-link', file, line, `link ${absolute} != target canonical ${canonical} (${res.file})`);
    }
  }
}

// ---------------------------------------------------------------------------
// CHECK 4 — every indexable page is present in the sitemap
// ---------------------------------------------------------------------------

for (const file of htmlFiles) {
  const canonical = canonicalOf(file);
  if (!canonical) continue;
  if (isNoindex(file)) continue;
  if (!sitemapUrlSet.has(canonical)) {
    fail('sitemap-coverage', file, 0, `page is live but absent from sitemap.xml: ${canonical}`);
  }
}

// ---------------------------------------------------------------------------
// CHECK 5 — IndexNow workflow pings canonical URLs only
// ---------------------------------------------------------------------------

const workflowCandidates = ['.github/workflows/indexnow.yml', 'github/workflows/indexnow.yml'];
const workflowPath = workflowCandidates.find((p) => existsSync(join(ROOT, p)));

if (workflowPath) {
  read(workflowPath).split('\n').forEach((line, i) => {
    const m = line.match(/"https:\/\/\$HOST([^"]*)"/);
    if (!m) return;
    const path = m[1] || '/';
    // Skip lines that interpolate other shell variables (e.g. the keyLocation URL).
    if (path.includes('$')) return;
    const res = resolve(path);

    if (res.status === 'missing') {
      fail('indexnow', workflowPath, i + 1, `pings a URL that does not exist: ${path}`);
      return;
    }
    if (res.status === 'redirect') {
      fail('indexnow', workflowPath, i + 1, `pings a redirecting URL ${path} -> ${res.to} — ping the canonical`);
      return;
    }
    const canonical = canonicalOf(res.file);
    if (canonical && canonical !== `${ORIGIN}${path}`) {
      fail('indexnow', workflowPath, i + 1, `pings ${ORIGIN}${path} != canonical ${canonical}`);
    }
  });
} else {
  fail('indexnow', 'github/workflows/indexnow.yml', 0, 'IndexNow workflow not found at either .github/workflows/ or github/workflows/');
}

// ---------------------------------------------------------------------------
// CHECK 6 — every standalone content page declares a favicon and the RSS feed
//
// Scoped to pages carrying a <link rel="canonical">, which is what makes a file a
// standalone indexable page. That naturally excludes concierge-widget fragments,
// 404 pages, and manual/ internals, none of which declare a canonical.
// ---------------------------------------------------------------------------

const FAVICON_RE = /<link[^>]+rel=["']icon["'][^>]*>/i;
const RSS_RE = /<link[^>]+type=["']application\/rss\+xml["'][^>]*>/i;

for (const file of htmlFiles) {
  if (!canonicalOf(file)) continue; // not a standalone page
  const html = read(file);
  if (!FAVICON_RE.test(html)) {
    fail('head-tags', file, 0, 'missing <link rel="icon"> — page will render a blank browser-tab icon');
  }
  if (!RSS_RE.test(html)) {
    fail('head-tags', file, 0, 'missing <link rel="alternate" type="application/rss+xml"> feed declaration');
  }
}

// ---------------------------------------------------------------------------
// CHECK 7 — every standalone content page carries the language-switching
//           components, even when only one language exists
//
// Presence only. Whether the links inside them resolve is already covered by the
// internal-link check, and duplicating it here would report the same defect twice.
//
// The convention is that an untranslated page still renders a single-entry
// English-only picker rather than omitting the component. That keeps the
// masthead structurally identical across every page, which is what makes this
// rule enforceable at all — "present on every page" is checkable, "present only
// when translations exist" is a judgment call that drifts.
// ---------------------------------------------------------------------------

const PAGE_COMPONENTS = [
  [/<details class="masthead__langpicker">/, 'masthead language picker (<details class="masthead__langpicker">)'],
  [/class="site-footer__langs"/, 'footer language nav (class="site-footer__langs")'],
];

for (const file of htmlFiles) {
  if (!canonicalOf(file)) continue; // not a standalone page
  const html = read(file);
  for (const [re, label] of PAGE_COMPONENTS) {
    if (!re.test(html)) fail('page-components', file, 0, `missing ${label}`);
  }
}

// ---------------------------------------------------------------------------
// CHECK 8 — asset references must be root-relative, never document-relative
//
// A path like src="Images/plate.jpg" resolves against the page's own URL. On a
// root page that happens to be correct; copy the same file to /es/ and every
// reference silently resolves to /es/Images/ and 404s. That is exactly what
// happened when any-questions-so-far.html was translated: nine images broke,
// and no existing check noticed, because the sitemap, canonicals and terminology
// were all still valid.
//
// Absolute paths are already the site-wide convention — this page was the only
// file using relative ones — so the rule is a straight assertion of it.
// ---------------------------------------------------------------------------

for (const file of htmlFiles) {
  const html = read(file);
  const body = html.slice(Math.max(0, html.indexOf('<body')));
  const seen = new Set();
  for (const m of body.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const ref = m[1];
    // Absolute, external, inline, in-page or protocol links are all fine.
    if (/^(\/|https?:|data:|#|mailto:|tel:|javascript:)/i.test(ref)) continue;
    if (seen.has(ref)) continue;
    seen.add(ref);
    fail('relative-asset', file, 0,
      `document-relative reference "${ref}" — resolves against the page URL, so it breaks when this file is copied to a locale directory. Use a root-relative path ("/${ref.replace(/^\.\//, '')}").`);
  }
}

// ---------------------------------------------------------------------------
// CHECK 9 — no characters from scripts this site never uses
//
// Catches generation-level corruption rather than a translation judgment: a word
// silently assembled from two alphabets, e.g. Cyrillic "мед" fused onto Latin
// "icinal" inside a Japanese sentence, or "процес" where プロセス belongs. Two
// such defects were produced while drafting the Japanese page. Both rendered as
// visible garbage and both passed every other check, because terminology and
// structure were untouched.
//
// A survey found Cyrillic, Greek, Hangul, Arabic, Hebrew, Devanagari and Thai
// absent from every page, so any occurrence is corruption, not content. CJK is
// deliberately not listed: it appears on all 108 pages as the 日本語 label in the
// language picker, and is legitimate in every locale.
// ---------------------------------------------------------------------------

const FOREIGN_SCRIPTS = [
  ['Cyrillic', /[Ѐ-ԯ]/g],
  ['Greek', /[Ͱ-Ͽ]/g],
  ['Hangul', /[가-힯ᄀ-ᇿ]/g],
  ['Arabic', /[؀-ۿ]/g],
  ['Hebrew', /[֐-׿]/g],
  ['Devanagari', /[ऀ-ॿ]/g],
  ['Thai', /[฀-๿]/g],
];

for (const file of htmlFiles) {
  // Strip script and style blocks: base64 and CSS are not prose and cannot carry this defect.
  const text = read(file).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  for (const [script, re] of FOREIGN_SCRIPTS) {
    const matches = [...text.matchAll(re)];
    if (!matches.length) continue;
    // Show the corrupted word in context so the fix is obvious.
    const at = matches[0].index;
    const word = text.slice(Math.max(0, at - 24), at + 24).replace(/\s+/g, ' ').trim();
    fail('foreign-script', file, 0,
      `${matches.length} ${script} character(s) — this site uses none, so it is corruption, not content. Near: "…${word}…"`);
  }
}

// ---------------------------------------------------------------------------
// CHECK 10 (--live only) — every sitemap URL returns 200, no redirect hop
// ---------------------------------------------------------------------------

if (LIVE) {
  const queue = [...sitemapLocs];
  const CONCURRENCY = 8;

  async function worker() {
    while (queue.length) {
      const { url, line } = queue.shift();
      try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
        if (res.status >= 300 && res.status < 400) {
          fail('live', sitemapPath, line, `${url} returns ${res.status} -> ${res.headers.get('location')}`);
        } else if (res.status !== 200) {
          fail('live', sitemapPath, line, `${url} returns ${res.status}`);
        }
      } catch (err) {
        fail('live', sitemapPath, line, `${url} request failed: ${err.message}`);
      }
    }
  }

  console.log(`Checking ${sitemapLocs.length} live URLs…`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const LABELS = {
  'sitemap-canonical': 'Sitemap entries that redirect or disagree with their canonical',
  'http-scheme': 'Insecure http:// URLs',
  'internal-link': 'Internal links / hreflang targets that redirect or 404',
  'sitemap-coverage': 'Live pages missing from the sitemap',
  'head-tags': 'Pages missing required <head> declarations (favicon / RSS)',
  'page-components': 'Pages missing required masthead/footer components',
  'relative-asset': 'Document-relative asset paths (break when copied to a locale)',
  'foreign-script': 'Characters from scripts this site never uses (generation corruption)',
  indexnow: 'IndexNow workflow URLs',
  live: 'Live HTTP responses',
};

const knownNote = suppressed.length
  ? `  (${suppressed.length} known issue${suppressed.length === 1 ? '' : 's'} suppressed via ${IGNORE_FILE})`
  : '';

if (violations.length === 0) {
  console.log(`✓ seo-check passed — ${sitemapLocs.length} sitemap URLs, ${htmlFiles.length} pages, no new violations.${knownNote}`);
  if (suppressed.length && process.argv.includes('--show-known')) {
    console.log('\nKnown issues (not blocking):');
    for (const v of suppressed) console.log(`  ${v.file}${v.line ? `:${v.line}` : ''}  ${v.message}`);
  }
  process.exit(0);
}

console.error(`\n✗ seo-check FAILED — ${violations.length} violation${violations.length === 1 ? '' : 's'}${knownNote}\n`);

for (const [check, label] of Object.entries(LABELS)) {
  const group = violations.filter((v) => v.check === check);
  if (!group.length) continue;
  console.error(`${label} (${group.length}):`);
  for (const v of group) {
    console.error(`  ${v.file}${v.line ? `:${v.line}` : ''}  ${v.message}`);
  }
  console.error('');
}

console.error('Fix the above before deploying. See EDITORIAL.md § Before Publication, item 11.\n');
process.exit(1);
