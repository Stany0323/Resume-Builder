import { useState } from "react";
import type { ResumeDocument } from "@resume-builder/core";
import { ResumePreview } from "@resume-builder/render";
import { ACCENTS, PAGE_DIMENSIONS, TEMPLATES, type Accent } from "../design-tokens";
import { TEMPLATE_SAMPLE } from "./sample-content";

type TemplateId = ResumeDocument["design"]["templateId"];

/**
 * First-run template picker.
 *
 * Thumbnails are LIVE RENDERS of the real templates, scaled down — not
 * screenshots. A screenshot is a second source of truth that silently drifts
 * the first time a template changes; a scaled render cannot.
 *
 * IMPORTANT: this mounts ResumePreview several times, which means several
 * copies of every `data-block-id` in the DOM. That is safe only because the
 * chooser and the editor are never mounted together, and the measurement route
 * (/?measure=1) renders neither. If that ever changes, measurement will start
 * reading the wrong nodes — so keep them mutually exclusive.
 */

const THUMBNAIL_SCALE = 0.3;

export function TemplateChooser({
  onChoose,
  onSkip,
}: {
  onChoose: (templateId: TemplateId, accent: Accent) => void;
  onSkip?: () => void;
}) {
  const [selected, setSelected] = useState<TemplateId>("atlas");
  const [accent, setAccent] = useState<Accent>("slate");

  return (
    <main className="chooser">
      <header className="chooser-header">
        <h1>Pick a starting point</h1>
        <p>You can change this at any time — switching templates never loses anything you’ve written.</p>
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
            <span className="chooser-card-name">{TEMPLATES[id].label}</span>
            <span className="chooser-card-description">{TEMPLATES[id].description}</span>
          </button>
        ))}
      </div>

      <fieldset className="chooser-accents">
        <legend>Accent colour</legend>
        <div className="swatches">
          {(Object.keys(ACCENTS) as Accent[]).map((key) => (
            <button
              aria-label={ACCENTS[key].label}
              aria-pressed={accent === key}
              className="swatch"
              key={key}
              onClick={() => setAccent(key)}
              style={{ backgroundColor: ACCENTS[key].value }}
              type="button"
            />
          ))}
        </div>
      </fieldset>

      <div className="chooser-actions">
        <button className="primary" onClick={() => onChoose(selected, accent)} type="button">
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

/**
 * A real template render, scaled. The outer box is sized to the scaled
 * dimensions so surrounding layout doesn't have to know about the transform.
 */
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
    design: {
      ...TEMPLATE_SAMPLE.design,
      templateId,
      accent: accent ?? TEMPLATE_SAMPLE.design.accent,
    },
  };

  const page = PAGE_DIMENSIONS[resume.design.pageSize];

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
        style={{ transform: `scale(${scale})`, width: page.width, height: page.height }}
      >
        <ResumePreview resume={resume} />
      </span>
    </span>
  );
}
