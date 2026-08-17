# Translation QA Status

What has actually been verified, at what level of assurance, per page and locale.

This file exists because "the checker passed" and "a fluent reader confirmed it reads
naturally" are not the same claim, and collapsing them makes the site look better
verified than it is.

---

## The three tiers

They are **independent**. A row can pass tier 1 and fail tier 2. Nothing about tier 1 or 2
implies tier 3.

### 1. Structural
`tools/seo-check.mjs` and `tools/term-check.mjs` both pass for the page.

Covers: canonical/hreflang/sitemap integrity, required `<head>` declarations, required
masthead and footer components, CSS parity with the English source, the 14 settled
glossary terms, the 8 recorded rejected renderings.

**Mechanical and exhaustive.** Trustworthy within its scope, which is narrow and stated.

### 2. Claude-reviewed
I read the page and checked it against the known failure patterns: settled-term
consistency across every instance, multiply-phrased concepts, homographs, article
agreement, structural parity, and the rendered output in a browser.

**What this is:** a logic and consistency check by a careful non-native reader, plus
everything catalogued in `glossary.md` and the per-article term maps.

**What this is not:** a fluency judgment. I can confirm a term is used consistently and
that a sentence is grammatical. I cannot reliably tell you whether a paragraph *sounds
like* a practitioner-authority publication in Japanese, or whether a phrase is technically
correct but reads as stilted. Two defects this session — ES `Técnico de marketing` and JA
`働く定義` — were caught only because they produced a *logical* inconsistency. A rendering
that is merely unnatural would have passed.

### 3. Native-verified
A fluent reader of that language confirmed the page reads naturally, not merely correctly.

**Currently empty for every row.** That is the honest state, not an oversight.

Only actual native feedback moves a cell into this column. Not a checker run, not a
careful re-read by me, not consistency with an already-shipped page. Native access is ad
hoc, so this column will fill unevenly and slowly, and rows will sit at tier 2 for a long
time. That is fine, provided nobody mistakes tier 2 for tier 3.

**Legend:** ✅ complete · ◐ partial, scope noted · — not done · n/a not applicable

---

## Status

### `contributors/peter-cohan.html`

| Locale | Structural | Claude-reviewed | Native-verified |
|---|---|---|---|
| EN | ✅ | ✅ | n/a — source, authored and edited in English |
| ES | ✅ | ✅ | — |
| JA | ✅ | ✅ | — |
| FR | ✅ | ✅ | — |
| DE | ✅ | ✅ | — |

Tier 2 scope: full page. All five deferred terms audited across every instance; register
matched to `mike-moran` precedents; rendered output read in-browser for all four locales;
CSS confirmed byte-identical to source.

### `what-is-technical-marketing.html`

| Locale | Structural | Claude-reviewed | Native-verified |
|---|---|---|---|
| EN | ✅ | ◐ | n/a — source |
| ES | ✅ | ◐ | — |
| JA | ✅ | ◐ | — |
| FR | ✅ | ◐ | — |
| DE | ✅ | ◐ | — |

**Tier 2 is partial and the gap is large.** Only two things were examined on this
9,572-word page: the `talk-to-listen ratio` instance in all four locales, and the JA
`働く定義` → `実務上の定義` heading. **The rest of the page has never been reviewed in any
locale.** It passes structural checks, which is not the same as having been read.

### `contributors/mike-moran.html`

| Locale | Structural | Claude-reviewed | Native-verified |
|---|---|---|---|
| EN | ✅ | — | n/a — source |
| ES | ✅ | ◐ | — |
| JA | ✅ | ◐ | — |
| FR | ✅ | — | — |
| DE | ✅ | — | — |

Tier 2 scope: ES title suffix only. Known unfixed defects are parked in `glossary.md`
§ 6.4 — ES untranslated biblio kicker, ES and DE JSON-LD `url` pointing at the English
address, JA untranslated `skip-link` and `Website` label. The page was mined for
conventions, not reviewed.

### `any-questions-so-far.html`

| Locale | Structural | Claude-reviewed | Native-verified |
|---|---|---|---|
| EN | ✅ | ◐ | n/a — source, copy locked |
| ES | ✅ | ✅ | — |
| JA | — | — | — |
| FR | — | — | — |
| DE | — | — | — |

Tier 2 scope on EN: term map only (`any-questions-term-map.md`) — the terminology surface
was inventoried, the prose was not reviewed.

**ES is complete** — all seven sections, front matter, afterword, bio, notes, folio and
footer. Zero English prose remains in the body.

- Structural ✅ — `seo-check` and `term-check` both pass, CSS byte-identical to source,
  hreflang `en es x-default` reciprocal on both pages, sitemap entry added.
- Claude-reviewed ✅ — full page. Copley 13 tokens split 11 plan / 2 `Marriott Copley` /
  1 bare `el Marriott`, matching the English exactly; the talk-to-listen chain carried
  through rail, eyebrow, plate caption, callout, Cohan's answer and stat card; the three
  distinct ratios kept separate; `curse of knowledge` correctly rendered
  `la maldición del conocimiento` per § 5.3 with zero English instances; rendered output
  read in-browser with the network log checked for broken assets.

### All other pages

Every remaining page — the locale essays, `glossary.html`, `index.html`, the hub pages —
sits at **structural only**. They predate this session and have never been read for
terminology or register. Known gaps are recorded in `tools/seo-check-ignore.txt` and
`glossary.md` § 5.6 and § 6.4.

---

## Maintenance

Update a row when its state actually changes. In particular:

- Do not mark tier 2 ✅ for a page where only one defect was fixed. Use ◐ and state the
  scope, as with `what-is-technical-marketing.html` above.
- Do not infer tier 3 from consistency with a page that is itself only tier 2.
- When native feedback arrives, record **what was reviewed and by whom** alongside the
  ✅ — partial native review of one section is not the same as the whole page.
