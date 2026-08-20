import type { CSSProperties } from "react";
import type { ResumeDocument } from "@resume-builder/core";

type Design = ResumeDocument["design"];

/**
 * Design tokens → CSS custom properties.
 *
 * Every visual choice the user can make resolves to a custom property on the
 * `.resume-page` element. Templates then read those properties. This keeps
 * ONE render path (commitment A2): there is no per-token stylesheet and no
 * JavaScript layout branch, so preview and export cannot diverge on tokens.
 *
 * No hex input, no px input, no per-element overrides — every control is a
 * choice from a curated set (plan §6).
 */

/* --------------------------------------------------------- font pairings */

/**
 * Web-safe stacks only, deliberately. Self-hosted, licence-cleared webfonts
 * are still the plan, but until they land these keep the font-hash parity
 * check meaningful and add no dependency. Swapping a stack for a real family
 * later is a one-line change per pairing.
 */
export const FONT_PAIRINGS = {
  source: {
    label: "Georgia",
    heading: 'Georgia, "Times New Roman", serif',
    body: 'Georgia, "Times New Roman", serif',
  },
  neue: {
    label: "Helvetica",
    heading: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    body: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  contrast: {
    label: "Georgia + Helvetica",
    heading: 'Georgia, "Times New Roman", serif',
    body: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  inverse: {
    label: "Helvetica + Georgia",
    heading: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    body: 'Georgia, "Times New Roman", serif',
  },
  system: {
    label: "System",
    heading: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
} as const satisfies Record<string, { body: string; heading: string; label: string }>;

export type FontPairing = keyof typeof FONT_PAIRINGS;

/* ---------------------------------------------------------------- accents */

/**
 * All eight verified at ≥ 4.5:1 against white — AA for normal text, not just
 * large text, because the accent is used on section headings and rules.
 * Ratios are recorded so a future edit can't quietly regress one.
 */
export const ACCENTS = {
  slate: { label: "Slate", value: "#3f4a5a", contrast: 8.98 },
  ink: { label: "Ink", value: "#1f2430", contrast: 15.52 },
  navy: { label: "Navy", value: "#1d3557", contrast: 12.36 },
  teal: { label: "Teal", value: "#14636b", contrast: 6.94 },
  forest: { label: "Forest", value: "#2b5d3a", contrast: 7.69 },
  plum: { label: "Plum", value: "#5b3a63", contrast: 9.42 },
  rust: { label: "Rust", value: "#8a3d24", contrast: 7.57 },
  burgundy: { label: "Burgundy", value: "#6d2740", contrast: 10.42 },
} as const satisfies Record<string, { contrast: number; label: string; value: string }>;

export type Accent = keyof typeof ACCENTS;

/* ------------------------------------------------------------ type scales */

/** Scales the whole ramp proportionally — never individual elements. */
const TYPE_SCALES = {
  compact: { base: "12px", ratio: "1.16" },
  normal: { base: "13px", ratio: "1.2" },
  relaxed: { base: "14px", ratio: "1.25" },
} as const satisfies Record<Design["typeScale"], { base: string; ratio: string }>;

/** Affects section and item spacing only — not type size. */
const DENSITIES = {
  compact: { line: "1.28", section: "0.7rem", item: "0.42rem", bullet: "0.14rem" },
  normal: { line: "1.38", section: "1rem", item: "0.62rem", bullet: "0.22rem" },
  relaxed: { line: "1.5", section: "1.35rem", item: "0.85rem", bullet: "0.32rem" },
} as const satisfies Record<Design["density"], Record<string, string>>;

const MARGINS = {
  tight: "40px",
  normal: "56px",
  wide: "76px",
} as const satisfies Record<Design["margins"], string>;

/* ------------------------------------------------------------------ page */

export const PAGE_DIMENSIONS = {
  A4: { width: "210mm", height: "297mm" },
  Letter: { width: "8.5in", height: "11in" },
} as const satisfies Record<Design["pageSize"], { height: string; width: string }>;

/**
 * Builds the inline custom-property style for `.resume-page`.
 *
 * Unknown token values fall back to the `normal`/default entry rather than
 * throwing — an imported document with a token this build doesn't know about
 * should render slightly differently, not fail to render at all.
 */
export function designTokenStyle(design: Design): CSSProperties {
  const font = FONT_PAIRINGS[design.fontPairing as FontPairing] ?? FONT_PAIRINGS.source;
  const accent = ACCENTS[design.accent as Accent] ?? ACCENTS.slate;
  const type = TYPE_SCALES[design.typeScale] ?? TYPE_SCALES.normal;
  const density = DENSITIES[design.density] ?? DENSITIES.normal;
  const page = PAGE_DIMENSIONS[design.pageSize] ?? PAGE_DIMENSIONS.A4;

  return {
    "--resume-font-heading": font.heading,
    "--resume-font-body": font.body,
    "--resume-font-size": type.base,
    "--resume-type-ratio": type.ratio,
    "--resume-line-height": density.line,
    "--resume-gap-section": density.section,
    "--resume-gap-item": density.item,
    "--resume-gap-bullet": density.bullet,
    "--resume-margin": MARGINS[design.margins] ?? MARGINS.normal,
    "--resume-accent": accent.value,
    "--resume-page-width": page.width,
    "--resume-page-height": page.height,
  } as CSSProperties;
}

/* ------------------------------------------------------------- templates */

export const TEMPLATES = {
  atlas: {
    label: "Atlas",
    description: "US-style résumé. Serif, dense, ruled sections.",
    supportsPhoto: false,
  },
  meridian: {
    label: "Meridian",
    description: "International CV. Sans-serif, generous spacing, optional photo.",
    supportsPhoto: true,
  },
} as const satisfies Record<Design["templateId"], { description: string; label: string; supportsPhoto: boolean }>;
