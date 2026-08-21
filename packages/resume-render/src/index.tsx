import React, { type ReactNode } from "react";
import { getRenderableSections, hasVisibleSectionContent, type ResumeDocument, type ResumeSection } from "@resume-builder/core";
import { designTokenStyle } from "./design-tokens";
import { SECTION_RENDERERS } from "./sections/registry";

export { SECTION_RENDERERS, type SectionRenderer } from "./sections/registry";
export {
  ACCENTS,
  FONT_PAIRINGS,
  PAGE_DIMENSIONS,
  TEMPLATES,
  applyTemplate,
  designTokenStyle,
  type Accent,
  type FontPairing,
  type TemplateId,
} from "./design-tokens";

export function ResumePreview({ resume }: { resume: ResumeDocument }) {
  const photo = resume.personal.photo;

  return (
    <article
      className="resume-page"
      data-template={resume.design.templateId}
      style={designTokenStyle(resume.design)}
    >
      <header className="resume-header" data-block-id="header">
        {/* Wrapper exists so meridian can lay the photo beside the text block.
            It adds no data-block-id, so the conformance contract is unchanged. */}
        {photo ? (
          <img
            alt=""
            className="resume-photo"
            data-shape={photo.shape}
            src={photo.assetId}
          />
        ) : null}
        <div className="resume-header-text">
          <h2>{resume.personal.firstName} {resume.personal.lastName}</h2>
          {resume.personal.headline ? <p>{resume.personal.headline}</p> : null}
          <ul>
            {resume.personal.location ? (
              <ContactItem icon="location" label="Location">{resume.personal.location}</ContactItem>
            ) : null}
            {resume.personal.email ? (
              <ContactItem icon="email" label="Email">{resume.personal.email}</ContactItem>
            ) : null}
            {resume.personal.phone ? (
              <ContactItem icon="phone" label="Phone">{resume.personal.phone}</ContactItem>
            ) : null}
            {resume.personal.dateOfBirth ? (
              <ContactItem icon="birthday" label="Date of birth">Date of birth: {resume.personal.dateOfBirth}</ContactItem>
            ) : null}
            {resume.personal.links.map((link) => (
              <li key={link.id}>{link.label ? `${link.label}: ` : ""}{link.value}</li>
            ))}
          </ul>
        </div>
      </header>
      {getRenderableSections(resume).filter(hasVisibleSectionContent).map((section) => (
        <ResumeSectionView key={section.id} section={section} />
      ))}
    </article>
  );
}

function ContactItem({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ContactIconName;
  label: string;
}) {
  return (
    <li className="resume-contact-item">
      <ContactIcon ariaLabel={label} icon={icon} />
      <span>{children}</span>
    </li>
  );
}

type ContactIconName = "birthday" | "email" | "location" | "phone";

function ContactIcon({ ariaLabel, icon }: { ariaLabel: string; icon: ContactIconName }) {
  return (
    <svg
      aria-label={ariaLabel}
      className="resume-contact-icon"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      {icon === "email" ? (
        <>
          <rect height="14" rx="2.2" width="18" x="3" y="5" />
          <path d="m4 7 8 6 8-6" />
        </>
      ) : null}
      {icon === "phone" ? (
        <path d="M6.6 4.6 9 4l2 4-1.5 1.1a10.8 10.8 0 0 0 5.4 5.4L16 13l4 2-.6 2.4c-.2.8-.9 1.3-1.7 1.2C10.8 18 6 13.2 5.4 6.3c-.1-.8.4-1.5 1.2-1.7Z" />
      ) : null}
      {icon === "location" ? (
        <>
          <path d="M12 21s6-5.2 6-10a6 6 0 0 0-12 0c0 4.8 6 10 6 10Z" />
          <circle cx="12" cy="11" r="2" />
        </>
      ) : null}
      {icon === "birthday" ? (
        <>
          <path d="M7 10V7m5 3V7m5 3V7" />
          <path d="M6 14h12" />
          <path d="M5 10h14v8H5z" />
          <path d="M7 7c0-1 .8-1.7 1.8-1.7S10.5 6 10.5 7" />
          <path d="M12 7c0-1 .8-1.7 1.8-1.7S15.5 6 15.5 7" />
        </>
      ) : null}
    </svg>
  );
}

function ResumeSectionView({ section }: { section: ResumeSection }) {
  return (
    <section className="resume-section" data-section-id={section.id} data-section-type={section.type}>
      <h3 data-block-id={`section:${section.id}:header`}>{section.title}</h3>
      {SECTION_RENDERERS[section.type](section)}
    </section>
  );
}
