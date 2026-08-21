import type { CSSProperties } from "react";
import type { ResumeDocument } from "@resume-builder/core";

type Design = ResumeDocument["design"];

export const FONT_PAIRINGS = {
  source: {
    label: "Georgia",
    heading: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
    body: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  },
  neue: {
    label: "Helvetica",
    heading: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    body: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  contrast: {
    label: "Georgia + Helvetica",
    heading: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
    body: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  inverse: {
    label: "Helvetica + Georgia",
    heading: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    body: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  },
  didone: {
    label: "Didone",
    heading: '"Playfair Display", "Bodoni MT", Didot, "Times New Roman", serif',
    body: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  },
  system: {
    label: "System",
    heading: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
} as const satisfies Record<
  string,
  { body: string; heading: string; label: string }
>;

export type FontPairing = keyof typeof FONT_PAIRINGS;

const MONO_STACK =
  'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';

export const ACCENTS = {
  slate: { label: "Slate", value: "#3f4a5a", contrast: 8.98 },
  ink: { label: "Ink", value: "#1f2430", contrast: 15.52 },
  navy: { label: "Navy", value: "#1d3557", contrast: 12.36 },
  teal: { label: "Teal", value: "#14636b", contrast: 6.94 },
  forest: { label: "Forest", value: "#2b5d3a", contrast: 7.69 },
  plum: { label: "Plum", value: "#5b3a63", contrast: 9.42 },
  rust: { label: "Rust", value: "#8a3d24", contrast: 7.57 },
  burgundy: { label: "Burgundy", value: "#6d2740", contrast: 10.42 },
} as const satisfies Record<
  string,
  { contrast: number; label: string; value: string }
>;

export type Accent = keyof typeof ACCENTS;

const TYPE_SCALES = {
  compact: { base: "12px", ratio: "1.16" },
  normal: { base: "13px", ratio: "1.2" },
  relaxed: { base: "14px", ratio: "1.25" },
} as const satisfies Record<
  Design["typeScale"],
  { base: string; ratio: string }
>;

const DENSITIES = {
  compact: {
    line: "1.28",
    section: "0.7rem",
    item: "0.42rem",
    bullet: "0.14rem",
  },
  normal: { line: "1.38", section: "1rem", item: "0.62rem", bullet: "0.22rem" },
  relaxed: {
    line: "1.5",
    section: "1.35rem",
    item: "0.85rem",
    bullet: "0.32rem",
  },
} as const satisfies Record<Design["density"], Record<string, string>>;

const MARGINS = {
  tight: "40px",
  normal: "56px",
  wide: "76px",
} as const satisfies Record<Design["margins"], string>;

export const PAGE_DIMENSIONS = {
  A4: { width: "210mm", height: "297mm" },
} as const satisfies Record<
  Design["pageSize"],
  { height: string; width: string }
>;

export function designTokenStyle(design: Design): CSSProperties {
  const font =
    FONT_PAIRINGS[design.fontPairing as FontPairing] ?? FONT_PAIRINGS.source;
  const accent = ACCENTS[design.accent as Accent] ?? ACCENTS.slate;
  const type = TYPE_SCALES[design.typeScale] ?? TYPE_SCALES.normal;
  const density = DENSITIES[design.density] ?? DENSITIES.normal;
  const page = PAGE_DIMENSIONS.A4;

  return {
    "--resume-font-heading": font.heading,
    "--resume-font-body": font.body,
    "--resume-font-mono": MONO_STACK,
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

export const TEMPLATES = {
  meridian: {
    label: "Meridian",
    tagline: "Editorial",
    description:
      "Large light display name, dates in a left rail, generous air. Optional photo.",
    recommendedPairing: "neue",
    supportsPhoto: true,
    atsSafety: "excellent",
  },
  slate: {
    label: "Technical",
    tagline: "Technical",
    description:
      "Numbered sections, monospaced date rail, tight rhythm. Reads like good documentation.",
    recommendedPairing: "contrast",
    supportsPhoto: false,
    atsSafety: "excellent",
  },
} as const satisfies Record<
  Design["templateId"],
  {
    atsSafety: string;
    description: string;
    label: string;
    recommendedPairing: FontPairing;
    supportsPhoto: boolean;
    tagline: string;
  }
>;

export type TemplateId = keyof typeof TEMPLATES;

export function applyTemplate(design: Design, templateId: TemplateId): Design {
  return {
    ...design,
    templateId,
    fontPairing: TEMPLATES[templateId].recommendedPairing,
  };
}
