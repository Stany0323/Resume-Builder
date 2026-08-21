import { useMemo, useState } from "react";
import type { ResumeDocument } from "@resume-builder/core";
import {
  ACCENTS,
  FONT_PAIRINGS,
  type Accent,
  type FontPairing,
} from "@resume-builder/render";
import { Check, ChevronRight, Filter, X } from "lucide-react";

type Design = ResumeDocument["design"];

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

type SettingKey = keyof Pick<
  Design,
  "accent" | "density" | "fontPairing" | "margins" | "typeScale"
>;

type SettingOption<T extends string = string> = {
  label: string;
  swatch?: string;
  value: T;
};

type SettingConfig<T extends SettingKey = SettingKey> = {
  key: T;
  label: string;
  options: Array<SettingOption<Design[T] & string>>;
};

export function DesignPanel({
  design,
  onChange,
}: {
  design: Design;
  onChange: (patch: Partial<Design>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSetting, setActiveSetting] = useState<SettingKey | null>(
    "fontPairing",
  );
  const settings = useMemo<Array<SettingConfig>>(
    () => [
      {
        key: "fontPairing",
        label: "Typeface",
        options: (Object.keys(FONT_PAIRINGS) as FontPairing[]).map((key) => ({
          label: FONT_PAIRINGS[key].label,
          value: key,
        })),
      },
      { key: "typeScale", label: "Text size", options: TYPE_SCALES },
      { key: "density", label: "Spacing", options: DENSITIES },
      { key: "margins", label: "Margins", options: MARGINS },
      {
        key: "accent",
        label: "Accent",
        options: (Object.keys(ACCENTS) as Accent[]).map((key) => ({
          label: ACCENTS[key].label,
          swatch: ACCENTS[key].value,
          value: key,
        })),
      },
    ],
    [],
  );

  return (
    <div className="design-menu">
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="dashboard-template-button"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Filter size={16} strokeWidth={2} />
        <span>Settings</span>
      </button>

      {isOpen ? (
        <div
          aria-label="Resume settings"
          className="design-dropdown"
          role="dialog"
        >
          <div className="design-dropdown-header">
            <strong>Settings</strong>
            <button
              aria-label="Close settings"
              className="icon-button"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X size={17} strokeWidth={2.2} />
            </button>
          </div>

          <div className="design-setting-list">
            {settings.map((setting) => (
              <SettingRow
                active={activeSetting === setting.key}
                key={setting.key}
                onActivate={() =>
                  setActiveSetting((current) =>
                    current === setting.key ? null : setting.key,
                  )
                }
                onChange={(value) =>
                  onChange({ [setting.key]: value } as Partial<Design>)
                }
                options={setting.options}
                settingLabel={setting.label}
                value={design[setting.key] as string}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingRow({
  active,
  onActivate,
  onChange,
  options,
  settingLabel,
  value,
}: {
  active: boolean;
  onActivate: () => void;
  onChange: (value: string) => void;
  options: SettingOption[];
  settingLabel: string;
  value: string;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className="design-setting">
      <button
        aria-expanded={active}
        className="design-setting-row"
        onClick={onActivate}
        type="button"
      >
        <span className="design-setting-name">{settingLabel}</span>
        <span className="design-setting-value">
          {selected?.swatch ? (
            <span
              aria-hidden="true"
              className="design-setting-swatch"
              style={{ backgroundColor: selected.swatch }}
            />
          ) : null}
          {selected?.label ?? value}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="design-setting-arrow"
          size={16}
          strokeWidth={2.1}
        />
      </button>

      {active ? (
        <div className="design-setting-children">
          {options.map((option) => {
            const selectedOption = option.value === value;

            return (
              <button
                aria-pressed={selectedOption}
                className="design-setting-option"
                key={option.value}
                onClick={() => onChange(option.value)}
                type="button"
              >
                <span className="design-option-label">
                  {option.swatch ? (
                    <span
                      aria-hidden="true"
                      className="design-setting-swatch"
                      style={{ backgroundColor: option.swatch }}
                    />
                  ) : null}
                  {option.label}
                </span>
                {selectedOption ? <Check size={15} strokeWidth={2.2} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
