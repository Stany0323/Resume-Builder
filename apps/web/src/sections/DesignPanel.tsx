import type { ResumeDocument } from "@resume-builder/core";
import {
  ACCENTS,
  FONT_PAIRINGS,
  TEMPLATES,
  applyTemplate,
  type Accent,
  type FontPairing,
  type TemplateId,
} from "@resume-builder/render";

type Design = ResumeDocument["design"];

/**
 * The complete customisation surface (plan §6). Every control is a choice from
 * a curated set — no hex input, no px input, no per-element overrides.
 *
 * Structure is absent by design: no section reordering, no hiding. The user
 * controls information and presentation, never layout.
 */

const TYPE_SCALES: Array<{ label: string; value: Design["typeScale"] }> = [
  { label: "Small", value: "compact" },
  { label: "Normal", value: "normal" },
  { label: "Large", value: "relaxed" },
];

const DENSITIES: Array<{ label: string; value: Design["density"] }> = [
  { label: "Tight", value: "compact" },
  { label: "Normal", value: "normal" },
  { label: "Airy", value: "relaxed" },
];

const MARGINS: Array<{ label: string; value: Design["margins"] }> = [
  { label: "Narrow", value: "tight" },
  { label: "Normal", value: "normal" },
  { label: "Wide", value: "wide" },
];

const PAGE_SIZES: Array<{ label: string; value: Design["pageSize"] }> = [
  { label: "A4", value: "A4" },
  { label: "Letter", value: "Letter" },
];

export function DesignPanel({
  design,
  onChange,
}: {
  design: Design;
  onChange: (patch: Partial<Design>) => void;
}) {
  return (
    <>
      <div className="template-choice">
        {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
          <button
            aria-pressed={design.templateId === id}
            className="template-option"
            key={id}
            onClick={() => onChange(applyTemplate(design, id))}
            type="button"
          >
            <span className="template-name">
              {TEMPLATES[id].label}
              <span className="template-tagline">{TEMPLATES[id].tagline}</span>
              {TEMPLATES[id].supportsPhoto ? <span className="photo-badge">Photo</span> : null}
            </span>
            <span className="template-description">{TEMPLATES[id].description}</span>
          </button>
        ))}
      </div>

      {/* Switching templates never loses content — order and headings are
          template-owned, everything you typed stays in the document. */}
      <p className="form-note">
        Switching templates keeps everything you’ve written, and brings that template’s typeface with it.
      </p>

      <Segmented
        label="Page size"
        onChange={(pageSize) => onChange({ pageSize })}
        options={PAGE_SIZES}
        value={design.pageSize}
      />

      <label>
        Typeface
        <select
          onChange={(event) => onChange({ fontPairing: event.target.value })}
          value={design.fontPairing}
        >
          {(Object.keys(FONT_PAIRINGS) as FontPairing[]).map((key) => (
            <option key={key} value={key}>
              {FONT_PAIRINGS[key].label}
            </option>
          ))}
        </select>
      </label>

      <Segmented
        label="Text size"
        onChange={(typeScale) => onChange({ typeScale })}
        options={TYPE_SCALES}
        value={design.typeScale}
      />
      <Segmented
        label="Spacing"
        onChange={(density) => onChange({ density })}
        options={DENSITIES}
        value={design.density}
      />
      <Segmented
        label="Margins"
        onChange={(margins) => onChange({ margins })}
        options={MARGINS}
        value={design.margins}
      />

      <fieldset className="accent-choice">
        <legend>Accent</legend>
        <div className="swatches">
          {(Object.keys(ACCENTS) as Accent[]).map((key) => (
            <button
              aria-label={ACCENTS[key].label}
              aria-pressed={design.accent === key}
              className="swatch"
              key={key}
              onClick={() => onChange({ accent: key })}
              style={{ backgroundColor: ACCENTS[key].value }}
              title={`${ACCENTS[key].label} — ${ACCENTS[key].contrast}:1 contrast`}
              type="button"
            />
          ))}
        </div>
      </fieldset>
    </>
  );
}

function Segmented<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="design-control">
      <span className="field-group-label" id={`${label}-label`}>
        {label}
      </span>
      <div aria-labelledby={`${label}-label`} className="segmented-control" role="group">
        {options.map((option) => (
          <button
            aria-pressed={value === option.value}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
