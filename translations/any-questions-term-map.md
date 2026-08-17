# Term Map — *Any Questions So Far?*

Risk inventory built from the **English source only**, before any translation, so every
locale pass starts knowing where the traps are instead of rediscovering them four times.

Source: `any-questions-so-far.html` · 6,199 body words · Volume 02 practitioner interview,
seven parts.

Read § B before translating. That section is the whole point of this document — § A is
what the checker already enforces, and § C–D are the obvious-once-stated cases.

---

## A. Settled glossary terms present — enforced by `tools/term-check.mjs`

Ten of the fourteen settled terms appear. All are **English in all four locales**, except
`Lead churn`, which is リードチャーン in JA.

| Term | Instances | Note |
|---|---|---|
| Copley Plan | 11 | highest-frequency term in the piece; also a place name, see § D |
| Reverse demo | 4 | |
| Curse of knowledge | 3 | **translated** in all four — see glossary § 5.3 |
| Gold demo | 3 | |
| Mount Stupid | 3 | |
| Visionary engineering | 3 | has a near-variant, see § B4 |
| Lead churn | 2 | リードチャーン in JA only |
| Talk-to-listen ratio | 1 | **but the concept appears 8×, see § B1** |
| Technical proof demo | 1 | |
| Vision generation demo | 1 | **but short forms appear 2×, see § B3** |

Six further glossary terms appear with **no settled decision**, so the checker will not
enforce them: `Demo` (45), `Discovery call` (8), `Ringi` (3), `Technical marketer` (3),
`Presales` (2), `Analyst briefing` (1). Follow the English-first convention; none needs a
new decision.

---

## B. High risk — one concept, many surface forms

This is where both defects found by hand this session came from: the English varies its
phrasing, each phrasing gets translated independently, and the reader can no longer tell
the mentions name one thing.

### B1. The talk-to-listen cluster — 8 mentions, 4 different surface forms

The single highest-risk item in the piece. Far worse than `contributors/peter-cohan.html`,
where the same concept had two forms.

| Surface form in English | Where |
|---|---|
| `Talk-to-listen ratio` | stat block: *"50% Vendor talk-to-listen ratio on a healthy discovery call"* |
| `Talk-to-listen` (bare) | *"First, talk-to-listen. Most tools report it now."* |
| `talk-to-listen` (bare) | *"vendor talk-to-listen is rarely under fifty percent"* |
| `Talk-to-listen: 50% or less` | Plate III film caption |
| **`The Ratio`** | **section title, Part III** |
| `the ratio` | *"How did the ratio travel from a live room to a published number?"* |
| `ratios` | *"What ratios should someone actually be looking at?"* |
| `the ratios` | closing list: *"the ratios, the reverse demo, the visionary question"* |

**Rule for every locale:** the term is `talk-to-listen ratio`, English, per glossary § 5.1.
Keep it English in all eight positions, including the bare forms. Where English drops
"ratio" for concision, the translation should still read as the same named thing rather
than becoming a generic word for *proportion*.

**The section title `The Ratio` is the sharpest trap.** Translated generically it becomes
*el índice* / *le rapport* / *das Verhältnis* / 比率 and stops naming the metric the
section is about — while the stat block four screens later still says
`talk-to-listen ratio`. That is precisely the defect, in the most visible position on the
page.

### B2. Three *different* ratios — do not conflate

The word "ratio" refers to three unrelated measurements:

| Ratio | What it measures | Treatment |
|---|---|---|
| `talk-to-listen ratio` | vendor speaking share on a call | settled English, § 5.1 |
| `pitching-to-questioning` | pitch-oriented vs question-oriented content | **not a settled term** — descriptive, translate |
| `sales-to-presales ratio` | headcount ratio, one-to-one vs one-to-many | **not a settled term** — staffing, translate |

`pitching-to-questioning` is the phrase that caused the original peter-cohan defect, where
it was the English source's paraphrase of talk-to-listen. **Here it is genuinely a second,
distinct metric** — Cohan names them in sequence: *"First, talk-to-listen… Second is
pitching-to-questioning."* Do not collapse them, and do not "fix" it to
`talk-to-listen ratio`.

### B3. `Vision generation demo` short forms

Settled term appears once in full. The article also uses `vision demo` and `vision demos`.
Keep all three English and recognisably the same artifact.

### B4. `Visionary engineering` vs `the visionary question`

`Visionary engineering` (3×) is the settled term. `the visionary question` (1×, closing
list) is a different noun phrase pointing at the same technique. Keep `visionary
engineering` English; `the visionary question` is descriptive prose and may translate —
but it must remain legibly connected to the settled term.

---

## C. Never translate

Proper nouns and titles of works. Standard convention, listed because this piece is dense
with them.

`Great Demo!` · `Doing Discovery` · `Suspending Disbelief` · `The Second Derivative` ·
`DemoGurus` · `Symyx Technologies` · `MDL Information Systems` · `Collaborative Drug
Discovery` · `IN2SV` · `StartX` · `Gong` · `Gartner` · `Marriott Copley` ·
`Discovery Tools` · `Any Questions So Far?` · `Never stop learning.`

---

## D. Homographs — same string, different referent

Each of these appears in two senses. Translating on autopilot merges them.

| String | Sense 1 | Sense 2 |
|---|---|---|
| **Copley** | `the Copley Plan` — the method (6×) | `the Marriott Copley` — a hotel in Boston where it was devised, over gin and tonics (2×) |
| **Discovery** | discovery — the sales activity (~25×) | `Discovery Tools` — the Symyx product line Cohan built (1×) |
| **Great Demo** | `Great Demo!` — the book, with exclamation mark (4×) | `the Great Demo methodology` / `approach` — the method named after it (3×) |
| **demo** | generic noun (~30×) | component of settled compounds: `reverse demo`, `gold demo`, `vision generation demo`, `technical proof demo` |

For `Great Demo`: the name stays English in both senses. The surrounding words
(*methodology*, *approach*) translate normally.

---

## E. What the checker covers here, and what it does not

`tools/term-check.mjs` will catch, on every locale file:

- any of the 8 recorded rejected renderings reappearing
- two known renderings of one settled concept in the same file
- a settled-English term present in the source but absent from the locale page
- a settled-translated term left in English

**It will not catch any of § B1's bare forms drifting.** The checker counts
`talk-to-listen ratio`; the English source contains that exact string **once**. The other
seven mentions use forms it cannot associate with the term. If `The Ratio` is translated
generically, the count check still passes.

**Therefore each locale must be read, not just checked.** § B1–B4 are the specific
passages to read for. When reporting a locale, state which findings came from the checker
and which from reading.
