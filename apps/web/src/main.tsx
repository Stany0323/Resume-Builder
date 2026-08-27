import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  bulletsToText,
  reconcileLines,
  splitBulletLines,
  type EducationItem,
  type ExperienceItem,
  type CertificationItem,
  type ProfileType,
  type ProjectItem,
  type ResumeDocument,
} from "@resume-builder/core";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  LayoutGrid,
} from "lucide-react";
import { ResumePreview, applyTemplate } from "@resume-builder/render";

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
import { ProseField, TextField } from "./sections/fields";
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
  | "goal"
  | "hobbies"
  | "languages"
  | "personal"
  | "projects"
  | "certifications"
  | "references"
  | "skills"
  | "summary";

type EntryLogo = { assetId: string };
type SectionPriority = "recommended" | "useful" | "optional";
type StrategyCheck = {
  id: string;
  label: string;
  met: boolean;
};
type ResumeProgress = {
  completed: number;
  percent: number;
  total: number;
};

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
        onChoose={({ accent, profileType, targetRole, templateId }) => {
          setResume({
            ...resume,
            meta: {
              ...resume.meta,
              profileType,
              targetRole: targetRole || undefined,
            },
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
  const setMeta = (patch: Partial<ResumeDocument["meta"]>) =>
    setResume({ ...resume, meta: { ...resume.meta, ...patch } });

  const experience = useItemList(resume.content.experience.items, (items) =>
    setContent("experience", { items }),
  );
  const education = useItemList(resume.content.education.items, (items) =>
    setContent("education", { items }),
  );
  const projects = useItemList(resume.content.projects.items, (items) =>
    setContent("projects", { items }),
  );
  const certifications = useItemList(
    resume.content.certifications.items,
    (items) => setContent("certifications", { items }),
  );
  const [activeSidebarSection, setActiveSidebarSection] =
    useState<SidebarSectionId | null>("goal");
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
  const orderedProjects = useMemo(
    () => sortDatedItems(resume.content.projects.items),
    [resume.content.projects.items],
  );
  const orderedCertifications = useMemo(
    () => sortIssuedItems(resume.content.certifications.items),
    [resume.content.certifications.items],
  );
  const sidebarOrder = getEditorSidebarOrder(resume.meta.profileType);
  const sectionPriorities = getSectionPriorities(resume.meta.profileType);
  const strategyChecks = getStrategyChecks(resume);
  const resumeProgress = getResumeProgress(strategyChecks);
  const summaryLabel = getSummaryLabel(resume.meta.profileType);
  const profileLabel = getProfileLabel(resume.meta.profileType);

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

  const addProject = () =>
    projects.add({
      id: makeId("p"),
      order: resume.content.projects.items.length,
      name: "",
      startDate: currentMonthValue(),
      endDate: currentMonthValue(),
      summary: "",
      bullets: [],
    } as ProjectItem);

  const addCertification = () =>
    certifications.add({
      id: makeId("c"),
      order: resume.content.certifications.items.length,
      name: "",
      issuer: "",
      issuedDate: currentMonthValue(),
    } as CertificationItem);

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="dashboard-brand-icon" aria-hidden="true">
            <FileText size={22} strokeWidth={1.8} />
          </span>
          <div>
            <h1>Resume Builder</h1>
            <p>
              {resume.meta.targetRole
                ? `${profileLabel} resume for ${resume.meta.targetRole}`
                : `${profileLabel} resume`}
            </p>
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
            order={sidebarOrder.indexOf("personal")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.personal = node;
            }}
            priority={sectionPriorities.personal}
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
            id="goal"
            isOpen={activeSidebarSection === "goal"}
            onToggle={() => toggleSidebarSection("goal")}
            order={sidebarOrder.indexOf("goal")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.goal = node;
            }}
            title="Goal"
          >
            <GoalPanel
              onChange={(patch) => setMeta(patch)}
              profileType={resume.meta.profileType}
              strategyChecks={strategyChecks}
              targetRole={resume.meta.targetRole ?? ""}
            />
          </SidebarSection>

          <SidebarSection
            id="summary"
            isOpen={activeSidebarSection === "summary"}
            onToggle={() => toggleSidebarSection("summary")}
            order={sidebarOrder.indexOf("summary")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.summary = node;
            }}
            priority={sectionPriorities.summary}
            title={summaryLabel}
          >
            <SummaryPanel
              label={summaryLabel}
              onChange={(text) => setContent("summary", { text })}
              profileType={resume.meta.profileType}
              targetRole={resume.meta.targetRole}
              text={resume.content.summary.text}
            />
          </SidebarSection>

          <SidebarSection
            count={orderedExperience.length}
            id="experience"
            isOpen={activeSidebarSection === "experience"}
            onToggle={() => toggleSidebarSection("experience")}
            order={sidebarOrder.indexOf("experience")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.experience = node;
            }}
            priority={sectionPriorities.experience}
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
            order={sidebarOrder.indexOf("education")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.education = node;
            }}
            priority={sectionPriorities.education}
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
            count={orderedProjects.length}
            id="projects"
            isOpen={activeSidebarSection === "projects"}
            onToggle={() => toggleSidebarSection("projects")}
            order={sidebarOrder.indexOf("projects")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.projects = node;
            }}
            priority={sectionPriorities.projects}
            title="Projects"
          >
            {orderedProjects.length === 0 ? (
              <p className="form-note">
                Add academic, freelance, volunteer or portfolio work that proves
                your skills.
              </p>
            ) : (
              <p className="form-note">
                Ordered automatically, most recent first.
              </p>
            )}
            {orderedProjects.map((item) => (
              <div className="item-editor" key={item.id}>
                <div className="item-editor-header">
                  <TextField
                    label="Project name"
                    onChange={(name) => projects.update(item.id, { name })}
                    value={item.name}
                  />
                  <RemoveButton
                    label={`Remove ${item.name || "project"}`}
                    onRemove={() => projects.remove(item.id)}
                  />
                </div>
                <div className="field-grid two-columns">
                  <TextField
                    label="Role"
                    onChange={(role) =>
                      projects.update(item.id, { role: emptyToUndefined(role) })
                    }
                    value={item.role ?? ""}
                  />
                  <TextField
                    label="Tools"
                    onChange={(tools) =>
                      projects.update(item.id, {
                        tools: emptyToUndefined(tools),
                      })
                    }
                    value={item.tools ?? ""}
                  />
                </div>
                <TextField
                  inputMode="url"
                  label="Link"
                  onChange={(link) =>
                    projects.update(item.id, { link: emptyToUndefined(link) })
                  }
                  value={item.link ?? ""}
                />
                <DateRangeFields
                  endDate={item.endDate}
                  onEndDateChange={(value) =>
                    projects.update(item.id, { endDate: value })
                  }
                  onStartDateChange={(value) =>
                    projects.update(item.id, { startDate: value })
                  }
                  startDate={item.startDate}
                />
                <DateValidationMessage
                  endDate={item.endDate}
                  startDate={item.startDate}
                />
                <ProseField
                  label="Short description"
                  onChange={(summary) =>
                    projects.update(item.id, {
                      summary: emptyToUndefined(summary),
                    })
                  }
                  rows={3}
                  value={item.summary ?? ""}
                />
                <BulletsField
                  bullets={item.bullets}
                  onChange={(value) =>
                    projects.update(item.id, {
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
            <UndoRow removal={projects.removal} what="Project" />
            <AddButton label="Add a project" onClick={addProject} />
          </SidebarSection>

          <SidebarSection
            count={orderedCertifications.length}
            id="certifications"
            isOpen={activeSidebarSection === "certifications"}
            onToggle={() => toggleSidebarSection("certifications")}
            order={sidebarOrder.indexOf("certifications")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.certifications = node;
            }}
            priority={sectionPriorities.certifications}
            title="Certifications"
          >
            {orderedCertifications.length === 0 ? (
              <p className="form-note">
                Add licences, certificates, short courses and verified training.
              </p>
            ) : (
              <p className="form-note">
                Ordered automatically, newest issued date first.
              </p>
            )}
            {orderedCertifications.map((item) => (
              <div className="item-editor" key={item.id}>
                <div className="item-editor-header">
                  <TextField
                    label="Certification"
                    onChange={(name) =>
                      certifications.update(item.id, { name })
                    }
                    value={item.name}
                  />
                  <RemoveButton
                    label={`Remove ${item.name || "certification"}`}
                    onRemove={() => certifications.remove(item.id)}
                  />
                </div>
                <TextField
                  label="Issuer"
                  onChange={(issuer) =>
                    certifications.update(item.id, { issuer })
                  }
                  value={item.issuer}
                />
                <CertificationDateFields
                  expiryDate={item.expiryDate}
                  issuedDate={item.issuedDate}
                  onExpiryDateChange={(expiryDate) =>
                    certifications.update(item.id, { expiryDate })
                  }
                  onIssuedDateChange={(issuedDate) =>
                    certifications.update(item.id, { issuedDate })
                  }
                />
                <TextField
                  inputMode="url"
                  label="Credential link"
                  onChange={(credentialUrl) =>
                    certifications.update(item.id, {
                      credentialUrl: emptyToUndefined(credentialUrl),
                    })
                  }
                  value={item.credentialUrl ?? ""}
                />
              </div>
            ))}
            <UndoRow removal={certifications.removal} what="Certification" />
            <AddButton label="Add a certification" onClick={addCertification} />
          </SidebarSection>

          <SidebarSection
            count={resume.content.skills.items.length}
            id="skills"
            isOpen={activeSidebarSection === "skills"}
            onToggle={() => toggleSidebarSection("skills")}
            order={sidebarOrder.indexOf("skills")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.skills = node;
            }}
            priority={sectionPriorities.skills}
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
            order={sidebarOrder.indexOf("languages")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.languages = node;
            }}
            priority={sectionPriorities.languages}
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
            order={sidebarOrder.indexOf("hobbies")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.hobbies = node;
            }}
            priority={sectionPriorities.hobbies}
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
            order={sidebarOrder.indexOf("references")}
            sectionRef={(node) => {
              sidebarSectionRefs.current.references = node;
            }}
            priority={sectionPriorities.references}
            title="References"
          >
            <ReferencesPanel
              items={resume.content.references.items}
              mode={resume.content.references.mode}
              onChange={(references) => setContent("references", references)}
            />
          </SidebarSection>
        </div>
        <ResumeProgressFooter
          profileLabel={profileLabel}
          progress={resumeProgress}
          targetRole={resume.meta.targetRole}
        />
      </aside>

      <section className="workspace" aria-label="Resume workspace">
        <section className="preview-stage" aria-label="Resume preview">
          <ResumePreview resume={resume} />
        </section>
      </section>
    </main>
  );
}

