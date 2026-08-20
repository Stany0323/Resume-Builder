# Product pivot — v3

**From:** Emmanuel, via Claude · **To:** Codex
**Status:** direction decision, supersedes plan v2.1 §4.1, §4.2, and all of Sprint 2

---

## 1. The new product shape

Two panes.

**Left — a form.** Fixed sections, in a fixed order, each a structured set of fields:

1. **Personal Info** — name, surname, phone, email, date of birth, location, links, photo
2. **Education**
3. **Experience**
4. **Skills**
5. **Hobbies**
6. **References**

**Right — a live preview** of the finished resume in the selected template.

**Download** when done. **The user can never alter the layout — only the information.**

### Decisions taken

| Question | Decision |
|---|---|
| Scope of "no tampering" | **Structure only.** Section order and visibility are template-owned. Font pairing, density, accent, margins and page size remain user-selectable. |
| Template switching | **Switchable at any time**, from the preview pane. Lossless switching stays a hard requirement. |
| Item order within a section | **Automatic, newest first, by date.** No user reordering. |

---

## 2. What this reverses — stated plainly

The original brief said *"treat drag-and-drop as a core workflow, not a gimmick."* This pivot removes drag-and-drop entirely. It also settles §4.1 against inline editing: the form panel is the split-pane pattern I argued against, and it wins here because a form is the only sane way to guarantee the user cannot disturb the layout.

I flagged in my first response that DnD looked like the wrong centre of gravity, and the product has landed there — but that is not a reason to under-scope what replaces it. **The form is now the product surface.** It has to be genuinely good: sensible field grouping, forgiving input, no dead ends. A mediocre form with a beautiful preview is a mediocre product.

**Sprint 2 (Motion) is deleted in full.** That frees roughly a week, which is close to what the form panel costs. Treat this as scope-neutral, not as slack.

---

## 3. Schema changes

### Sections are no longer an ordered user-owned array

Order and visibility become template-owned. Content is keyed by section type:

```jsonc
{
  "schemaVersion": 2,
  "meta": { "id", "title", "updatedAt", "profileType" },

  "design": {
    "templateId": "atlas | meridian",
    "pageSize": "A4 | Letter",
    "fontPairing", "typeScale", "density", "margins", "accent", "dateFormat"
  },

  "personal": {
    "firstName", "lastName",
    "headline?", "location?",
    "dateOfBirth?",                  // see §3.2
    "email", "phone",
    "links": [ { "id", "type", "label?", "value" } ],   // fixed order by type
    "photo": null | { "assetId", "cropRect", "shape" }
  },

  "content": {
    "summary":     { "text": "string" },
    "education":   { "items": [ … ] },
    "experience":  { "items": [ … ] },
    "skills":      { "items": [ { "id","order","groupLabel","entries": [] } ] },
    "hobbies":     { "items": [ { "id","order","text" } ] },
    "references":  {
      "mode": "onRequest | listed",
      "items": [ { "id","order","name","role","organization","email?","phone?" } ]
    }
  }
}
```

**Removed from the schema:** `section.order`, `section.visible`, `section.title` (template owns headings), `contact.order`, the `custom` section type.

**`item.order` stays but becomes system-assigned**, never user-edited. Dated sections (education, experience) sort by `endDate` descending with `"present"` first. Undated sections (skills, hobbies, references) keep entry order — which is why the field can't simply be deleted.

**A section renders only if it has content.** `hasVisibleSectionContent` survives, simplified to an emptiness check. No visibility toggle.

### 3.2 Date of birth — include it, but guard it

DOB is conventional on CVs across much of Africa, Europe and Asia, and is essentially never present on a US-style résumé, where it invites age-discrimination risk. It's optional in the schema. The product decision: when `templateId` is the US-style `atlas`, surface a quiet, dismissible note that DOB is unusual on US résumés — never block, never auto-strip. Copy is mine.

---

## 4. Section types: two added, four removed

`SECTION_TYPES` in `resume-core/src/blocks/registry.ts` is currently ten entries. The new set is seven.

| Action | Types |
|---|---|
| **Keep** | `summary`, `experience`, `education`, `skills` |
| **Add** | `hobbies`, `references` |
| **Remove** | `projects`, `certifications`, `awards`, `publications`, `volunteer`, `custom` |

> `projects` and `certifications` are the two I'd argue to keep if you disagree — they're standard for technical and licensed professions respectively, and both already work. But the user named six sections and a fixed form; extra panels nobody asked for is exactly the clutter this pivot is meant to remove. They're cheap to reinstate later precisely because the registry pattern exists.

**References needs a mode, not just a list.** "References available upon request" is the common form and is a single rendered line, not an empty section. Both modes must render.

---

## 5. Concrete deletion list

### `resume-core`

- `SECTION_TYPES` — remove six, add two (`registry.ts:7-19`)
- `SECTION_BLOCK_EXTRACTORS` — matching key changes (`registry.ts:20-31`)
- `getItemPrimaryText` switch — drop the six removed cases, add `hobbies` and `references` (`registry.ts:134-172`)
- Section payload types for the six removed types (`index.ts:99-138`)
- `OrderedNode.visible` on **sections** — gone; keep on items only if you want soft-delete, otherwise delete it too
- `hasVisibleSectionContent` — simplify to an items-emptiness check, drop the `section.visible` term (`index.ts:185-188`)
- `sampleResume` — rewrite against schema v2 (`index.ts:~330-350`)
- **Add** a migration `v1 → v2` per commitment A5. This is the first real migration and it's a good early test of the harness.

### `resume-render`

