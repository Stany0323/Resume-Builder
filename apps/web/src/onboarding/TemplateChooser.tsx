import { useState } from "react";
import type { ProfileType, ResumeDocument } from "@resume-builder/core";
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

const PROFILE_OPTIONS: Array<{
  description: string;
  label: string;
  value: ProfileType;
}> = [
  {
    description: "Lead with impact, experience, leadership and measurable wins.",
    label: "Professional",
    value: "professional",
  },
  {
    description: "Make education, projects and early proof do more of the work.",
    label: "Graduate",
    value: "graduate",
  },
  {
    description: "Show readiness through coursework, skills, projects and referees.",
    label: "Intern",
    value: "intern",
  },
  {
    description: "Focus on practical skills, field of study and attachment goals.",
    label: "Attachee",
    value: "attachee",
  },
  {
    description: "Bring transferable skills forward and connect them to the new role.",
    label: "Career changer",
    value: "careerChanger",
  },
];

export function TemplateChooser({
  onChoose,
  onSkip,
}: {
  onChoose: (choice: {
    accent: Accent;
    profileType: ProfileType;
    targetRole: string;
    templateId: TemplateId;
  }) => void;
  onSkip?: () => void;
}) {
  const [selected, setSelected] = useState<TemplateId>("meridian");
  const [accent, setAccent] = useState<Accent>("slate");
  const [profileType, setProfileType] = useState<ProfileType>("professional");
  const [targetRole, setTargetRole] = useState("");

  return (
    <main className="chooser">
      <header className="chooser-header">
        <h1>Shape your resume</h1>
        <p>
          Start with the kind of resume you need, then choose a clean layout.
          The builder will arrange sections and prompts around that goal.
        </p>
      </header>

      <section className="chooser-block" aria-labelledby="profile-heading">
        <div className="chooser-block-header">
          <h2 id="profile-heading">What are you building?</h2>
          <p>Pick the path that best matches this application.</p>
        </div>
        <div className="profile-grid">
          {PROFILE_OPTIONS.map((option) => (
            <button
              aria-pressed={profileType === option.value}
              className="profile-card"
              key={option.value}
              onClick={() => setProfileType(option.value)}
              type="button"
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="chooser-block target-role-block" aria-labelledby="target-role-heading">
        <div className="chooser-block-header">
          <h2 id="target-role-heading">Target role</h2>
          <p>This keeps the resume focused before scoring and server suggestions arrive.</p>
        </div>
        <label className="target-role-field">
          <span className="visually-hidden">Target role</span>
          <input
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder={getTargetRolePlaceholder(profileType)}
            type="text"
            value={targetRole}
          />
        </label>
      </section>

      <section className="chooser-block" aria-labelledby="template-heading">
        <div className="chooser-block-header">
          <h2 id="template-heading">Choose a layout</h2>
          <p>You can switch later without losing your content.</p>
        </div>
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
      </section>

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
          onClick={() =>
            onChoose({
              accent,
              profileType,
              targetRole: targetRole.trim(),
              templateId: selected,
            })
          }
          type="button"
        >
          Start building
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

function getTargetRolePlaceholder(profileType: ProfileType) {
  switch (profileType) {
    case "attachee":
      return "Accounting attachment";
    case "careerChanger":
      return "Junior UX Designer";
    case "graduate":
      return "Graduate software developer";
    case "intern":
      return "Marketing intern";
    case "professional":
      return "Senior Product Manager";
  }
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
