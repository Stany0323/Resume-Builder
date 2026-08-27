import React, {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  extractResumeBlocks,
  getRenderableSections,
  hasVisibleSectionContent,
  paginateBlocks,
  type CertificationItem,
  type EducationItem,
  type ExperienceItem,
  type ProjectItem,
  type ResumeDocument,
  type ResumeItem,
  type ResumeSection,
} from "@resume-builder/core";
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

type ResumePreviewMode = "flow" | "paged";

type PagePlan = {
  blockIds: Set<string>;
  fillPercent: number;
  index: number;
  resume: ResumeDocument;
};

export function ResumePreview({
  mode = "flow",
  resume,
}: {
  mode?: ResumePreviewMode;
  resume: ResumeDocument;
}) {
  if (mode === "paged") {
    return <PagedResumePreview resume={resume} />;
  }

  return <ResumePage resume={resume} />;
}

function PagedResumePreview({ resume }: { resume: ResumeDocument }) {
  const measureRef = useRef<HTMLElement>(null);
  const [pages, setPages] = useState<PagePlan[] | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const measurePage = measureRef.current;
      if (!measurePage) {
        return;
      }

      const pageBox = getContentPageBox(measurePage);
      const blockHeights = measureBlockHeights(measurePage);
      const blocks = extractResumeBlocks(resume);
      const pagination = paginateBlocks(
        blocks,
        pageBox,
        (block) => blockHeights.get(block.id) ?? 0,
      );

      setPages(
        pagination.pages.map((page) => {
          const blockIds = new Set(page.blocks.map((block) => block.id));

          return {
            blockIds,
            fillPercent:
              pageBox.height > 0
                ? Math.min(100, Math.round((page.usedHeight / pageBox.height) * 100))
                : 0,
            index: page.index,
            resume: createPageResume(resume, blockIds),
          };
        }),
      );
    };

    setPages(null);

    const frame = requestAnimationFrame(() => {
      void document.fonts.ready.then(() => requestAnimationFrame(measure));
    });

    const observer = new ResizeObserver(() => measure());
    if (measureRef.current) {
      observer.observe(measureRef.current);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [resume]);

  const visiblePages = useMemo(
    () => pages && pages.length > 0
      ? pages
      : [{ blockIds: new Set<string>(), fillPercent: 0, index: 0, resume }],
    [pages, resume],
  );

  return (
    <div className="resume-preview-pages" data-paged-ready={pages ? "true" : "false"}>
      <ResumePage
        ariaHidden
        className="resume-measure-copy"
        resume={resume}
        shellRef={measureRef}
      />
      {visiblePages.map((page) => (
        <div className="resume-preview-page-shell" key={page.index}>
          <ResumePage
            blockIds={pages ? page.blockIds : undefined}
            pageIndex={page.index}
            resume={page.resume}
            showHeader={page.index === 0}
          />
          {pages ? (
            <span className="resume-page-fill">
              Page {page.index + 1} · {page.fillPercent}% full
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ResumePage({
  ariaHidden = false,
  blockIds,
  className,
  pageIndex,
  resume,
  shellRef,
  showHeader = true,
}: {
  ariaHidden?: boolean;
  blockIds?: Set<string>;
  className?: string;
  pageIndex?: number;
  resume: ResumeDocument;
  shellRef?: React.Ref<HTMLElement>;
  showHeader?: boolean;
}) {
  const photo = resume.personal.photo;

  return (
    <article
      aria-hidden={ariaHidden ? "true" : undefined}
      className={["resume-page", className].filter(Boolean).join(" ")}
      data-page-index={typeof pageIndex === "number" ? pageIndex : undefined}
      data-template={resume.design.templateId}
      ref={shellRef}
      style={designTokenStyle(resume.design)}
    >
      {showHeader ? <ResumeHeader photo={photo} resume={resume} /> : null}
      {getRenderableSections(resume)
        .filter(hasVisibleSectionContent)
        .map((section) => (
          <ResumeSectionView
            key={section.id}
            section={section}
            showTitle={!blockIds || blockIds.has(`section:${section.id}:header`)}
          />
        ))}
    </article>
  );
}

function ResumeHeader({
  photo,
  resume,
}: {
  photo: ResumeDocument["personal"]["photo"];
  resume: ResumeDocument;
}) {
  return (
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
      ) : resume.design.templateId === "meridian" ? (
        <PhotoPlaceholder />
      ) : null}
      <div className="resume-header-text">
        <h2>
          {resume.personal.firstName} {resume.personal.lastName}
        </h2>
        {resume.personal.headline ? <p>{resume.personal.headline}</p> : null}
        <ul>
          {resume.personal.location ? (
            <ContactItem icon="location" label="Location">
              {resume.personal.location}
            </ContactItem>
          ) : null}
          {resume.personal.email ? (
            <ContactItem icon="email" label="Email">
              {resume.personal.email}
            </ContactItem>
          ) : null}
          {resume.personal.phone ? (
            <ContactItem icon="phone" label="Phone">
              {resume.personal.phone}
            </ContactItem>
          ) : null}
          {resume.personal.dateOfBirth ? (
            <ContactItem icon="birthday" label="Date of birth">
              DOB: {formatDateOfBirth(resume.personal.dateOfBirth)}
            </ContactItem>
          ) : null}
          {resume.personal.links.map((link) => (
            <li key={link.id}>
              {link.label ? `${link.label}: ` : ""}
              {link.value}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

function PhotoPlaceholder() {
  return (
    <span aria-hidden="true" className="resume-photo-placeholder">
      <svg
        className="resume-photo-placeholder-icon"
        fill="none"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="8.5" r="3.25" />
        <path d="M5.75 19c.9-3.35 3.05-5.05 6.25-5.05s5.35 1.7 6.25 5.05" />
      </svg>
    </span>
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

function formatDateOfBirth(value: string) {
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  return value;
}

type ContactIconName = "birthday" | "email" | "location" | "phone";

function ContactIcon({
  ariaLabel,
  icon,
}: {
  ariaLabel: string;
  icon: ContactIconName;
}) {
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

function ResumeSectionView({
  section,
  showTitle = true,
}: {
  section: ResumeSection;
  showTitle?: boolean;
}) {
  return (
    <section
      className="resume-section"
      data-section-id={section.id}
      data-section-type={section.type}
    >
      {showTitle ? (
        <h3 data-block-id={`section:${section.id}:header`}>{section.title}</h3>
      ) : null}
      {SECTION_RENDERERS[section.type](section)}
    </section>
  );
}

function getContentPageBox(page: HTMLElement) {
  const style = getComputedStyle(page);
  const height = numberValue(style.minHeight) || page.getBoundingClientRect().height;
  const width = page.getBoundingClientRect().width;

  return {
    width: Math.max(0, width - numberValue(style.paddingLeft) - numberValue(style.paddingRight)),
    height: Math.max(0, height - numberValue(style.paddingTop) - numberValue(style.paddingBottom)),
  };
}

function measureBlockHeights(page: HTMLElement) {
  const pageStyle = getComputedStyle(page);
  const pageTop = page.getBoundingClientRect().top + numberValue(pageStyle.paddingTop);
  let cursorBottom = pageTop;

  return new Map(
    [...page.querySelectorAll<HTMLElement>("[data-block-id]")].map((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const bottom = rect.bottom + numberValue(style.marginBottom);
      const height = Math.max(0, bottom - cursorBottom);

      cursorBottom = Math.max(cursorBottom, bottom);

      return [element.dataset.blockId ?? "", height] as const;
    }),
  );
}

function numberValue(value: string) {
  return Number.parseFloat(value) || 0;
}

function createPageResume(resume: ResumeDocument, blockIds: Set<string>): ResumeDocument {
  const includeHeader = blockIds.has("header");

  return {
    ...resume,
    personal: includeHeader ? resume.personal : { ...resume.personal, links: [] },
    content: {
      summary: {
        text: blockIds.has("section:summary:item:summary")
          ? resume.content.summary.text
          : "",
      },
      experience: {
        items: filterExperienceItems(resume.content.experience.items, "experience", blockIds),
      },
      education: {
        items: filterEducationItems(resume.content.education.items, "education", blockIds),
      },
      projects: {
        items: filterProjectItems(resume.content.projects.items, "projects", blockIds),
      },
      certifications: {
        items: filterCertificationItems(resume.content.certifications.items, "certifications", blockIds),
      },
      skills: {
        items: filterSimpleItems(resume.content.skills.items, "skills", blockIds),
      },
      languages: {
        items: filterSimpleItems(resume.content.languages.items, "languages", blockIds),
      },
      hobbies: {
        items: filterSimpleItems(resume.content.hobbies.items, "hobbies", blockIds),
      },
      references: filterReferences(resume, blockIds),
    },
  };
}

function filterExperienceItems<TItem extends ExperienceItem>(
  items: TItem[],
  sectionId: string,
  blockIds: Set<string>,
): TItem[] {
  return items.flatMap((item) => {
    const itemId = `section:${sectionId}:item:${item.id}`;
    const bullets = item.bullets.filter((bullet) => blockIds.has(`${itemId}:bullet:${bullet.id}`));
    const hasItem = blockIds.has(itemId);
    const hasSummary = blockIds.has(`${itemId}:summary`);

    if (!hasItem && !hasSummary && bullets.length === 0) {
      return [];
    }

    return [{ ...item, summary: hasSummary ? item.summary : null, bullets }];
  });
}

function filterEducationItems(
  items: EducationItem[],
  sectionId: string,
  blockIds: Set<string>,
): EducationItem[] {
  return items.flatMap((item) => {
    const itemId = `section:${sectionId}:item:${item.id}`;
    const bullets = item.bullets.filter((bullet) => blockIds.has(`${itemId}:bullet:${bullet.id}`));
    const hasItem = blockIds.has(itemId);
    const hasDetail = blockIds.has(`${itemId}:detail`);

    if (!hasItem && !hasDetail && bullets.length === 0) {
      return [];
    }

    return [{ ...item, detail: hasDetail ? item.detail : undefined, bullets }];
  });
}

function filterProjectItems(
  items: ProjectItem[],
  sectionId: string,
  blockIds: Set<string>,
): ProjectItem[] {
  return items.flatMap((item) => {
    const itemId = `section:${sectionId}:item:${item.id}`;
    const bullets = item.bullets.filter((bullet) => blockIds.has(`${itemId}:bullet:${bullet.id}`));
    const hasItem = blockIds.has(itemId);
    const hasLink = blockIds.has(`${itemId}:link`);
    const hasSummary = blockIds.has(`${itemId}:summary`);

    if (!hasItem && !hasLink && !hasSummary && bullets.length === 0) {
      return [];
    }

    return [{
      ...item,
      bullets,
      link: hasLink ? item.link : undefined,
      summary: hasSummary ? item.summary : null,
    }];
  });
}

function filterCertificationItems(
  items: CertificationItem[],
  sectionId: string,
  blockIds: Set<string>,
): CertificationItem[] {
  return items.flatMap((item) => {
    const itemId = `section:${sectionId}:item:${item.id}`;
    const hasItem = blockIds.has(itemId);
    const hasCredentialUrl = blockIds.has(`${itemId}:credential-url`);

    if (!hasItem && !hasCredentialUrl) {
      return [];
    }

    return [{ ...item, credentialUrl: hasCredentialUrl ? item.credentialUrl : undefined }];
  });
}

function filterSimpleItems<TItem extends ResumeItem>(
  items: TItem[],
  sectionId: string,
  blockIds: Set<string>,
): TItem[] {
  return items.filter((item) => blockIds.has(`section:${sectionId}:item:${item.id}`));
}

function filterReferences(resume: ResumeDocument, blockIds: Set<string>) {
  if (resume.content.references.mode === "onRequest") {
    return blockIds.has("section:references:item:references-on-request")
      ? resume.content.references
      : { ...resume.content.references, mode: "omitted" as const };
  }

  if (resume.content.references.mode !== "listed") {
    return resume.content.references;
  }

  return {
    ...resume.content.references,
    items: filterSimpleItems(resume.content.references.items, "references", blockIds),
  };
}
