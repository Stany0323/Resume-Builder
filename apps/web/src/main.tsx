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
import { ChevronRight, FileText, LayoutGrid } from "lucide-react";
import {
  ResumePreview,
  applyTemplate,
  type Accent,
  type TemplateId,
} from "@resume-builder/render";

import { TemplateChooser } from "./onboarding/TemplateChooser";
import { DesignPanel } from "./sections/DesignPanel";
import { ExportBar } from "./sections/ExportBar";
import { PersonalPanel } from "./sections/PersonalPanel";
import { SummaryPanel } from "./sections/SummaryPanel";
import {
  HobbiesPanel,
  LanguagesPanel,
  ReferencesPanel,
  SkillsPanel,
} from "./sections/panels";
import { TextField } from "./sections/fields";
import {
  AddButton,
  RemoveButton,
  UndoRow,
  makeId,
  useItemList,
} from "./sections/list-controls";
import { createBlankResume } from "./state/blank-resume";
import {
  createAutosave,
  loadWorkingDocument,
  type SaveStatus,
} from "./state/persistence";

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
type SidebarSectionId =
  | "education"
  | "experience"
  | "hobbies"
  | "languages"
  | "personal"
  | "references"
  | "skills"
  | "summary";

type EntryLogo = { assetId: string };

const LOGO_OUTPUT_SIZE = 256;
const LOGO_IMAGE_QUALITY = 0.86;
const MAX_LOGO_UPLOAD_BYTES = 4 * 1024 * 1024;
const LOGO_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
const SIDEBAR_SECTION_TOP_GAP = 12;

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
const years = Array.from({ length: 62 }, (_, index) =>
  String(currentYear + 1 - index),
);

