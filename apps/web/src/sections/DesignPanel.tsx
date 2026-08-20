import type { ResumeDocument } from "@resume-builder/core";
import {
  ACCENTS,
  FONT_PAIRINGS,
  type Accent,
  type FontPairing,
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

export function DesignPanel({
  design,
  onChange,
}: {
  design: Design;
  onChange: (patch: Partial<Design>) => void;
}) {
  return (
    <div className="design-panel">
      <SelectControl
        label="Typeface"
        onChange={(fontPairing) => onChange({ fontPairing })}
        options={(Object.keys(FONT_PAIRINGS) as FontPairing[]).map((key) => ({
          label: FONT_PAIRINGS[key].label,
          value: key,
        }))}
        value={design.fontPairing}
      />
      <SelectControl
        label="Text size"
        onChange={(typeScale) => onChange({ typeScale })}
        options={TYPE_SCALES}
        value={design.typeScale}
      />
      <SelectControl
        label="Spacing"
        onChange={(density) => onChange({ density })}
        options={DENSITIES}
        value={design.density}
      />
      <SelectControl
        label="Margins"
        onChange={(margins) => onChange({ margins })}
        options={MARGINS}
        value={design.margins}
      />
      <SelectControl
        label="Accent"
        onChange={(accent) => onChange({ accent })}
        options={(Object.keys(ACCENTS) as Accent[]).map((key) => ({
          label: ACCENTS[key].label,
          value: key,
        }))}
        value={design.accent}
      />
    </div>
  );
}

function SelectControl<T extends string>({
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
    <label className="design-select">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value as T)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
