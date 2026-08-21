import React, { type ReactNode } from "react";
import {
  byOrder,
  type EducationSection,
  type ExperienceSection,
  type HobbiesSection,
  type LanguageLevel,
  type LanguagesSection,
  type ReferencesSection,
  type ResumeSection,
  type SectionType,
  type SkillsSection,
  type SummarySection,
} from "@resume-builder/core";
import { Bullets } from "../primitives/Bullets";
import { DateRange } from "../primitives/DateRange";

export type SectionRenderer = (section: ResumeSection) => ReactNode;

export const SECTION_RENDERERS: Record<SectionType, SectionRenderer> = {
  summary: (section) => renderSummary(section as SummarySection),
  experience: (section) => renderExperience(section as ExperienceSection),
  education: (section) => renderEducation(section as EducationSection),
  skills: (section) => renderSkills(section as SkillsSection),
  languages: (section) => renderLanguages(section as LanguagesSection),
  hobbies: (section) => renderHobbies(section as HobbiesSection),
  references: (section) => renderReferences(section as ReferencesSection),
};

function renderSummary(section: SummarySection) {
  return byOrder(section.items).map((item) => (
    <p className="resume-item" data-block-id={`section:${section.id}:item:${item.id}`} key={item.id}>{item.text}</p>
  ));
}

function renderExperience(section: ExperienceSection) {
  return byOrder(section.items).map((item) => (
    <div className="resume-item" key={item.id}>
      <div className="resume-entry-heading" data-block-id={`section:${section.id}:item:${item.id}`}>
        <div className="resume-entry-copy">
          {item.organizationLogo ? (
            <img
              alt={item.organization ? `${item.organization} logo` : ""}
              className="resume-entry-logo"
              src={item.organizationLogo.assetId}
            />
          ) : null}
          <strong>{item.role}</strong>
          <span className="resume-item-meta">
            {item.organization}
            {item.location ? `, ${item.location}` : ""}
          </span>
        </div>
        <DateRange startDate={item.startDate} endDate={item.endDate} />
      </div>
      {typeof item.summary === "string" && item.summary.length > 0 ? (
        <p data-block-id={`section:${section.id}:item:${item.id}:summary`}>{item.summary}</p>
      ) : null}
      <Bullets sectionId={section.id} itemId={item.id} bullets={item.bullets} />
    </div>
  ));
}

function renderEducation(section: EducationSection) {
  return byOrder(section.items).map((item) => (
    <div className="resume-item" key={item.id}>
      <div className="resume-entry-heading" data-block-id={`section:${section.id}:item:${item.id}`}>
        <div className="resume-entry-copy">
          {item.institutionLogo ? (
            <img
              alt={item.institution ? `${item.institution} logo` : ""}
              className="resume-entry-logo"
              src={item.institutionLogo.assetId}
            />
          ) : null}
          <strong>{item.degree}</strong>
          <span className="resume-item-meta">
            {item.institution}
            {item.location ? `, ${item.location}` : ""}
          </span>
        </div>
        <DateRange startDate={item.startDate} endDate={item.endDate} />
      </div>
      {item.detail ? <p data-block-id={`section:${section.id}:item:${item.id}:detail`}>{item.detail}</p> : null}
      <Bullets sectionId={section.id} itemId={item.id} bullets={item.bullets} />
    </div>
  ));
}

function renderSkills(section: SkillsSection) {
  return (
    <div className="resume-skills-grid">
      {byOrder(section.items).map((item) => (
        <div className="resume-skill-group" data-block-id={`section:${section.id}:item:${item.id}`} key={item.id}>
          <strong>{item.groupLabel}</strong>
          {item.entries.length > 0 ? (
            <ul>
              {item.entries.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function renderLanguages(section: LanguagesSection) {
  return (
    <div className="resume-language-list">
      {byOrder(section.items).map((item) => (
        <div className="resume-language" data-block-id={`section:${section.id}:item:${item.id}`} key={item.id}>
          <span className="resume-language-name">{item.language}</span>
          <span aria-hidden="true" className="resume-language-separator">-</span>
          <LanguageDots level={item.level} />
        </div>
      ))}
    </div>
  );
}

const LANGUAGE_DOT_COUNT = 10;

function LanguageDots({ level }: { level: LanguageLevel }) {
  const filledDots = level * 2;

  return (
    <span
      aria-label={`${filledDots} out of ${LANGUAGE_DOT_COUNT}`}
      className="resume-language-dots"
      role="img"
    >
      {Array.from({ length: LANGUAGE_DOT_COUNT }, (_, index) => index + 1).map((step) => (
        <span className="resume-language-dot" data-filled={step <= filledDots ? "true" : "false"} key={step} />
      ))}
    </span>
  );
}

function renderHobbies(section: HobbiesSection) {
  return byOrder(section.items).map((item) => (
    <div className="resume-item" key={item.id}>
      <p data-block-id={`section:${section.id}:item:${item.id}`}>
        {item.text}
      </p>
    </div>
  ));
}

function renderReferences(section: ReferencesSection) {
  const items = byOrder(section.items);
  const requestItem = items.find((item) => item.requestText);

  if (requestItem) {
    return (
      <p className="resume-item" data-block-id={`section:${section.id}:item:${requestItem.id}`}>
        {requestItem.requestText}
      </p>
    );
  }

  return (
    <div className="resume-reference-row">
      {items.slice(0, 3).map((item) => (
        <div
          className="resume-reference"
          data-block-id={`section:${section.id}:item:${item.id}`}
          key={item.id}
        >
          <strong>{item.name}</strong>
          {item.role ? <ReferenceDetail icon="role">{item.role}</ReferenceDetail> : null}
          {item.organization ? <ReferenceDetail icon="organization">{item.organization}</ReferenceDetail> : null}
          {item.email ? <ReferenceDetail icon="email">{item.email}</ReferenceDetail> : null}
          {item.phone ? <ReferenceDetail icon="phone">{item.phone}</ReferenceDetail> : null}
        </div>
      ))}
    </div>
  );
}

type ReferenceIconName = "email" | "organization" | "phone" | "role";

function ReferenceDetail({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReferenceIconName;
}) {
  return (
    <span className="resume-reference-detail">
      <ReferenceIcon icon={icon} />
      <span>{children}</span>
    </span>
  );
}

function ReferenceIcon({ icon }: { icon: ReferenceIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="resume-reference-icon"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      {icon === "role" ? (
        <>
          <path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1" />
          <path d="M5 7h14v12H5z" />
          <path d="M9 12h6" />
        </>
      ) : null}
      {icon === "organization" ? (
        <>
          <path d="M6 20V5h8v15" />
          <path d="M14 9h4v11" />
          <path d="M9 8h2" />
          <path d="M9 12h2" />
          <path d="M9 16h2" />
        </>
      ) : null}
      {icon === "email" ? (
        <>
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </>
      ) : null}
      {icon === "phone" ? (
        <path d="M7 4h3l1.2 4-2 1.1c1 2.1 2.6 3.7 4.7 4.7l1.1-2 4 1.2v3c0 1.1-.9 2-2 2C10.9 18 6 13.1 6 6c0-1.1.9-2 1-2Z" />
      ) : null}
    </svg>
  );
}
