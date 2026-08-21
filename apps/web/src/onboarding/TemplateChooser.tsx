import { useState } from "react";
import type { ResumeDocument } from "@resume-builder/core";
import {
  ACCENTS,
  PAGE_DIMENSIONS,
  ResumePreview,
  TEMPLATES,
  applyTemplate,
  type Accent,
  type TemplateId,
} from "@resume-builder/render";
import { TEMPLATE_SAMPLE } from "./sample-content";

const THUMBNAIL_SCALE = 0.26;

export function TemplateChooser({
  onChoose,
  onSkip,
}: {
  onChoose: (templateId: TemplateId, accent: Accent) => void;
  onSkip?: () => void;
}) {
  const [selected, setSelected] = useState<TemplateId>("meridian");
  const [accent, setAccent] = useState<Accent>("slate");

  return (
    <main className="chooser">
      <header className="chooser-header">
        <h1>Pick a starting point</h1>
        <p>
          Choose a photo-ready layout or a technical no-photo layout. Both parse
          cleanly in applicant tracking systems, and you can switch at any time
          without losing a word.
        </p>
      </header>

      <div className="chooser-grid">
        {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
          <button
            aria-pressed={selected === id}
            className="chooser-card"
            key={id}
            onClick={() => setSelected(id)}
            type="button"
          >
            <TemplateThumbnail accent={accent} templateId={id} />
            <span className="chooser-card-meta">
              <span className="chooser-card-name">{TEMPLATES[id].label}</span>
              <span className="chooser-card-tagline">
                {TEMPLATES[id].tagline}
              </span>
              {TEMPLATES[id].supportsPhoto ? (
                <span className="photo-badge">Photo</span>
              ) : null}
            </span>
            <span className="chooser-card-description">
              {TEMPLATES[id].description}
            </span>
          </button>
        ))}
      </div>

      <fieldset className="chooser-accents">
        <legend>Accent</legend>
        <div className="swatches">
          {(Object.keys(ACCENTS) as Accent[]).map((key) => (
            <button
              aria-label={ACCENTS[key].label}
              aria-pressed={accent === key}
              className="swatch"
              key={key}
              onClick={() => setAccent(key)}
              style={{ backgroundColor: ACCENTS[key].value }}
              title={`${ACCENTS[key].label} — ${ACCENTS[key].contrast}:1 contrast`}
              type="button"
            />
          ))}
        </div>
      </fieldset>

      <div className="chooser-actions">
        <button
          className="primary"
          onClick={() => onChoose(selected, accent)}
          type="button"
        >
          Start with {TEMPLATES[selected].label}
        </button>
        {onSkip ? (
          <button className="link-button" onClick={onSkip} type="button">
            Skip — I’ll decide later
          </button>
        ) : null}
      </div>
    </main>
  );
}

export function TemplateThumbnail({
  accent,
  scale = THUMBNAIL_SCALE,
  templateId,
}: {
  accent?: Accent;
  scale?: number;
  templateId: TemplateId;
}) {
  const resume: ResumeDocument = {
    ...TEMPLATE_SAMPLE,
    design: applyTemplate(
      {
        ...TEMPLATE_SAMPLE.design,
        accent: accent ?? TEMPLATE_SAMPLE.design.accent,
      },
      templateId,
    ),
  };

  const page = PAGE_DIMENSIONS.A4;

  return (
    <span
      aria-hidden="true"
      className="template-thumbnail"
      style={{
        width: `calc(${page.width} * ${scale})`,
        height: `calc(${page.height} * ${scale})`,
      }}
    >
      <span
        className="template-thumbnail-inner"
        style={{
          transform: `scale(${scale})`,
          width: page.width,
          height: page.height,
        }}
      >
        <ResumePreview resume={resume} />
      </span>
    </span>
  );
}