function ResumeProgressFooter({
  profileLabel,
  progress,
  targetRole,
}: {
  profileLabel: string;
  progress: ResumeProgress;
  targetRole?: string;
}) {
  return (
    <footer className="resume-progress-footer">
      <div className="resume-progress-copy">
        <span>Resume progress</span>
        <strong>{progress.percent}%</strong>
      </div>
      <div
        aria-label={`Resume progress ${progress.percent}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress.percent}
        className="resume-progress-track"
        role="progressbar"
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="resume-progress-meta">
        <span>{profileLabel}</span>
        <span>
          {progress.completed}/{progress.total} essentials
        </span>
      </div>
      <p>
        {targetRole?.trim()
          ? `Tuned for ${targetRole}.`
          : "Add a target role to tune the checklist."}
      </p>
    </footer>
  );
}

function GoalPanel({
  onChange,
  profileType,
  strategyChecks,
  targetRole,
}: {
  onChange: (patch: Partial<ResumeDocument["meta"]>) => void;
  profileType: ProfileType;
  strategyChecks: StrategyCheck[];
  targetRole: string;
}) {
  const completeCount = strategyChecks.filter((check) => check.met).length;

  return (
    <>
      <label>
        Resume type
        <select
          onChange={(event) =>
            onChange({ profileType: event.target.value as ProfileType })
          }
          value={profileType}
        >
          {PROFILE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <TextField
        hint="Used later for matching, scoring and smarter suggestions."
        label="Target role"
        onChange={(value) => onChange({ targetRole: emptyToUndefined(value) })}
        value={targetRole}
      />
      <p className="form-note">{getProfileGuidance(profileType)}</p>
      <div className="strategy-card">
        <div className="strategy-card-header">
          <strong>Resume focus</strong>
          <span>
            {completeCount}/{strategyChecks.length}
          </span>
        </div>
        <ul className="strategy-checks">
          {strategyChecks.map((check) => (
            <li data-met={check.met ? "true" : "false"} key={check.id}>
              {check.met ? (
                <CheckCircle2 aria-hidden="true" size={15} strokeWidth={2.2} />
              ) : (
                <AlertCircle aria-hidden="true" size={15} strokeWidth={2.2} />
              )}
              <span>{check.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- helpers */

const PROFILE_OPTIONS: Array<{ label: string; value: ProfileType }> = [
  { label: "Professional", value: "professional" },
  { label: "Graduate / Entry-level", value: "graduate" },
  { label: "Intern", value: "intern" },
  { label: "Attachee", value: "attachee" },
  { label: "Career changer", value: "careerChanger" },
];

const SECTION_PRIORITY_LABELS: Record<SectionPriority, string> = {
  recommended: "Recommended",
  useful: "Useful",
  optional: "Optional",
};

function getResumeProgress(strategyChecks: StrategyCheck[]): ResumeProgress {
  const total = strategyChecks.length;
  const completed = strategyChecks.filter((check) => check.met).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, percent, total };
}

function getEditorSidebarOrder(profileType: ProfileType): SidebarSectionId[] {
  if (["attachee", "graduate", "intern"].includes(profileType)) {
    if (profileType === "attachee") {
      return [
        "goal",
        "personal",
        "summary",
        "education",
        "skills",
        "projects",
        "certifications",
        "experience",
        "languages",
        "hobbies",
        "references",
      ];
    }

    return [
      "goal",
      "personal",
      "summary",
      "education",
      "projects",
      "skills",
      "certifications",
      "experience",
      "languages",
      "hobbies",
      "references",
    ];
  }

  if (profileType === "careerChanger") {
    return [
      "goal",
      "personal",
      "summary",
      "skills",
      "projects",
      "experience",
      "certifications",
      "education",
      "languages",
      "hobbies",
      "references",
    ];
  }

  return [
    "goal",
    "personal",
    "summary",
    "experience",
    "skills",
    "certifications",
    "education",
    "projects",
    "languages",
    "hobbies",
    "references",
  ];
}

function getSectionPriorities(
  profileType: ProfileType,
): Partial<Record<SidebarSectionId, SectionPriority>> {
  const base: Partial<Record<SidebarSectionId, SectionPriority>> = {
    personal: "recommended",
    summary: "recommended",
    languages: "useful",
    hobbies: "optional",
  };

  switch (profileType) {
    case "attachee":
      return {
        ...base,
        education: "recommended",
        skills: "recommended",
        projects: "recommended",
        certifications: "useful",
        experience: "useful",
        references: "recommended",
      };
    case "careerChanger":
      return {
        ...base,
        skills: "recommended",
        projects: "recommended",
        experience: "recommended",
        certifications: "useful",
        education: "useful",
        references: "optional",
      };
    case "graduate":
    case "intern":
      return {
        ...base,
        education: "recommended",
        projects: "recommended",
        skills: "recommended",
        certifications: "useful",
        experience: "useful",
        references: profileType === "intern" ? "recommended" : "useful",
      };
    case "professional":
      return {
        ...base,
        experience: "recommended",
        skills: "recommended",
        certifications: "useful",
        education: "useful",
        projects: "optional",
        references: "optional",
      };
  }
}

function getStrategyChecks(resume: ResumeDocument): StrategyCheck[] {
  const common: StrategyCheck[] = [
    {
      id: "target-role",
      label: "Set a target role",
      met: Boolean(resume.meta.targetRole?.trim()),
    },
    {
      id: "contact",
      label: "Add name, email and phone",
      met: Boolean(
        resume.personal.firstName.trim() &&
          resume.personal.lastName.trim() &&
          resume.personal.email.trim() &&
          resume.personal.phone.trim(),
      ),
    },
    {
      id: "summary",
      label: `Write the ${getSummaryLabel(resume.meta.profileType).toLowerCase()}`,
      met: resume.content.summary.text.trim().length >= 80,
    },
  ];

  switch (resume.meta.profileType) {
    case "attachee":
      return [
        ...common,
        {
          id: "education",
          label: "Add your institution and programme",
          met: hasFilledEducation(resume),
        },
        {
          id: "skills",
          label: "Add practical skills",
          met: countSkills(resume) >= 4,
        },
        {
          id: "references",
          label: "Add at least one referee",
          met:
            resume.content.references.mode === "listed" &&
            resume.content.references.items.length > 0,
        },
      ];
    case "careerChanger":
      return [
        ...common,
        {
          id: "skills",
          label: "Lead with transferable skills",
          met: countSkills(resume) >= 6,
        },
        {
          id: "projects",
          label: "Add proof for the new direction",
          met: resume.content.projects.items.length > 0,
        },
        {
          id: "experience",
          label: "Connect past work to the target role",
          met: hasAchievementBullets(resume.content.experience.items),
        },
      ];
    case "graduate":
    case "intern":
      return [
        ...common,
        {
          id: "education",
          label: "Add education details",
          met: hasFilledEducation(resume),
        },
        {
          id: "projects",
          label: "Add at least one project",
          met: resume.content.projects.items.length > 0,
        },
        {
          id: "skills",
          label: "Add 4 or more relevant skills",
          met: countSkills(resume) >= 4,
        },
      ];
    case "professional":
      return [
        ...common,
        {
          id: "experience",
          label: "Add recent experience",
          met: resume.content.experience.items.length > 0,
        },
        {
          id: "achievements",
          label: "Add measurable achievements",
          met: hasAchievementBullets(resume.content.experience.items),
        },
        {
          id: "skills",
          label: "Add role-specific skills",
          met: countSkills(resume) >= 6,
        },
      ];
  }
}

function getSummaryLabel(profileType: ProfileType) {
  return ["attachee", "graduate", "intern"].includes(profileType)
    ? "Career Objective"
    : "Professional Summary";
}

function getProfileLabel(profileType: ProfileType) {
  return (
    PROFILE_OPTIONS.find((option) => option.value === profileType)?.label ??
    "Professional"
  );
}

function getProfileGuidance(profileType: ProfileType) {
  switch (profileType) {
    case "attachee":
      return "Lead with education, practical skills, field of study and attachment goals.";
    case "careerChanger":
      return "Lead with transferable skills and connect your past work to the new role.";
    case "graduate":
      return "Lead with education, projects, certifications and early proof.";
    case "intern":
      return "Lead with coursework, practical skills, projects and readiness.";
    case "professional":
      return "Lead with experience, measurable achievements and role-specific strengths.";
  }
}

function hasFilledEducation(resume: ResumeDocument) {
  return resume.content.education.items.some(
    (item) => item.degree.trim() && item.institution.trim(),
  );
}

function countSkills(resume: ResumeDocument) {
  return resume.content.skills.items.reduce(
    (total, group) =>
      total + group.entries.filter((entry) => entry.trim()).length,
    0,
  );
}

function hasAchievementBullets(
  items: Array<{ bullets: Array<{ text: string }> }>,
) {
  return items.some((item) =>
    item.bullets.some((bullet) => /\d|%|\$|£|€|x\b/i.test(bullet.text)),
  );
}

function sortDatedItems<T extends { endDate: string; order: number }>(
  items: T[],
) {
  return [...items].sort(
    (a, b) =>
      dateSortValue(b.endDate) - dateSortValue(a.endDate) || a.order - b.order,
  );
}

function sortIssuedItems<T extends { issuedDate: string; order: number }>(
  items: T[],
) {
  return [...items].sort(
    (a, b) =>
      dateSortValue(b.issuedDate) - dateSortValue(a.issuedDate) ||
      a.order - b.order,
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
  order,
  priority,
  sectionRef,
  title,
}: {
  children: React.ReactNode;
  count?: number;
  id: SidebarSectionId;
  isOpen: boolean;
  onToggle: () => void;
  order?: number;
  priority?: SectionPriority;
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
      style={typeof order === "number" ? { order } : undefined}
    >
      <FormSectionHeader
        bodyId={bodyId}
        count={count}
        id={headingId}
        isOpen={isOpen}
        onToggle={onToggle}
        priority={priority}
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
  priority,
  title,
}: {
  bodyId: string;
  count?: number;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  priority?: SectionPriority;
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
          <span className="form-section-meta">
            {priority ? (
              <span className="priority-chip" data-priority={priority}>
                {SECTION_PRIORITY_LABELS[priority]}
              </span>
            ) : null}
            {typeof count === "number" ? (
              <span className="form-section-count">{count}</span>
            ) : null}
          </span>
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

function CertificationDateFields({
  expiryDate,
  issuedDate,
  onExpiryDateChange,
  onIssuedDateChange,
}: {
  expiryDate?: string;
  issuedDate: string;
  onExpiryDateChange: (value: string | undefined) => void;
  onIssuedDateChange: (value: string) => void;
}) {
  const hasExpiry = typeof expiryDate === "string";

  return (
    <div className="date-range-fields">
      <MonthYearField
        label="Issued"
        onChange={onIssuedDateChange}
        value={issuedDate}
      />
      <MonthYearField
        disabled={!hasExpiry}
        label="Expiry"
        onChange={(value) => onExpiryDateChange(value)}
        value={expiryDate ?? currentMonthValue()}
      />
      <label className="checkbox-field">
        <input
          checked={!hasExpiry}
          onChange={(event) =>
            onExpiryDateChange(
              event.target.checked ? undefined : currentMonthValue(),
            )
          }
          type="checkbox"
        />
        No expiry
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
