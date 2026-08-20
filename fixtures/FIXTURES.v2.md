# Fixtures — schema v2

**Owner:** Claude · **Consumer:** Codex (Spike A parity, Spike B, CI parity test, conformance test)
**Replaces:** `FIXTURES.md` (v1, ten section types)

Two fixtures, authored directly against schema v2. These replace the migrate-at-load-time arrangement — the v1 files can now be kept purely as migration test input, which is a better job for them anyway.

> **Do not "clean up" these fixtures.** Several blocks are deliberately awkward. Each hazard below forces a specific break condition. Check this document before editing anything that looks like a typo or an oddly long sentence — you are probably looking at the test.

| File | Purpose |
|---|---|
| `fixture-1page.v2.json` | Baseline. Fits one A4 page at `normal` tokens. |
| `fixture-3page.v2.json` | Hostile. **3 A4 pages, two break boundaries**. |

## Retuned for real DOM measurement

The first v2 rebuild was sized against the synthetic `measureFixtureBlock`. Under real measurement it came out at **2 pages, one break boundary** — as expected, and the reason the synthetic constants were never worth carrying forward.

Measured baseline that drove the retune:

| Size | Total block height | Page box | Pages | Break |
|---|---:|---:|---:|---|
| A4 | 1258.44 | 842 | 2 | `experience:item:x5` |

The current 3-page band is `1684 < total < 2526` at A4. Target chosen: **~1900**, central in the A4 band rather than near either edge.

**26 blocks added** (51 → 77), by deepening existing entries rather than inventing jobs — three more roles would have made a fourteen-year timeline implausible, and extra bullets exercise the hazards better anyway. Added: bullets on both education items, more bullets on `x2`/`x3`/`x4`/`x5`/`x7`, one new advisory role `x8`, a fifth skills group, two more hobbies.

Estimated total **1778–2038** depending on how many added bullets wrap to two lines. Every point in that range sits inside the A4 3-page band, so the retune should be robust rather than knife-edge.

**Unverified without the real measurer:** whether a break lands near `skills`/`hobbies`/`references` and therefore actually exercises **H3**. The arithmetic suggests page 3 begins inside `skills`, which would put the skills section header at risk of stranding at the foot of page 2 — the intended H3 condition. Confirm from `pages[].usedHeight` on the next `npm run test:spike-a`; if the boundary lands elsewhere, this needs one more small pass.

Prior synthetic-measurement result, kept for reference only — these break IDs are not expected to reproduce:

```
fixture-1page.v2  A4: 1p   orphans=0  widows=0
fixture-3page.v2  A4: 3p   breaks=[experience:item:x7, hobbies:item:h2]
```

---

## Hazards, mapped from v1

| v1 | v2 | Status |
|---|---|---|
| **H1** six-bullet entry that must split | `experience.x1` — six bullets, several long | ✅ carried over intact |
| **H2** long bullets near the wrap boundary | `x1b1` (258 chars) and `x3b1` (189 chars) — **texts carried over verbatim** | ✅ this is the text-wrap probe; it must not drift |
| **H3** short trailing sections stranding headers | `hobbies` (3 short items) and `references` (one line) at document end | ✅ **restored** — these now play the role awards/volunteer did |
| **H4** single- and two-bullet entries after long ones | `x5` (two bullets), `x6` and `x7` (one each) | ✅ carried over |
| **H5** many links incl. a long custom label | four links, one `custom` labelled "Work authorisation" | ✅ carried over |
| **H6** every section type present | all six of the v2 set | ✅ retargeted |
| **H7** two payload shapes for one type | dropped — `custom` no longer exists | ⛔ obsolete |
| **H8** hidden-section sentinel | **repurposed** — see below | ✅ stronger than before |
| **H9** *(new)* item with a summary **and** a single bullet | `x6` (ledgerkit) | ✅ new — see "What the rebuild surfaced" |
| **H12** *(new)* deep bullet runs that force mid-entry splits | `x2` (8 bullets), `x3` (7 bullets) | ✅ added in the retune; more mid-entry break opportunities than `x1` alone provided |
| **H10** null-vs-absent optionals | absent `location` on `x6`, absent `summary` on most items, empty `bullets: []` on education | ✅ carried over |

