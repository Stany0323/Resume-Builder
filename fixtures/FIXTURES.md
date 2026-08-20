# Spike A / Spike B test fixtures

**Owner:** Claude (schema & content) · **Consumer:** Codex (Spike A parity, Spike B measured layout, Sprint 1 CI parity test)

Two committed JSON fixtures conforming to schema v1. They are inputs to the pagination parity test and, from Sprint 1 onward, to the CI parity check.

> **Do not "clean up" these fixtures.** Several blocks are deliberately awkward. Each hazard below exists to force a specific break condition. If a fixture looks like it has a typo or an oddly long sentence, check this document before editing — you are probably looking at the test.

---

## Files

| File | Purpose |
|---|---|
| `fixture-1page.json` | Baseline. Should fit one page at `normal` tokens on both A4 and Letter. Proves the simple case and catches gross regressions. |
| `fixture-3page.json` | Hostile. Engineered to force breaks in the worst available places and to break *differently* at A4 vs Letter. |

Both must be rendered at **A4 and Letter** in every run. Parity on one page size proves nothing about the other (see plan §3).

---

## Why `fixture-3page` is shaped the way it is

### H1 — Six-bullet entry that must split
`i2` (Ndoro Infrastructure Group) carries six bullets, several of them long. At most token combinations this entry cannot fit on one page, so the engine must split it and decide where. **Tests:** mid-entry break handling; that a split entry does not lose its role/organisation context.

### H2 — Very long bullets near the wrap boundary
`b1` and `b12` are ~230 and ~200 characters. At normal type scale these wrap to 3 and 2–3 lines respectively.

**This is the A4/Letter divergence probe.** A4 is 6mm narrower than Letter, so these bullets wrap to a different line count on each. Different line count → different block height → different break position downstream. If your parity test passes at both sizes with *identical* break indices, either the test is not actually varying page size, or the page box is not being propagated to the renderer.

### H3 — Sections short enough to strand their headers
`s8` (Awards, one item), `s9` (Volunteer), `s10` (Languages) are deliberately short and sequenced late, where accumulated content pushes them near page boundaries. **Tests:** orphaned section header rule — a header must never render as the last element on a page.

### H4 — Single-bullet and two-bullet entries after long ones
`i6` (two bullets) and `i8` (one bullet) follow much longer entries. **Tests:** widow rule — a lone trailing bullet stranded at the top of a following page.

### H5 — Six contact items including a custom-labelled one
The header carries six contacts, one with `type: "custom"` and a long label (`Work authorisation`). **Tests:** header wrapping, contact ordering, and that a custom label does not break the header layout.

### H6 — Every section type appears at least once
`summary · experience · projects · publications · education · skills · certifications · awards · volunteer · custom` — all present. **Tests commitment A9:** every template must render every section type. A template that silently drops `publications` fails here rather than in production.

### H7 — Two `custom` sections with different payload shapes
`s10` uses `text`; `s11` exists to test visibility. **Tests:** the custom payload is genuinely flexible.

### H8 — A hidden section that must not render
`s11` has `visible: false` and contains the string **"If this text appears in any rendered output, section visibility is broken."** Grep the rendered output and the extracted PDF text for it. It must appear in neither. **Tests:** visibility is respected in *both* render paths — a class of bug that otherwise ships silently.

### H9 — Hyphenated surname and long headline
`Tendai Mukamuri-Nyathi`, `Principal Engineer, Distributed Systems`. **Tests:** name wrapping and hyphenation behaviour in the header, which differs between the two page widths.

### H10 — Null-vs-absent optional fields
`summary: null` on several items, `credentialId: null`, `url: null`, `photo: null`, empty `bullets: []`. **Tests:** the renderer distinguishes "absent" from "empty" and emits no stray separators, empty rules, or orphaned punctuation.

---

## Section payload shapes

Schema v1 in the plan spelled out only the `experience` payload. These fixtures pin down the rest. Treat this table as the normative definition until it moves into the repo's schema file.

| Section type | Item payload |
|---|---|
| `summary` | `text` |
| `experience` | `role`, `organization`, `location?`, `startDate`, `endDate`, `summary?`, `bullets[]` |
| `education` | `degree`, `institution`, `location?`, `startDate`, `endDate`, `detail?`, `bullets[]` |
| `skills` | `groupLabel`, `entries: string[]` |
| `projects` | `name`, `role?`, `url?`, `startDate?`, `endDate?`, `summary?`, `bullets[]` |
| `certifications` | `name`, `issuer`, `date`, `credentialId?` |
| `awards` | `name`, `issuer`, `date`, `detail?` |
| `publications` | `title`, `venue`, `date`, `url?` |
| `volunteer` | `role`, `organization`, `location?`, `startDate`, `endDate`, `bullets[]` |
| `custom` | `title?`, `text?`, `bullets[]` |

Common to every item: `id`, `order`, `visible`.

**Note on `skills`:** `entries` is a `string[]` rather than a bullet list, because skills are rendered as inline runs or grids, not as bullets. This is the one section type whose items are not bullet-bearing — flagging it because it will be the one that breaks a naive "every item has bullets" assumption in the renderer.

---

## What Spike A should assert

1. Break positions (index of the first block on each page) are **identical between browser preview and headless-Chromium export**, for both fixtures, at both page sizes, across Chrome/Safari/Firefox previews.
2. Break positions **differ between A4 and Letter** on `fixture-3page` — if they don't, page size is not reaching the renderer (see H2).
3. `fixture-1page` occupies exactly one page at `normal` tokens on both page sizes.
4. The H8 sentinel string appears in no rendered output and no extracted PDF text.
5. Embedded font hashes match between client and render service.

## What Spike B should assert

`paginate(blocks, pageBox)` reproduces Spike A's **export** break positions on `fixture-3page` at both page sizes, and a speculative re-run across three density values returns differing page counts in under 50ms without rendering.

Per plan §12.1: cache measurements by block identity + content hash + template + font + page width + type scale + density + margin. Do not assume measurements transform arithmetically across density or type-scale changes — H2 is precisely the case where that assumption fails.

---

## Content notes

All names, companies, institutions, credentials, URLs, and contact details are fictional. Phone numbers use a non-routable pattern and every domain is `example.com` or a subdomain of it. The content is realistic in *shape* — length distributions, bullet density, date coverage — because that shape is what the pagination engine is being tested against.
