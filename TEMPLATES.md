# Creating templates

**Short answer:** a template is a CSS block, a metadata entry, and nothing else. No new component, no new data model, no change to the form.

---

## Why it's this small

The pivot moved every structural decision out of the document and into code:

- **Content** lives in `content.*`, keyed by section type
- **Section order and headings** come from `getRenderableSections()`
- **All visual choice** resolves to CSS custom properties emitted by `designTokenStyle()`

So a template can only vary one thing — how it styles the block structure every template already receives. That's the whole authoring surface, and it's what makes the choose-then-fill flow work: the user's content is never shaped by the template, so it flows into whichever one is selected.

---

## Adding a template, end to end

Say we're adding `compact` — a one-page-focused variant.

### 1. Add it to the union

```ts
// packages/resume-core/src/index.ts
export type TemplateId = "atlas" | "meridian" | "compact";
```

TypeScript exhaustiveness immediately fails every `Record<TemplateId, …>` until the remaining steps are done. That's intentional — it's the same guard the section registries use.

### 2. Add the metadata entry

```ts
// apps/web/src/design-tokens.ts
export const TEMPLATES = {
  atlas:    { … },
  meridian: { … },
  compact: {
    label: "Compact",
    description: "Fits more on one page. Tighter rhythm, minimal headings.",
    supportsPhoto: false,
  },
} as const satisfies Record<TemplateId, …>;
```

This is what the chooser and `DesignPanel` render. Both pick it up automatically — neither has a hardcoded template list.

### 3. Write the CSS block

```css
/* apps/web/src/templates.css */

.resume-page[data-template="compact"] .resume-header { … }
.resume-page[data-template="compact"] .resume-section h3 { … }
.resume-page[data-template="compact"] .resume-item { … }
```

**Read from the custom properties, never hardcode sizes:**

```css
/* yes */
font-size: calc(var(--resume-font-size) * var(--resume-type-ratio));
margin-top: var(--resume-gap-section);

/* no — breaks the token surface, user controls stop working */
font-size: 15px;
margin-top: 12px;
```

A template that hardcodes sizes silently disables Text size, Spacing and Margins for anyone who picks it, and breaks Tighten, which works by varying exactly those tokens.

### 4. Section order, if it differs

Order lives in `getRenderableSections()` and is currently keyed on `meta.profileType`, not on template. That's probably right — whether Education precedes Experience depends on *where the person is in their career*, not on which visual style they picked. Only key it on template if a template genuinely demands a different reading order.

### That's the whole checklist

1. Union member · 2. Metadata entry · 3. CSS block · 4. Order, only if it differs

No component, no form change, no schema change, no migration.

---

## Constraints a template must respect

**Render every section type (A9).** A template may style a section distinctively; it may never refuse one. The conformance test enforces this — it iterates `SECTION_TYPES` and asserts the rendered `data-block-id` sequence matches what core extracts.

**Never change the DOM order of blocks.** Pagination measures blocks in document order. A template that visually reorders content with `flex-direction: row-reverse` or `order:` will paginate wrongly and break ATS parsing, which reads DOM order. Style freely; reorder never.

**Keep `break-inside`/`break-after` rules intact.** The base `.resume-item` and heading rules are the CSS half of the orphan/widow story. The measured engine decides breaks; print has to agree.

**No `@media print` overrides.** Plan §9.2 — if a template needs different print styling than screen styling, the print path has forked from the preview and the parity guarantee is gone.

**Contrast.** If a template introduces a new colour role, it needs the same ≥ 4.5:1 check the accents got. The ratios in `ACCENTS` are recorded so a regression is visible.

---

## Testing a new template

1. `npm run test:spike-a` — parity holds for the new template at A4 and Letter
2. Conformance test — passes automatically once the registries typecheck
3. Switch through every template and back, assert content-schema invariance
4. Render `fixture-3page.v2` and confirm no orphaned section headers or stranded bullets
5. Eyeball the token corners: smallest text × tightest spacing × narrowest margins, and the opposite

---

## The choose-then-fill flow

`TemplateChooser` shows on first run — when `loadWorkingDocument()` returns `null`. It sets `design.templateId` and `design.accent` on a blank document, then hands off to the editor.

**Thumbnails are live renders at 0.3 scale, not screenshots.** A screenshot is a second source of truth that goes stale the first time a template changes and nobody notices. A scaled render of the real component cannot drift.

Choosing at the start and switching later are the *same operation* — `design.templateId` is one field, and content is untouched by it. So the chooser is a convenience, not a commitment, and the copy says so: *"You can change this at any time."* Trapping someone in a template they picked before seeing their own content in it would be the single most annoying thing this app could do.

> **One integration caution.** The chooser mounts `ResumePreview` once per template, so several copies of every `data-block-id` exist in the DOM while it's open. That's safe only because the chooser and the editor are never mounted together, and `/?measure=1` renders neither. Keep them mutually exclusive — if a thumbnail ever appears alongside the editor preview, measurement will start reading the wrong nodes, and it will fail quietly rather than loudly.