### H8, repurposed — `references.mode` sentinel

Section visibility no longer exists, so the old hidden-section sentinel has no target. It now probes something better.

`content.references.mode` is `"onRequest"`, **and the `items` array is deliberately populated** with a referee named:

> `SENTINEL — if this name appears in any rendered output, references.mode is not being respected`

In `onRequest` mode the renderer synthesises its own pseudo-item and must ignore `items` entirely. Grep the rendered DOM and the extracted PDF text for `SENTINEL`. It must appear in neither.

This is a stronger test than the v1 version: it catches a mode-handling bug rather than a visibility-filter bug, and it cannot be defeated by reordering the way the v1 sentinel could.

### H11 — new, needed separately

An **empty section must render nothing in either path**. Not encoded in either fixture, because an empty section is invisible by construction and there's nothing to assert against inside a populated document. Suggest a third tiny fixture, or a unit test that sets `content.hobbies.items = []` and asserts no `hobbies` blocks and no `hobbies` DOM node.

---

## What the rebuild surfaced

Two things worth acting on. Neither is caused by the rebuild — the rebuild exposed them.

### R1 — Keep-run treats a `summary` block as "the first child", so bullets can still strand

`getMinimumKeepRunHeight` keeps an item together with its **first following block**. When an item has a `summary`, that first block *is* the summary — so the keep-run is satisfied by heading + summary, and every bullet can still be pushed to the next page.

Originally reproduced before A4-only page sizing, at `experience.x6`:

```
page 1 ends  : x6 heading + x6 summary
page 2 starts: section:experience:item:x6:bullet:x6b1   <-- its only bullet
```

The reader sees a job title and a one-line description at the foot of a page, with the entire substantive content overleaf. That is the defect F2 was fixed to prevent, surviving in the case where a summary is present.

**Suggested fix:** the keep-run unit should be *item + summary (if present) + first bullet*, not *item + next block*. `getFirstItemChildHeight` should skip over `item-summary` / `item-detail` kinds to find the first `bullet`, and include both.

This is why `x6` is now hazard H9 — it's a realistic shape (a role with a one-line description and a single achievement) and nothing in the v1 fixtures had it.

### R2 — `getRenderableSections` puts Education before Experience, for everyone

```ts
// index.ts:196-203
getSummarySection, getEducationSection, getExperienceSection, getSkillsSection, …
```

Education-first is correct for a student or recent graduate. It is wrong for essentially everyone else — the convention past roughly two years of work is Experience first, and `fixture-3page.v2` (a principal engineer with fourteen years) currently renders education above it.

The pivot said section order is **template-owned**. Right now it's owned by a single hardcoded array shared by every template and every profile.

**Suggested fix:** section order becomes a property of the template, with `meta.profileType === "earlyCareer"` as the one documented override that promotes Education. Two orderings, one rule, no user-facing control — consistent with "the user cannot alter the layout."

---

## Product decision encoded here: `references.mode`

Both fixtures use `"onRequest"`, which always synthesises an item, so **every resume currently renders a References section with no way to omit it** — the only escape is `"listed"` with zero items, which reads as a bug rather than an intent.

**Recommendation: add a third mode, `"omitted"`, and make it the default.**

An empty References form panel should produce nothing; "Available upon request" and a listed set of referees are both opt-ins. The form panel offers all three as a content choice, which is information rather than layout, so it stays inside the pivot's constraint.

**The default must not vary by template.** It's tempting to default `atlas` (US résumé, where "available upon request" reads as filler) to `omitted` and `meridian` (CV, where referees are often expected) to `onRequest` — but a template-dependent default means **switching templates mutates content**, which breaks the lossless-switching invariance test. Whatever we choose, it must be one template-independent default. That argues for `omitted`.

---

## Content notes

All names, organisations, institutions, credentials, URLs and contact details are fictional. Phone numbers are non-routable, every domain is `example.com` or a subdomain. `dateOfBirth` is present on `fixture-3page.v2` specifically to exercise the DOB guidance path described in `PIVOT-v3.md` §3.2. Content is realistic in *shape* — length distribution, bullet density, date coverage — because that shape is what the pagination engine is tested against.
