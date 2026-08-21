import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  bulletsToText,
  reconcileLines,
  splitBulletLines,
  type EducationItem,
  type ExperienceItem,
  type ResumeDocument,
} from "@resume-builder/core";
import { FileText, LayoutGrid } from "lucide-react";
import { ResumePreview, applyTemplate, type Accent, type TemplateId } from "@resume-builder/render";

import { TemplateChooser } from "./onboarding/TemplateChooser";
import { DesignPanel } from "./sections/DesignPanel";
import { ExportBar } from "./sections/ExportBar";
import { PersonalPanel } from "./sections/PersonalPanel";
import { SummaryPanel } from "./sections/SummaryPanel";
import { HobbiesPanel, ReferencesPanel, SkillsPanel } from "./sections/panels";
import { TextField } from "./sections/fields";
import { AddButton, RemoveButton, UndoRow, makeId, useItemList } from "./sections/list-controls";
import { createBlankResume } from "./state/blank-resume";
import { createAutosave, loadWorkingDocument, type SaveStatus } from "./state/persistence";

import "./styles.css";
import "./templates.css";
import "./sections/panels.css";
import "./sections/fields.css";
import "./sections/photo.css";
import "./sections/design.css";
import "./export/print.css";
import "./onboarding/chooser.css";

type ExperienceTextField = "role" | "organization" | "location";
type EducationTextField = "degree" | "institution" | "location";

const months = [
  ["01", "January"], ["02", "February"], ["03", "March"], ["04", "April"],
  ["05", "May"], ["06", "June"], ["07", "July"], ["08", "August"],
  ["09", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
] as const;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 62 }, (_, index) => String(currentYear + 1 - index));

/* ------------------------------------------------------------------- Root */

type Phase = "loading" | "choosing" | "editing";

/**
 * Boot order: read IndexedDB → if there's a working document, resume editing;
 * if not, this is a first run, so show the template chooser over a blank
 * document. The chooser and the editor are never mounted together (see the
 * caution in TemplateChooser).
 */
