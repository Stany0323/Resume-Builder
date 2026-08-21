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
      <p data-block-id={`section:${section.id}:item:${item.id}`}>
        <strong>{item.role}</strong>
        <DateRange startDate={item.startDate} endDate={item.endDate} />
      </p>
      <p className="resume-item-meta">
        {item.organization}
        {item.location ? `, ${item.location}` : ""}
      </p>
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
      <p data-block-id={`section:${section.id}:item:${item.id}`}>
        <strong>{item.degree}</strong>
        <DateRange startDate={item.startDate} endDate={item.endDate} />
      </p>
      <p className="resume-item-meta">
        {item.institution}
        {item.location ? `, ${item.location}` : ""}
      </p>
      {item.detail ? <p data-block-id={`section:${section.id}:item:${item.id}:detail`}>{item.detail}</p> : null}
      <Bullets sectionId={section.id} itemId={item.id} bullets={item.bullets} />
    </div>
  ));
}

function renderSkills(section: SkillsSection) {
  return byOrder(section.items).map((item) => (
    <div className="resume-item" key={item.id}>
      <p data-block-id={`section:${section.id}:item:${item.id}`}>
        <strong>{item.groupLabel}</strong>: {item.entries.join(", ")}
      </p>
    </div>
  ));
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
  return byOrder(section.items).map((item) => (
    <div className="resume-item" key={item.id}>
      <p data-block-id={`section:${section.id}:item:${item.id}`}>
        {item.requestText ? item.requestText : (
          <>
            <strong>{item.name}</strong>, {item.role}, {item.organization}
            {item.email ? `, ${item.email}` : ""}
            {item.phone ? `, ${item.phone}` : ""}
          </>
        )}
      </p>
    </div>
  ));
}