type Phase = "loading" | "choosing" | "editing";

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
          setResume({
            ...resume,
            design: applyTemplate({ ...resume.design, accent }, templateId),
          });
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
    setContent("experience", { items }),
  );
  const education = useItemList(resume.content.education.items, (items) =>
    setContent("education", { items }),
  );
  const [activeSidebarSection, setActiveSidebarSection] =
    useState<SidebarSectionId | null>("personal");
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const sidebarSectionRefs = useRef<
    Partial<Record<SidebarSectionId, HTMLElement | null>>
  >({});
  const toggleSidebarSection = (sectionId: SidebarSectionId) =>
    setActiveSidebarSection((current) =>
      current === sectionId ? null : sectionId,
    );

  useEffect(() => {
    if (!activeSidebarSection) {
      return;
    }

    const scrollContainer = sidebarScrollRef.current;
    const section = sidebarSectionRefs.current[activeSidebarSection];
    if (!scrollContainer || !section) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();

      scrollContainer.scrollTo({
        top:
          scrollContainer.scrollTop +
          sectionRect.top -
          containerRect.top -
          SIDEBAR_SECTION_TOP_GAP,
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeSidebarSection]);

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
          <ExportBar
            onImport={setResume}
            resume={resume}
            saveStatus={saveStatus}
          />
          <DesignPanel
            design={resume.design}
            onChange={(patch) =>
              setResume({ ...resume, design: { ...resume.design, ...patch } })
            }
          />
          <button
            className="dashboard-template-button"
            onClick={onChooseTemplate}
            type="button"
          >
            <LayoutGrid size={16} strokeWidth={2} />
            <span>Browse templates</span>
          </button>
        </div>
      </header>

      <aside className="toolbar" aria-label="Resume controls">
        <div className="toolbar-content" ref={sidebarScrollRef}>
          <SidebarSection
            id="personal"
            isOpen={activeSidebarSection === "personal"}
            onToggle={() => toggleSidebarSection("personal")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.personal = node;
            }}
            title="Personal Info"
          >
            <PersonalPanel
              onChange={(patch) =>
                setResume({
                  ...resume,
                  personal: { ...resume.personal, ...patch },
                })
              }
              personal={resume.personal}
              templateId={resume.design.templateId}
            />
          </SidebarSection>

          <SidebarSection
            id="summary"
            isOpen={activeSidebarSection === "summary"}
            onToggle={() => toggleSidebarSection("summary")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.summary = node;
            }}
            title="Summary"
          >
            <SummaryPanel
              onChange={(text) => setContent("summary", { text })}
              text={resume.content.summary.text}
            />
          </SidebarSection>

          <SidebarSection
            count={orderedExperience.length}
            id="experience"
            isOpen={activeSidebarSection === "experience"}
            onToggle={() => toggleSidebarSection("experience")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.experience = node;
            }}
            title="Experience"
          >
            {orderedExperience.length > 0 ? (
              <p className="form-note">
                Ordered automatically, most recent first.
              </p>
            ) : (
              <p className="form-note">
                No roles yet. Add your most recent position first — the rest
                sort themselves.
              </p>
            )}
            {orderedExperience.map((item) => (
              <div className="item-editor" key={item.id}>
                <div className="item-editor-header">
                  <TextField
                    label="Role"
                    onChange={(value) =>
                      experience.update(item.id, { role: value })
                    }
                    value={item.role}
                  />
                  <RemoveButton
                    label={`Remove ${item.role || "role"}`}
                    onRemove={() => experience.remove(item.id)}
                  />
                </div>
                <TextField
                  label="Organisation"
                  onChange={(value) =>
                    experience.update(item.id, { organization: value })
                  }
                  value={item.organization}
                />
                <EntryLogoField
                  entity={item.organization}
                  label="Organisation logo"
                  logo={item.organizationLogo ?? null}
                  onChange={(logo) =>
                    experience.update(item.id, { organizationLogo: logo })
                  }
                />
                <TextField
                  label="Location"
                  onChange={(value) =>
                    experience.update(item.id, {
                      location: emptyToUndefined(value),
                    })
                  }
                  value={item.location ?? ""}
                />
                <DateRangeFields
                  endDate={item.endDate}
                  onEndDateChange={(value) =>
                    experience.update(item.id, { endDate: value })
                  }
                  onStartDateChange={(value) =>
                    experience.update(item.id, { startDate: value })
                  }
                  startDate={item.startDate}
                />
                <DateValidationMessage
                  endDate={item.endDate}
                  startDate={item.startDate}
                />
                <BulletsField
                  bullets={item.bullets}
                  onChange={(value) =>
                    experience.update(item.id, {
                      bullets: reconcileLines(
                        item.bullets,
                        value,
                        makeBulletId,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <UndoRow removal={experience.removal} what="Role" />
            <AddButton label="Add a role" onClick={addExperience} />
          </SidebarSection>

          <SidebarSection
            count={orderedEducation.length}
            id="education"
            isOpen={activeSidebarSection === "education"}
            onToggle={() => toggleSidebarSection("education")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.education = node;
            }}
            title="Education"
          >
            {orderedEducation.length === 0 ? (
              <p className="form-note">Add your highest qualification.</p>
            ) : null}
            {orderedEducation.map((item) => (
              <div className="item-editor" key={item.id}>
                <div className="item-editor-header">
                  <TextField
                    label="Qualification"
                    onChange={(value) =>
                      education.update(item.id, { degree: value })
                    }
                    value={item.degree}
                  />
                  <RemoveButton
                    label={`Remove ${item.degree || "qualification"}`}
                    onRemove={() => education.remove(item.id)}
                  />
                </div>
                <TextField
                  label="Institution"
                  onChange={(value) =>
                    education.update(item.id, { institution: value })
                  }
                  value={item.institution}
                />
                <EntryLogoField
                  entity={item.institution}
                  label="Institution logo"
                  logo={item.institutionLogo ?? null}
                  onChange={(logo) =>
                    education.update(item.id, { institutionLogo: logo })
                  }
                />
                <DateRangeFields
                  endDate={item.endDate}
                  onEndDateChange={(value) =>
                    education.update(item.id, { endDate: value })
                  }
                  onStartDateChange={(value) =>
                    education.update(item.id, { startDate: value })
                  }
                  startDate={item.startDate}
                />
                <DateValidationMessage
                  endDate={item.endDate}
                  startDate={item.startDate}
                />
                <BulletsField
                  bullets={item.bullets}
                  onChange={(value) =>
                    education.update(item.id, {
                      bullets: reconcileLines(
                        item.bullets,
                        value,
                        makeBulletId,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <UndoRow removal={education.removal} what="Qualification" />
            <AddButton label="Add a qualification" onClick={addEducation} />
          </SidebarSection>

          <SidebarSection
            count={resume.content.skills.items.length}
            id="skills"
            isOpen={activeSidebarSection === "skills"}
            onToggle={() => toggleSidebarSection("skills")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.skills = node;
            }}
            title="Skills"
          >
            <SkillsPanel
              items={resume.content.skills.items}
              onChange={(items) => setContent("skills", { items })}
            />
          </SidebarSection>

          <SidebarSection
            count={resume.content.languages.items.length}
            id="languages"
            isOpen={activeSidebarSection === "languages"}
            onToggle={() => toggleSidebarSection("languages")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.languages = node;
            }}
            title="Languages"
          >
            <LanguagesPanel
              items={resume.content.languages.items}
              onChange={(items) => setContent("languages", { items })}
            />
          </SidebarSection>

          <SidebarSection
            count={resume.content.hobbies.items.length}
            id="hobbies"
            isOpen={activeSidebarSection === "hobbies"}
            onToggle={() => toggleSidebarSection("hobbies")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.hobbies = node;
            }}
            title="Hobbies"
          >
            <HobbiesPanel
              items={resume.content.hobbies.items}
              onChange={(items) => setContent("hobbies", { items })}
            />
          </SidebarSection>

          <SidebarSection
            count={
              resume.content.references.mode === "listed"
                ? resume.content.references.items.length
                : 0
            }
            id="references"
            isOpen={activeSidebarSection === "references"}
            onToggle={() => toggleSidebarSection("references")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.references = node;
            }}
            title="References"
          >
            <ReferencesPanel
              items={resume.content.references.items}
              mode={resume.content.references.mode}
              onChange={(references) => setContent("references", references)}
            />
          </SidebarSection>
        </div>
      </aside>

      <section className="workspace" aria-label="Resume workspace">
        <section className="preview-stage" aria-label="Resume preview">
          <ResumePreview resume={resume} />
        </section>
      </section>
    </main>
  );
}

/* ---------------------------------------------------------------- helpers */

function sortDatedItems<T extends { endDate: string; order: number }>(
  items: T[],
) {
  return [...items].sort(
    (a, b) =>
      dateSortValue(b.endDate) - dateSortValue(a.endDate) || a.order - b.order,
  );
}

function dateSortValue(value: string) {
  return value.toLowerCase() === "present"
    ? Number.MAX_SAFE_INTEGER
    : Date.parse(`${value}-01`) || 0;
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

function SidebarSection({
  children,
  count,
  id,
  isOpen,
  onToggle,
  sectionRef,
  title,
}: {
  children: React.ReactNode;
  count?: number;
  id: SidebarSectionId;
  isOpen: boolean;
  onToggle: () => void;
  sectionRef?: (node: HTMLElement | null) => void;
  title: string;
}) {
  const headingId = `${id}-heading`;
  const bodyId = `${id}-panel`;

  return (
    <section
      className="form-section"
      aria-labelledby={headingId}
      data-open={isOpen ? "true" : "false"}
      ref={sectionRef}
    >
      <FormSectionHeader
        bodyId={bodyId}
        count={count}
        id={headingId}
        isOpen={isOpen}
        onToggle={onToggle}
        title={title}
      />
      <div className="form-section-body" hidden={!isOpen} id={bodyId}>
        {children}
      </div>
    </section>
  );
}

function FormSectionHeader({
  bodyId,
  count,
  id,
  isOpen,
  onToggle,
  title,
}: {
  bodyId: string;
  count?: number;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <div className="form-section-header">
      <h2 id={id}>
        <button
          aria-controls={bodyId}
          aria-expanded={isOpen}
          className="form-section-toggle"
          onClick={onToggle}
          type="button"
        >
          <span className="form-section-title">
            <ChevronRight aria-hidden="true" size={16} strokeWidth={2.2} />
            <span>{title}</span>
          </span>
          {typeof count === "number" ? (
            <span className="form-section-count">{count}</span>
          ) : null}
        </button>
      </h2>
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
  const longest = bullets.reduce(
    (max, bullet) => Math.max(max, bullet.text.length),
    0,
  );

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

function EntryLogoField({
  entity,
  label,
  logo,
  onChange,
}: {
  entity: string;
  label: string;
  logo: EntryLogo | null;
  onChange: (logo: EntryLogo | null) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setError(null);

    if (!LOGO_ACCEPTED_TYPES.includes(file.type)) {
      setError("Use a JPEG, PNG, WebP or SVG logo.");
      return;
    }

    if (file.size > MAX_LOGO_UPLOAD_BYTES) {
      setError("That logo is over 4MB. Try a smaller file.");
      return;
    }

    setBusy(true);
    try {
      onChange({ assetId: await renderLogoFile(file) });
    } catch {
      setError("That logo could not be read.");
    } finally {
      setBusy(false);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  };

  return (
    <div className="logo-field">
      <span className="field-group-label">{label}</span>
      {logo ? (
        <div className="logo-current">
          <img
            alt={entity ? `${entity} logo` : ""}
            className="logo-preview"
            src={logo.assetId}
          />
          <div className="photo-current-actions">
            <button
              className="link-button"
              onClick={() => fileInput.current?.click()}
              type="button"
            >
              Replace
            </button>
            <button
              className="link-button"
              onClick={() => onChange(null)}
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            className="add-button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            type="button"
          >
            {busy ? "Reading..." : `+ Add ${label.toLowerCase()}`}
          </button>
          <span className="field-hint">
            Optional mark shown beside this entry.
          </span>
        </>
      )}
      <input
        accept={LOGO_ACCEPTED_TYPES.join(",")}
        onChange={(event) => void handleFile(event.target.files?.[0])}
        ref={fileInput}
        style={{ display: "none" }}
        type="file"
      />
      {error ? (
        <p className="field-message" role="alert">
          {error}
        </p>
      ) : null}
    </div>
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
      <MonthYearField
        label="Start"
        onChange={onStartDateChange}
        value={startDate}
      />
      <MonthYearField
        disabled={isCurrent}
        label="End"
        onChange={onEndDateChange}
        value={isCurrent ? "" : endDate}
      />
      <label className="checkbox-field">
        <input
          checked={isCurrent}
          onChange={(event) =>
            onEndDateChange(
              event.target.checked ? "present" : currentMonthValue(),
            )
          }
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
          <option key={candidate} value={candidate}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} year`}
        onChange={(event) => onChange(`${event.target.value}-${month}`)}
        value={year}
      >
        {years.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

function DateValidationMessage({
  endDate,
  startDate,
}: {
  endDate: string;
  startDate: string;
}) {
  if (
    endDate === "present" ||
    dateSortValue(endDate) >= dateSortValue(startDate)
  ) {
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

async function renderLogoFile(file: File): Promise<string> {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = LOGO_OUTPUT_SIZE;
  canvas.height = LOGO_OUTPUT_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas unavailable");
  }

  context.imageSmoothingQuality = "high";

  const scale = Math.min(
    LOGO_OUTPUT_SIZE / image.naturalWidth,
    LOGO_OUTPUT_SIZE / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  context.drawImage(
    image,
    (LOGO_OUTPUT_SIZE - width) / 2,
    (LOGO_OUTPUT_SIZE - height) / 2,
    width,
    height,
  );

  return canvas.toDataURL("image/png", LOGO_IMAGE_QUALITY);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image failed to load"));
    };
    image.src = url;
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
