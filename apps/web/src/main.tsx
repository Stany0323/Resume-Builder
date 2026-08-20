import React from "react";
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import fixture1Page from "../../../fixtures/fixture-1page.v2.json";
import fixture3Page from "../../../fixtures/fixture-3page.v2.json";
import {
  bulletsToText,
  reconcileLines,
  sampleResume,
  type EducationItem,
  type ExperienceItem,
  type PageSize,
  type ResumeDocument,
} from "@resume-builder/core";
import { ResumePreview } from "@resume-builder/render";
import { HobbiesPanel, ReferencesPanel, SkillsPanel } from "./sections/panels";
import "./styles.css";
import "./sections/panels.css";

const resumes = {
  sample: sampleResume,
  "fixture-1page": fixture1Page as ResumeDocument,
  "fixture-3page": fixture3Page as ResumeDocument,
};

type ResumeKey = keyof typeof resumes;
type PersonalTextField = "firstName" | "lastName" | "headline" | "dateOfBirth" | "location" | "email" | "phone";
type ExperienceTextField = "role" | "organization" | "location" | "startDate" | "endDate" | "summary";
type EducationTextField = "degree" | "institution" | "location" | "startDate" | "endDate" | "detail";

const months = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 62 }, (_, index) => String(currentYear + 1 - index));

