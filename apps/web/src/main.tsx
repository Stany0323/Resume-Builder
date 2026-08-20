import React from "react";
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import fixture1Page from "../../../fixtures/fixture-1page.json";
import fixture3Page from "../../../fixtures/fixture-3page.json";
import {
  migrateResumeDocument,
  sampleResume,
  type EducationItem,
  type ExperienceItem,
  type LegacyResumeDocumentV1,
  type PageSize,
  type ResumeDocument,
} from "@resume-builder/core";
import { ResumePreview } from "@resume-builder/render";
import "./styles.css";

const resumes = {
  sample: sampleResume,
  "fixture-1page": migrateResumeDocument(fixture1Page as LegacyResumeDocumentV1),
  "fixture-3page": migrateResumeDocument(fixture3Page as LegacyResumeDocumentV1),
};

type ResumeKey = keyof typeof resumes;

function App() {
  const [resumeKey, setResumeKey] = useState<ResumeKey>("fixture-1page");
  const [resume, setResume] = useState<ResumeDocument>(() => structuredClone(resumes["fixture-1page"]));
  const sortedExperience = useMemo(() => resume.content.experience.items.slice(0, 3), [resume.content.experience.items]);
  const sortedEducation = useMemo(() => resume.content.education.items.slice(0, 2), [resume.content.education.items]);

  const loadResume = (key: ResumeKey) => {
    setResumeKey(key);
    setResume(structuredClone(resumes[key]));
  };

  const updateDesign = (pageSize: PageSize) => {
    setResume((current) => ({ ...current, design: { ...current.design, pageSize } }));
  };

  const updatePersonal = (field: keyof ResumeDocument["personal"], value: string) => {
    setResume((current) => ({ ...current, personal: { ...current.personal, [field]: value } }));
  };

  const updateExperience = (id: string, field: keyof ExperienceItem, value: string) => {
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

  const updateEducation = (id: string, field: keyof EducationItem, value: string) => {
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
          <h2 id="education-heading">Education</h2>
          {sortedEducation.map((item) => (
            <div className="item-editor" key={item.id}>
              <TextField label="Degree" value={item.degree} onChange={(value) => updateEducation(item.id, "degree", value)} />
              <TextField label="Institution" value={item.institution} onChange={(value) => updateEducation(item.id, "institution", value)} />
              <div className="field-grid two-columns">
                <TextField label="Start" value={item.startDate} onChange={(value) => updateEducation(item.id, "startDate", value)} />
                <TextField label="End" value={item.endDate} onChange={(value) => updateEducation(item.id, "endDate", value)} />
              </div>
            </div>
          ))}
        </section>
        <section className="form-section" aria-labelledby="experience-heading">
          <h2 id="experience-heading">Experience</h2>
          {sortedExperience.map((item) => (
            <div className="item-editor" key={item.id}>
              <TextField label="Role" value={item.role} onChange={(value) => updateExperience(item.id, "role", value)} />
              <TextField label="Organization" value={item.organization} onChange={(value) => updateExperience(item.id, "organization", value)} />
              <div className="field-grid two-columns">
                <TextField label="Start" value={item.startDate} onChange={(value) => updateExperience(item.id, "startDate", value)} />
                <TextField label="End" value={item.endDate} onChange={(value) => updateExperience(item.id, "endDate", value)} />
              </div>
            </div>
          ))}
        </section>
      </aside>
      <section className="preview-stage" aria-label="Resume preview">
        <ResumePreview resume={resume} />
      </section>
    </main>
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
