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
| JA | ✅ | ✅ | — |
| FR | ✅ | ✅ | — |
| DE | ✅ | ✅ | — |

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

**JA is complete** — all seven sections plus front matter, afterword, bio, notes, folio
and footer. Zero English prose in the body.

- Structural ✅ — both checkers pass, CSS byte-identical, hreflang `en ja es x-default`
  reciprocal across all three pages, sitemap entry added.
- Claude-reviewed ✅ — full page. Copley 13 tokens matching the English split; the
  talk-to-listen chain carried through every structural position; `curse of knowledge`
  rendered 知識の呪い and `Lead churn` リードチャーン per § 5.2–5.3; the rejected
  提示と質問の比率 kept at zero with pitching-to-questioning distinguished as
  ピッチと質問の比率; rendered output read in-browser.
- **Two character-corruption defects were produced during drafting** (Cyrillic fused into
  Japanese words) and fixed. `seo-check` CHECK 9 now catches this class mechanically; it
  was verified against both instances retroactively.

**FR is complete** — all seven sections plus front matter, afterword, bio, notes, folio
and footer. Zero English prose in the body.

- Structural ✅ — both checkers pass, CSS byte-identical to source, hreflang
  `en ja es fr x-default` reciprocal across all four locale pages, sitemap entry added.
  Rendered output loaded in-browser with the network log checked — all nine images
  resolve via root-relative paths, no repeat of the ES `/es/Images/` defect. Langpicker
  dropdown confirmed showing all four locales with the active one highlighted.
- Claude-reviewed ✅ — full page, verified with bounded manual listings (not aggregate
  counts, after an earlier unbounded-slice miscount was caught before being reported).
  Copley matches the English exactly at 11 plan / 2 hotel across the whole page. The
  talk-to-listen chain is named explicitly in the rail and §III eyebrow
  (`Le talk-to-listen ratio`) rather than the generic `Le Ratio` the English literally
  uses there — the deliberate fix the term map exists to enforce — carried through the
  plate caption, callout, both bare forms in Cohan's answer, and the stat card.
  `pitching-to-questioning` renders as `le rapport entre pitch et questions`, confirmed
  distinct from both FR rejected-rendering rows. `curse of knowledge` renders
  `la malédiction de la connaissance` per § 5.3.
- The FR/DE columns of the pitch/questions collision table (glossary § 6.1) were coined
  and recorded before this page's prose began, so the decision was never only implicit.
- Two register calls flagged and approved before finishing: "truth with a capital T" →
  "la vérité avec un grand V" (letter swapped to preserve the wordplay, since French
  needs vérité's V rather than English's T), and "the whole move" → "toute la manœuvre"
  (colloquial register match).

**DE is complete** — all seven sections plus front matter, afterword, bio, notes, folio
and footer. Zero English prose in the body.

- Structural ✅ — both checkers pass, CSS byte-identical to source, hreflang
  `en ja es fr de x-default` reciprocal across all five locale pages, sitemap entry
  added last, after full verification. Rendered output loaded in-browser: masthead,
  langpicker dropdown confirmed showing all five locales (both from the DE page and
  reciprocally from EN) with the active one highlighted, and all nine image paths
  confirmed root-relative (`/Images/...`) by source grep — no repeat of the ES
  `/es/Images/` defect. `read_network_requests` itself returns nothing for local
  `file://` previews in this environment, so image resolution was confirmed by path
  grep plus visual inspection rather than a network log, unlike the FR check.
- Claude-reviewed ✅ — full page, bounded manual listings. Copley matches the English
  exactly: 11 unhyphenated `Copley Plan` + 1 attributive compound
  (`der Copley-Plan-Jahre`, standard German hyphenation for a multi-word phrase used as
  a noun modifier — the same pattern already on the site in `Great-Demo-Ansatz` and
  `Long-Context-Modell`) + 2 `Marriott Copley`, split identically to the English body.
  The talk-to-listen chain is named explicitly in the rail, §III eyebrow, video
  aria-label, plate caption and stat card (5 positions) — matching the English's own
  5 generic-"The Ratio" positions exactly, expanded to the explicit settled term per
  the deliberate term-map fix, not copied as-is. The distinct
  Prospect:Vendor Statement Ratio reference in the §III question (linked to
  `#prospect-vendor-statement-ratio`) correctly stays a separate, undecorated
  `dieses Verhältnis` rather than being folded into talk-to-listen ratio.
  `pitching-to-questioning` renders `das Verhältnis von Pitch zu Fragen`, confirmed
  distinct from both DE rejected-rendering rows. `curse of knowledge` renders
  `der Fluch des Wissens` (3×, zero English instances). `Great Demo!` is used
  consistently as the book title throughout; no methodology-only usage appears in this
  article, so the book/methodology homograph never becomes a live risk here.
- **One term-check.mjs gap found and fixed, not a translation defect.** The checker's
  literal-substring count flagged DE at 14 "Copley Plan" instances against the
  English's 15, because German attributive-compound hyphenation
  (`Copley-Plan-Jahre`) is orthographically correct and required — writing it
  unhyphenated would have been the actual grammar error. `tools/term-check.mjs`'s
  counting was hardened to accept a settled multi-word term written with hyphens in
  place of spaces (`termCountRe`), rather than changing correct German prose to
  satisfy a literal string match. This is a general fix, not DE-specific, and applies
  to every locale and every settled multi-word term going forward.
- Raw-umlaut/eszett scan: 0 matches full-page, confirmed after fixing `amüsant`,
  `amüsiert`, `Marktübersicht` (pass 1) and `Broschüren` (pass 3) — all four were typed
  as literal UTF-8 instead of the site's `&uuml;` entity convention and caught by the
  per-batch scan this session added specifically for DE.
- Two character-corruption defects from earlier locales (Cyrillic-Latin fusion in JA)
  did not recur in DE; CHECK 9 ran clean at every pass boundary and on the full page.
- The ringi/hanko passage (§V) was translated as first-person comparative testimony —
  Cohan describing US, German/French/Belgian, Dutch and Japanese meeting norms
  side by side with symmetric treatment — mirroring the already-approved JA and FR
  renderings of the same passage exactly. Nothing in it edges further toward the
  deferred §5.5(b) institutional-framing question than what JA/FR already carry; it is
  noted here per standing instruction, not newly resolved.

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