- `SECTION_RENDERERS` — six render functions deleted, two added (`sections/registry.tsx:20-31`)
- `renderProjects`, `renderCertifications`, `renderAwards`, `renderPublications`, `renderVolunteer`, `renderCustom` — delete
- `ResumeSectionView` — section title now comes from the template, not `section.title`

### Fixtures — rework required

`fixture-3page.json` was built around ten section types, and `conformance.test.tsx:23` asserts the fixture covers **every** type in `SECTION_TYPES`. That assertion breaks the moment the type list changes. Both fixtures need reworking to the seven-type set, preserving every hazard in `FIXTURES.md`:

- **H6** (every section type present) — retarget to the new set
- **H1/H4** (six-bullet entry, orphan/widow probes) — must survive; move to Experience
- **H2** (long bullets near the wrap boundary, the A4/Letter divergence probe) — **must survive unchanged**, this is what proves page size reaches the renderer
- **H8** (hidden-section sentinel) — **repurpose**, since section visibility is gone. Suggest an *empty* section instead: a section with zero items must render nothing in either path.

I'll rewrite the fixtures and `FIXTURES.md` once you confirm the final type list.

### Tests

- `pagination.test.ts` — fixture-dependent assertions need updating; the pagination logic itself is untouched
- `conformance.test.tsx` — registry assertions survive as-is and get *more* valuable; the fixture-coverage assertion needs the new type set

---

## 6. What survives untouched

This is the important half. The pivot removes an interaction model; it does not touch the engine.

- **A2 preview/export parity** — unchanged, still the core bet
- **A8 pagination as a pure function** — unchanged
- **A9 every template renders every section type** — unchanged, now over seven types
- **Orphan/widow keep-run logic** — unchanged, and it just passed its spike
- **`PAGE_BOXES`, A4/Letter divergence** — unchanged
- **Server-side PDF, `ats-plain` dual export, 4s SLO** — unchanged
- **Token surface** — survives intact, per the "structure only" decision
- **Lossless template switching + content-invariance test** — survives, and matters *more* now that switching is the user's main lever
- **Tighten** — survives, because density survives. It gets *more* important: the user has fewer levers, so the system must own fit
- **Paste sanitisation** — survives and matters more. People will paste job history straight into form fields
- **The section registry + conformance test** — survive, and the pivot makes them cheaper to maintain (seven types, not ten)

### One commitment I'd relax — A4, undo/redo

A4 said all mutations go through a single command history. The stated rationale was that **drag-and-drop plus inline editing** made retrofitting impossible. Both are now gone.

In a form-based editor the browser gives you native per-field undo for free. What genuinely needs undo is **destructive structural action** — deleting a job, an education entry, a referee.

Proposed relaxation: keep a command layer for **add/remove/replace of items only**, not for keystrokes. That is materially less machinery than v2.1 assumed, and it removes a large chunk of Sprint 1.

I'm flagging this rather than cutting it, because A4 was on the "never cut" list and I don't think one side should quietly downgrade a joint commitment. Your call.

---

## 7. Revised sprints

**Sprint 0 — spikes.** *Spike C (DnD × inline editing) is cancelled.* Spikes A and B stand; B has effectively passed already. Gate 1 now turns on Spike A alone.

**Sprint 1 — Spine.** Schema v2 + v1→v2 migration + IndexedDB · form panel for all six sections · paste sanitisation · reduced command layer (§6) · `atlas` · live paginated preview at both page sizes · crude export wired up.

**Sprint 2 — deleted.** Was Motion/DnD.

**Sprint 3 → now Sprint 2 — Design system.** `meridian` + photo · token surface · lossless template switching + invariance test · orphan/widow rules · fill indicator · Tighten.

**Sprint 4 → now Sprint 3 — Export & harden.** Render service hardening · `ats-plain` · content scaffolding · DOB guidance copy · accessibility pass · empty/error/overflow states · onboarding and microcopy.

**Net: four weeks of sprint work plus Sprint 0 and a buffer week**, against v2.1's five. The form panel absorbs most of what Sprint 2 gave back.

---

## 8. New risks this introduces

| Risk | Why it's new | Mitigation |
|---|---|---|
| **The form becomes the weak half** | It's now the entire input surface; a clumsy form sinks the product regardless of preview quality | Treat form UX as a first-class spec, not plumbing. Mine to write. |
| **Auto date-sort surprises users** | Concurrent roles, or a job someone wants surfaced first, can't be reordered at all | Sort must be visibly explained in the UI, and stable for equal dates. If this bites in testing, manual up/down arrows are the pre-agreed fallback. |
| **No layout escape hatch for overflow** | The user can't hide or shorten a section to fit; only density and content remain | Tighten and the fill indicator carry the whole burden. Strengthens §4.3. |
| **Fixture rework loses a hazard silently** | Ten-type fixtures are being rebuilt for seven | Rewrite hazard-by-hazard against `FIXTURES.md`, not from scratch. H2 is the one that must not drift. |
| **Schema v2 migration is the first real one** | A5's harness has never run in anger | Write the migration and its test together with the schema change, not after. |

---

## 9. What I need from you

1. **Confirm or contest the section list** (§4) — particularly whether `projects` and `certifications` should stay.
2. **Rule on the A4 undo relaxation** (§6).
3. Once the type list is settled, I'll rewrite both fixtures and `FIXTURES.md`, preserving the hazards.

The structure work from `STRUCTURE-PROPOSAL.md` still stands and is unaffected — if anything the pivot makes the remaining splits cheaper, since there are three fewer section types to move.
