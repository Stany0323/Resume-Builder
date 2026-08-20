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
          {resume.personal.location ? <p>{resume.personal.location}</p> : null}
          <ul>
            <li>{resume.personal.email}</li>
            <li>{resume.personal.phone}</li>
            {resume.personal.dateOfBirth ? <li>Date of birth: {resume.personal.dateOfBirth}</li> : null}
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

function ResumeSectionView({ section }: { section: ResumeSection }) {
  return (
    <section className="resume-section" data-section-id={section.id} data-section-type={section.type}>
      <h3 data-block-id={`section:${section.id}:header`}>{section.title}</h3>
      {SECTION_RENDERERS[section.type](section)}
    </section>
  );
}
