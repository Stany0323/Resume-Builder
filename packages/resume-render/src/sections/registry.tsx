import React, { type ReactNode } from "react";
import {
  byOrder,
  type EducationSection,
  type ExperienceSection,
  type HobbiesSection,
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
        {item.organizationLogo ? (
          <img
            alt={item.organization ? `${item.organization} logo` : ""}
            className="resume-entry-logo"
            src={item.organizationLogo.assetId}
          />
        ) : null}
        <div className="resume-entry-copy">
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
        {item.institutionLogo ? (
          <img
            alt={item.institution ? `${item.institution} logo` : ""}
            className="resume-entry-logo"
            src={item.institutionLogo.assetId}
          />
        ) : null}
        <div className="resume-entry-copy">
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
          {item.role ? <span>{item.role}</span> : null}
          {item.organization ? <span>{item.organization}</span> : null}
          {item.email ? <span>{item.email}</span> : null}
          {item.phone ? <span>{item.phone}</span> : null}
        </div>
      ))}
    </div>
  );
}