function App() {
  const [resumeKey, setResumeKey] = useState<ResumeKey>("fixture-1page");
  const [resume, setResume] = useState<ResumeDocument>(() => structuredClone(resumes["fixture-1page"]));
  const orderedExperience = useMemo(() => sortDatedItems(resume.content.experience.items), [resume.content.experience.items]);
  const orderedEducation = useMemo(() => sortDatedItems(resume.content.education.items), [resume.content.education.items]);

  const loadResume = (key: ResumeKey) => {
    setResumeKey(key);
    setResume(structuredClone(resumes[key]));
  };

  const updateDesign = (pageSize: PageSize) => {
    setResume((current) => ({ ...current, design: { ...current.design, pageSize } }));
  };

  const setContent = <TKey extends keyof ResumeDocument["content"]>(
    key: TKey,
    value: ResumeDocument["content"][TKey],
  ) => {
    setResume((current) => ({
      ...current,
      content: {
        ...current.content,
        [key]: value,
      },
    }));
  };

  const updatePersonal = (field: PersonalTextField, value: string) => {
    setResume((current) => ({
      ...current,
      personal: {
        ...current.personal,
        [field]: optionalPersonalFields.includes(field) ? emptyToUndefined(value) : value,
      },
    }));
  };

  const updateExperience = (id: string, field: ExperienceTextField, value: string) => {
    setResume((current) => ({
      ...current,
      content: {
        ...current.content,
        experience: {
          items: current.content.experience.items.map((item) => item.id === id ? { ...item, [field]: value } : item),
        },
      },
    }));
  };

  const updateEducation = (id: string, field: EducationTextField, value: string) => {
    setResume((current) => ({
      ...current,
      content: {
        ...current.content,
        education: {
          items: current.content.education.items.map((item) => item.id === id ? { ...item, [field]: value } : item),
        },
      },
    }));
  };

  const updateExperienceBullets = (id: string, value: string) => {
    setResume((current) => ({
      ...current,
      content: {
        ...current.content,
        experience: {
          items: current.content.experience.items.map((item) => item.id === id
            ? { ...item, bullets: reconcileLines(item.bullets, value, makeBulletId) }
            : item),
        },
      },
    }));
  };

  const updateEducationBullets = (id: string, value: string) => {
    setResume((current) => ({
      ...current,
      content: {
        ...current.content,
        education: {
          items: current.content.education.items.map((item) => item.id === id
            ? { ...item, bullets: reconcileLines(item.bullets, value, makeBulletId) }
            : item),
        },
      },
    }));
  };

  return (
    <main className="app-shell">
      <aside className="toolbar" aria-label="Resume controls">
        <h1>Resume Builder</h1>
        <label>
          Fixture
          <select value={resumeKey} onChange={(event) => loadResume(event.target.value as ResumeKey)}>
            <option value="sample">Sample</option>
            <option value="fixture-1page">Sprint 0: one page</option>
            <option value="fixture-3page">Sprint 0: hostile</option>
          </select>
        </label>
        <div className="segmented-control" aria-label="Page size">
          {(["A4", "Letter"] as const).map((size) => (
            <button
              aria-pressed={resume.design.pageSize === size}
              key={size}
              onClick={() => updateDesign(size)}
              type="button"
            >
              {size}
            </button>
          ))}
        </div>
        <section className="form-section" aria-labelledby="personal-heading">
          <h2 id="personal-heading">Personal Info</h2>
          <div className="field-grid two-columns">
            <TextField label="First name" value={resume.personal.firstName} onChange={(value) => updatePersonal("firstName", value)} />
            <TextField label="Last name" value={resume.personal.lastName} onChange={(value) => updatePersonal("lastName", value)} />
          </div>
          <TextField label="Headline" value={resume.personal.headline ?? ""} onChange={(value) => updatePersonal("headline", value)} />
          <TextField label="Email" value={resume.personal.email} onChange={(value) => updatePersonal("email", value)} />
          <TextField label="Phone" value={resume.personal.phone} onChange={(value) => updatePersonal("phone", value)} />
          <TextField label="Location" value={resume.personal.location ?? ""} onChange={(value) => updatePersonal("location", value)} />
          <TextField label="Date of birth" value={resume.personal.dateOfBirth ?? ""} onChange={(value) => updatePersonal("dateOfBirth", value)} />
        </section>
        <section className="form-section" aria-labelledby="summary-heading">
          <h2 id="summary-heading">Summary</h2>
          <label>
            Summary
            <textarea
              rows={5}
              value={resume.content.summary.text}
              onChange={(event) => setResume((current) => ({
                ...current,
                content: { ...current.content, summary: { text: event.target.value } },
              }))}
            />
          </label>
        </section>
        <section className="form-section" aria-labelledby="education-heading">
          <FormSectionHeader id="education-heading" title="Education" count={orderedEducation.length} />
          <p className="form-note">Ordered automatically, most recent first.</p>
          {orderedEducation.map((item) => (
            <div className="item-editor" key={item.id}>
              <TextField label="Degree" value={item.degree} onChange={(value) => updateEducation(item.id, "degree", value)} />
              <TextField label="Institution" value={item.institution} onChange={(value) => updateEducation(item.id, "institution", value)} />
              <DateRangeFields
                endDate={item.endDate}
                onEndDateChange={(value) => updateEducation(item.id, "endDate", value)}
                onStartDateChange={(value) => updateEducation(item.id, "startDate", value)}
                startDate={item.startDate}
              />
              <DateValidationMessage endDate={item.endDate} startDate={item.startDate} />
              <BulletsField
                bullets={item.bullets}
                onChange={(value) => updateEducationBullets(item.id, value)}
              />
            </div>
          ))}
        </section>
        <section className="form-section" aria-labelledby="experience-heading">
          <FormSectionHeader id="experience-heading" title="Experience" count={orderedExperience.length} />
          <p className="form-note">Ordered automatically, most recent first.</p>
          {orderedExperience.map((item) => (
            <div className="item-editor" key={item.id}>
              <TextField label="Role" value={item.role} onChange={(value) => updateExperience(item.id, "role", value)} />
              <TextField label="Organization" value={item.organization} onChange={(value) => updateExperience(item.id, "organization", value)} />
              <DateRangeFields
                endDate={item.endDate}
                onEndDateChange={(value) => updateExperience(item.id, "endDate", value)}
                onStartDateChange={(value) => updateExperience(item.id, "startDate", value)}
                startDate={item.startDate}
              />
              <DateValidationMessage endDate={item.endDate} startDate={item.startDate} />
              <BulletsField
                bullets={item.bullets}
                onChange={(value) => updateExperienceBullets(item.id, value)}
              />
            </div>
          ))}
        </section>
        <section className="form-section" aria-labelledby="skills-heading">
          <FormSectionHeader id="skills-heading" title="Skills" count={resume.content.skills.items.length} />
          <SkillsPanel
            items={resume.content.skills.items}
            onChange={(items) => setContent("skills", { items })}
          />
        </section>
        <section className="form-section" aria-labelledby="hobbies-heading">
          <FormSectionHeader id="hobbies-heading" title="Hobbies" count={resume.content.hobbies.items.length} />
          <HobbiesPanel
            items={resume.content.hobbies.items}
            onChange={(items) => setContent("hobbies", { items })}
          />
        </section>
        <section className="form-section" aria-labelledby="references-heading">
          <FormSectionHeader
            count={resume.content.references.mode === "listed" ? resume.content.references.items.length : 0}
            id="references-heading"
            title="References"
          />
          <ReferencesPanel
            items={resume.content.references.items}
            mode={resume.content.references.mode}
            onChange={(references) => setContent("references", references)}
          />
        </section>
      </aside>
      <section className="preview-stage" aria-label="Resume preview">
        <ResumePreview resume={resume} />
      </section>
    </main>
  );
}