function Root() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const autosave = useRef(createAutosave(setSaveStatus));

  useEffect(() => {
    let cancelled = false;

    void loadWorkingDocument().then((stored) => {
      if (cancelled) {
        return;
      }
      setResume(stored ?? createBlankResume());
      setPhase(stored ? "editing" : "choosing");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase === "editing" && resume) {
      autosave.current.save(resume);
    }
  }, [phase, resume]);

  useEffect(() => {
    const flush = () => void autosave.current.flush();
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  if (phase === "loading" || !resume) {
    return <p className="boot">Loading…</p>;
  }

  if (phase === "choosing") {
    return (
      <TemplateChooser
        onChoose={(templateId: TemplateId, accent: Accent) => {
          // applyTemplate also brings the pairing the template was designed
          // around; everything else the user chose is preserved.
          setResume({ ...resume, design: applyTemplate({ ...resume.design, accent }, templateId) });
          setPhase("editing");
        }}
        onSkip={() => setPhase("editing")}
      />
    );
  }

  return (
    <Editor
      onChooseTemplate={() => setPhase("choosing")}
      resume={resume}
      saveStatus={saveStatus}
      setResume={setResume}
    />
  );
}

/* ----------------------------------------------------------------- Editor */

function Editor({
  onChooseTemplate,
  resume,
  saveStatus,
  setResume,
}: {
  onChooseTemplate: () => void;
  resume: ResumeDocument;
  saveStatus: SaveStatus;
  setResume: (resume: ResumeDocument) => void;
}) {
  const setContent = <TKey extends keyof ResumeDocument["content"]>(
    key: TKey,
    value: ResumeDocument["content"][TKey],
  ) => setResume({ ...resume, content: { ...resume.content, [key]: value } });

  const experience = useItemList(resume.content.experience.items, (items) =>
    setContent("experience", { items }));
  const education = useItemList(resume.content.education.items, (items) =>
    setContent("education", { items }));

  // Sorted for display only — the stored order is never rewritten by sorting.
  const orderedExperience = useMemo(
    () => sortDatedItems(resume.content.experience.items),
    [resume.content.experience.items],
  );
  const orderedEducation = useMemo(
    () => sortDatedItems(resume.content.education.items),
    [resume.content.education.items],
  );

  const addExperience = () =>
    experience.add({
      id: makeId("x"),
      order: resume.content.experience.items.length,
      role: "",
      organization: "",
      startDate: currentMonthValue(),
      endDate: "present",
      bullets: [],
    } as ExperienceItem);

  const addEducation = () =>
    education.add({
      id: makeId("e"),
      order: resume.content.education.items.length,
      degree: "",
      institution: "",
      startDate: currentMonthValue(),
      endDate: currentMonthValue(),
      bullets: [],
    } as EducationItem);

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="dashboard-brand-icon" aria-hidden="true">
            <FileText size={22} strokeWidth={1.8} />
          </span>
          <div>
            <h1>Resume Builder</h1>
            <p>Create a professional resume that gets you hired</p>
          </div>
        </div>
        <div className="dashboard-actions">
          <ExportBar onImport={setResume} resume={resume} saveStatus={saveStatus} />
          <button className="dashboard-template-button" onClick={onChooseTemplate} type="button">
            <LayoutGrid size={16} strokeWidth={2} />
            <span>Browse templates</span>
          </button>
        </div>
      </header>

      <aside className="toolbar" aria-label="Resume controls">
        <div className="toolbar-content">
          <section className="form-section" aria-labelledby="personal-heading">
            <FormSectionHeader id="personal-heading" title="Personal Info" />
            <PersonalPanel
              onChange={(patch) => setResume({ ...resume, personal: { ...resume.personal, ...patch } })}
              personal={resume.personal}
              templateId={resume.design.templateId}
            />
          </section>

          <section className="form-section" aria-labelledby="summary-heading">
            <FormSectionHeader id="summary-heading" title="Summary" />
            <SummaryPanel onChange={(text) => setContent("summary", { text })} text={resume.content.summary.text} />
          </section>

          <section className="form-section" aria-labelledby="experience-heading">
            <FormSectionHeader count={orderedExperience.length} id="experience-heading" title="Experience" />
            {orderedExperience.length > 0 ? (
              <p className="form-note">Ordered automatically, most recent first.</p>
            ) : (
              <p className="form-note">
                No roles yet. Add your most recent position first — the rest sort themselves.
              </p>
            )}
            {orderedExperience.map((item) => (
              <div className="item-editor" key={item.id}>
                <div className="item-editor-header">
                  <TextField
                    label="Role"
                    onChange={(value) => experience.update(item.id, { role: value })}
                    value={item.role}
                  />
                  <RemoveButton
                    label={`Remove ${item.role || "role"}`}
                    onRemove={() => experience.remove(item.id)}
                  />
                </div>
                <TextField
                  label="Organisation"
                  onChange={(value) => experience.update(item.id, { organization: value })}
                  value={item.organization}
                />
                <TextField
                  label="Location"
                  onChange={(value) => experience.update(item.id, { location: emptyToUndefined(value) })}
                  value={item.location ?? ""}
                />
                <DateRangeFields
                  endDate={item.endDate}
                  onEndDateChange={(value) => experience.update(item.id, { endDate: value })}
                  onStartDateChange={(value) => experience.update(item.id, { startDate: value })}
                  startDate={item.startDate}
                />
                <DateValidationMessage endDate={item.endDate} startDate={item.startDate} />
                <BulletsField
                  bullets={item.bullets}
                  onChange={(value) =>
                    experience.update(item.id, { bullets: reconcileLines(item.bullets, value, makeBulletId) })}
                />
              </div>
            ))}
            <UndoRow removal={experience.removal} what="Role" />
            <AddButton label="Add a role" onClick={addExperience} />
          </section>

          <section className="form-section" aria-labelledby="education-heading">
            <FormSectionHeader count={orderedEducation.length} id="education-heading" title="Education" />
            {orderedEducation.length === 0 ? (
              <p className="form-note">Add your highest qualification.</p>
            ) : null}
            {orderedEducation.map((item) => (
              <div className="item-editor" key={item.id}>
                <div className="item-editor-header">
                  <TextField
                    label="Qualification"
                    onChange={(value) => education.update(item.id, { degree: value })}
                    value={item.degree}
                  />
                  <RemoveButton
                    label={`Remove ${item.degree || "qualification"}`}
                    onRemove={() => education.remove(item.id)}
                  />
                </div>
                <TextField
                  label="Institution"
                  onChange={(value) => education.update(item.id, { institution: value })}
                  value={item.institution}
                />
                <DateRangeFields
                  endDate={item.endDate}
                  onEndDateChange={(value) => education.update(item.id, { endDate: value })}
                  onStartDateChange={(value) => education.update(item.id, { startDate: value })}
                  startDate={item.startDate}
                />
                <DateValidationMessage endDate={item.endDate} startDate={item.startDate} />
                <BulletsField
                  bullets={item.bullets}
                  onChange={(value) =>
                    education.update(item.id, { bullets: reconcileLines(item.bullets, value, makeBulletId) })}
                />
              </div>
            ))}
            <UndoRow removal={education.removal} what="Qualification" />
            <AddButton label="Add a qualification" onClick={addEducation} />
          </section>

          <section className="form-section" aria-labelledby="skills-heading">
            <FormSectionHeader count={resume.content.skills.items.length} id="skills-heading" title="Skills" />
            <SkillsPanel items={resume.content.skills.items} onChange={(items) => setContent("skills", { items })} />
          </section>

          <section className="form-section" aria-labelledby="hobbies-heading">
            <FormSectionHeader count={resume.content.hobbies.items.length} id="hobbies-heading" title="Hobbies" />
            <HobbiesPanel items={resume.content.hobbies.items} onChange={(items) => setContent("hobbies", { items })} />
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
        </div>
      </aside>

      <section className="workspace" aria-label="Resume workspace">
        <div className="topbar">
          <DesignPanel
            design={resume.design}
            onChange={(patch) => setResume({ ...resume, design: { ...resume.design, ...patch } })}
          />
        </div>

        <section className="preview-stage" aria-label="Resume preview">
          <ResumePreview resume={resume} />
        </section>
      </section>
    </main>
  );
}

/* ---------------------------------------------------------------- helpers */

function sortDatedItems<T extends { endDate: string; order: number }>(items: T[]) {
  return [...items].sort((a, b) => dateSortValue(b.endDate) - dateSortValue(a.endDate) || a.order - b.order);
}

function dateSortValue(value: string) {
  return value.toLowerCase() === "present" ? Number.MAX_SAFE_INTEGER : Date.parse(`${value}-01`) || 0;
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function makeBulletId() {
  return `b-${crypto.randomUUID()}`;
}

function FormSectionHeader({ count, id, title }: { count?: number; id: string; title: string }) {
  return (
    <div className="form-section-header">
      <h2 id={id}>{title}</h2>
      {typeof count === "number" ? <span>{count}</span> : null}
    </div>
  );
}

function BulletsField({
  bullets,
  onChange,
}: {
  bullets: Array<{ id: string; order: number; text: string }>;
  onChange: (value: string) => void;
}) {
  const bulletText = bulletsToText(bullets);
  const [draft, setDraft] = useState(bulletText);
  const longest = bullets.reduce((max, bullet) => Math.max(max, bullet.text.length), 0);

  useEffect(() => {
    if (canonicalBulletText(draft) !== bulletText) {
      setDraft(bulletText);
    }
  }, [bulletText, draft]);

  return (
    <label>
      Achievements — one per line
      <textarea
        className="bullets-textarea"
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value);
        }}
        rows={Math.max(3, Math.min(8, bullets.length + 1))}
        value={draft}
      />
      <span className="counter-line">
        {bullets.length} {bullets.length === 1 ? "bullet" : "bullets"}
        {longest > 0 ? ` · longest ${longest} characters` : ""}
      </span>
    </label>
  );
}

function canonicalBulletText(text: string) {
  return splitBulletLines(text).join("\n");
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
      <MonthYearField label="Start" onChange={onStartDateChange} value={startDate} />
      <MonthYearField disabled={isCurrent} label="End" onChange={onEndDateChange} value={isCurrent ? "" : endDate} />
      <label className="checkbox-field">
        <input
          checked={isCurrent}
          onChange={(event) => onEndDateChange(event.target.checked ? "present" : currentMonthValue())}
          type="checkbox"
        />
        Current
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
        onChange={(event) => onChange(`${year}-${event.target.value}`)}
        value={month}
      >
        {months.map(([candidate, name]) => (
          <option key={candidate} value={candidate}>{name}</option>
        ))}
      </select>
      <select
        aria-label={`${label} year`}
        onChange={(event) => onChange(`${event.target.value}-${month}`)}
        value={year}
      >
        {years.map((candidate) => (
          <option key={candidate} value={candidate}>{candidate}</option>
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
