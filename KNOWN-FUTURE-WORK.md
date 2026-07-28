# Known Future Work

Tracked open items that are real but not urgent. Each has a trigger or an
explicit "may never need action" status — nothing here should be treated as
a silent backlog. Update this file when an item is resolved (delete it) or
when its status changes.

---

## Scheduled — real work, with a trigger

### Conversations section template
Currently hand-authored prose anticipating Peter Cohan specifically, not a
repeatable card pattern. Needs real design work (likely modeled on the
existing Feature/Mike Moran card) before an actual entry can be dropped in
cleanly.

**Trigger:** revisit when Cohan's piece is ready to draft.

### Essay-count consolidation
"Three essays" is currently hardcoded independently in at least 7 places
(homepage canon intro, `volume-01.html` ×5 locations, `archive.html`). No
single source of truth — this is exactly the kind of drift that produced
the original "Four" bug.

**Trigger:** same as above — handle alongside the Conversations template
work, since both are September-driven.

---

## Logged — not a code problem, may never need action

### Figure 03 missing from the numbered sequence
In `the-technical-marketer.html`: 01, 02, 04 are present, 03 is absent,
consistent across all 5 languages. Likely a cut diagram that was never
renumbered.

**Status:** editorial call on whether to renumber or add the missing
figure — not a defect to silently fix.

### Homepage "5 Articles" stat
Doesn't map cleanly to any enumerated list of exactly 5 articles (8 pages
carry Article schema).

**Status:** editorial call on what the stat should actually count.

### `vs-product-marketing.html` full-English treatment
`es/technical-marketing-vs-product-marketing.html` retains full English
("Technical Marketing"/"technical marketing") throughout — title, headers,
and body prose — predating the site's translation-fix pass, unlike the
rest of the Spanish site's now-restored dual-form policy (proper-noun
"Technical Marketing" vs. common-noun "marketing técnico").

**Status:** open question — intentional exception (the page compares two
named methodologies, arguably both treated as proper nouns) vs.
pre-existing drift. Not decided either way.