const optionalPersonalFields: PersonalTextField[] = ["headline", "dateOfBirth", "location"];

function sortDatedItems<T extends { endDate: string; order: number }>(items: T[]) {
  return [...items].sort((a, b) => {
    const dateCompare = dateSortValue(b.endDate) - dateSortValue(a.endDate);
    return dateCompare || a.order - b.order;
  });
}

function dateSortValue(value: string) {
  return value.toLowerCase() === "present" ? Number.MAX_SAFE_INTEGER : Date.parse(`${value}-01`) || 0;
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function FormSectionHeader({ count, id, title }: { count: number; id: string; title: string }) {
  return (
    <div className="form-section-header">
      <h2 id={id}>{title}</h2>
      <span>{count}</span>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function BulletsField({
  bullets,
  onChange,
}: {
  bullets: Array<{ id: string; order: number; text: string }>;
  onChange: (value: string) => void;
}) {
  const text = bulletsToText(bullets);
  const longest = bullets.reduce((max, bullet) => Math.max(max, bullet.text.length), 0);

  return (
    <label>
      Achievements — one per line
      <textarea
        className="bullets-textarea"
        rows={Math.max(3, Math.min(8, bullets.length + 1))}
        value={text}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="counter-line">
        {bullets.length} {bullets.length === 1 ? "bullet" : "bullets"} · longest {longest} characters
      </span>
    </label>
  );
}

function DateRangeFields({
  endDate,
  onEndDateChange,
  onStartDateChange,
  startDate,
}: {
  endDate: string;
  onEndDateChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  startDate: string;
}) {
  const isCurrent = endDate === "present";

  return (
    <div className="date-range-fields">
      <MonthYearField label="Start" value={startDate} onChange={onStartDateChange} />
      <MonthYearField disabled={isCurrent} label="End" value={isCurrent ? "" : endDate} onChange={onEndDateChange} />
      <label className="checkbox-field">
        <input
          checked={isCurrent}
          onChange={(event) => onEndDateChange(event.target.checked ? "present" : currentMonthValue())}
          type="checkbox"
        />
        Current role
      </label>
    </div>
  );
}

function MonthYearField({
  disabled = false,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const { month, year } = parseMonthYear(value);

  return (
    <fieldset className="month-year-field" disabled={disabled}>
      <legend>{label}</legend>
      <select
        aria-label={`${label} month`}
        value={month}
        onChange={(event) => onChange(composeMonthYear(year, event.target.value))}
      >
        {months.map(([value, name]) => (
          <option key={value} value={value}>{name}</option>
        ))}
      </select>
      <select
        aria-label={`${label} year`}
        value={year}
        onChange={(event) => onChange(composeMonthYear(event.target.value, month))}
      >
        {years.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </fieldset>
  );
}

function DateValidationMessage({ endDate, startDate }: { endDate: string; startDate: string }) {
  if (endDate === "present" || dateSortValue(endDate) >= dateSortValue(startDate)) {
    return null;
  }

  return <p className="field-message">Ends before it starts.</p>;
}

function parseMonthYear(value: string) {
  const [year = String(currentYear), month = "01"] = value.split("-");
  return {
    month: months.some(([candidate]) => candidate === month) ? month : "01",
    year: years.includes(year) ? year : String(currentYear),
  };
}

function composeMonthYear(year: string, month: string) {
  return `${year}-${month}`;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function makeBulletId() {
  return `b-${crypto.randomUUID()}`;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
