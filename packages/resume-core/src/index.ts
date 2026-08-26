import { SECTION_BLOCK_EXTRACTORS } from "./blocks/registry";
export { SECTION_BLOCK_EXTRACTORS, SECTION_TYPES, type SectionBlockExtractor, type SectionType } from "./blocks/registry";
export {
  bulletsToText,
  normaliseBulletLine,
  reconcileLines,
  splitBulletLines,
} from "./form/reconcile-lines";
export { PAGE_BOXES, type PageBox } from "./pagination/page-boxes";
export {
  paginateBlocks,
  type MeasureBlock,
  type PaginatedPage,
  type PaginationResult,
} from "./pagination/paginate";

export type PageSize = "A4";
export type TemplateId = "meridian" | "slate";
export type ProfileType = "attachee" | "careerChanger" | "graduate" | "intern" | "professional";
export type LinkType = "email" | "phone" | "url" | "linkedin" | "github" | "custom";

export interface OrderedNode {
  id: string;
  order: number;
  visible: boolean;
}

export interface ResumeDocument {
  schemaVersion: 2;
  meta: {
    id: string;
    title: string;
    updatedAt: string;
    profileType: ProfileType;
    targetRole?: string;
  };
  design: {
    templateId: TemplateId;
    pageSize: PageSize;
    fontPairing: string;
    typeScale: "compact" | "normal" | "relaxed";
    density: "compact" | "normal" | "relaxed";
    margins: "tight" | "normal" | "wide";
    accent: string;
    dateFormat: string;
  };
  personal: {
    firstName: string;
    lastName: string;
    headline?: string;
    dateOfBirth?: string;
    location?: string;
    email: string;
    phone: string;
    links: Array<{
      id: string;
      type: Exclude<LinkType, "email" | "phone">;
      label?: string;
      value: string;
    }>;
    photo: null | {
      assetId: string;
      cropRect: { x: number; y: number; w: number; h: number };
      shape: "circle" | "square";
    };
  };
  content: ResumeContent;
}

export interface ResumeContent {
  summary: { text: string };
  education: { items: EducationItem[] };
  experience: { items: ExperienceItem[] };
  languages: { items: LanguageItem[] };
  skills: { items: SkillsItem[] };
  hobbies: { items: HobbyItem[] };
  references: {
    mode: "omitted" | "onRequest" | "listed";
    items: ReferenceItem[];
  };
}

export type RenderableResumeSection =
  | SummarySection
  | ExperienceSection
  | EducationSection
  | LanguagesSection
  | SkillsSection
  | HobbiesSection
  | ReferencesSection;

export interface BaseSection<TType extends string, TItem extends ResumeItem> {
  id: TType;
  type: TType;
  title: string;
  items: TItem[];
}

export interface ResumeItem {
  id: string;
  order: number;
}

export interface Bullet {
  id: string;
  order: number;
  text: string;
}

export type SummaryItem = ResumeItem & { text: string };
export type ExperienceItem = ResumeItem & {
  role: string;
  organization: string;
  organizationLogo?: {
    assetId: string;
  } | null;
  location?: string;
  startDate: string;
  endDate: string;
  summary?: string | null;
  bullets: Bullet[];
};
export type EducationItem = ResumeItem & {
  degree: string;
  institution: string;
  institutionLogo?: {
    assetId: string;
  } | null;
  location?: string;
  startDate: string;
  endDate: string;
  detail?: string;
  bullets: Bullet[];
};
export type SkillsItem = ResumeItem & {
  groupLabel: string;
  entries: string[];
};
export type LanguageLevel = 1 | 2 | 3 | 4 | 5;
export type LanguageItem = ResumeItem & {
  language: string;
  level: LanguageLevel;
};
export type HobbyItem = ResumeItem & { text: string };
export type ReferenceItem = ResumeItem & {
  name: string;
  role: string;
  organization: string;
  email?: string;
  phone?: string;
};

export type SummarySection = BaseSection<"summary", SummaryItem>;
export type ExperienceSection = BaseSection<"experience", ExperienceItem>;
export type EducationSection = BaseSection<"education", EducationItem>;
export type LanguagesSection = BaseSection<"languages", LanguageItem>;
export type SkillsSection = BaseSection<"skills", SkillsItem>;
export type HobbiesSection = BaseSection<"hobbies", HobbyItem>;
export type ReferencesSection = BaseSection<"references", ReferenceItem & { requestText?: string }>;

export type ResumeSection = RenderableResumeSection;

export interface LegacyResumeDocumentV1 {
  schemaVersion: 1;
  meta: Omit<ResumeDocument["meta"], "profileType"> & { profileType: string };
  design: Omit<ResumeDocument["design"], "templateId"> & { templateId: string };
  header: {
    fullName: string;
    headline?: string;
    location?: string;
    photo: ResumeDocument["personal"]["photo"];
    contacts: Array<{
      id: string;
      type: LinkType;
      label?: string;
      value: string;
      order: number;
    }>;
  };
  sections: Array<{
    id: string;
    type: string;
    title: string;
    order: number;
    visible: boolean;
    items: Array<ResumeItem & Record<string, unknown> & { visible?: boolean }>;
  }>;
}

export const byOrder = <T extends { order: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.order - b.order);

export type ResumeBlockKind =
  | "header"
  | "section-header"
  | "item"
  | "item-summary"
  | "item-detail"
  | "bullet";

export interface ResumeBlock {
  id: string;
  kind: ResumeBlockKind;
  content: string;
  sectionId?: string;
  itemId?: string;
  bulletId?: string;
  keepWithNext?: boolean;
  avoidBreakBefore?: boolean;
}

export function hasVisibleSectionContent(section: ResumeSection): boolean {
  return section.items.length > 0;
}

export function getRenderableSections(resume: ResumeDocument): ResumeSection[] {
  const order = getSectionOrder(resume);
  const sectionsByType: Record<ResumeSection["type"], ResumeSection> = {
    summary: getSummarySection(resume),
    experience: getExperienceSection(resume),
    education: getEducationSection(resume),
    languages: getLanguagesSection(resume),
    skills: getSkillsSection(resume),
    hobbies: getHobbiesSection(resume),
    references: getReferencesSection(resume),
  };

  return order.map((type) => sectionsByType[type]).filter(hasVisibleSectionContent);
}

function getSectionOrder(resume: ResumeDocument): Array<ResumeSection["type"]> {
  if (["attachee", "graduate", "intern"].includes(resume.meta.profileType)) {
    return ["summary", "education", "experience", "skills", "languages", "hobbies", "references"];
  }

  if (resume.meta.profileType === "careerChanger") {
    return ["summary", "skills", "experience", "education", "languages", "hobbies", "references"];
  }

  switch (resume.design.templateId) {
    case "meridian":
    case "slate":
      return ["summary", "experience", "education", "skills", "languages", "hobbies", "references"];
  }
}

export function getTemplateSectionOrder(resume: ResumeDocument): Array<ResumeSection["type"]> {
  return getSectionOrder(resume);
}

export function extractResumeBlocks(resume: ResumeDocument): ResumeBlock[] {
  const blocks: ResumeBlock[] = [{
    id: "header",
    kind: "header",
    content: [
      resume.personal.firstName,
      resume.personal.lastName,
      resume.personal.headline,
      resume.personal.location,
      resume.personal.email,
      resume.personal.phone,
      ...resume.personal.links.map((link) => `${link.label ? `${link.label}: ` : ""}${link.value}`),
    ].filter(Boolean).join(" "),
  }];

  for (const section of getRenderableSections(resume)) {
    blocks.push(...SECTION_BLOCK_EXTRACTORS[section.type](section));
  }

  return blocks;
}

export function migrateResumeDocument(document: ResumeDocument | LegacyResumeDocumentV1): ResumeDocument {
  if (document.schemaVersion === 2) {
    return normalizeResumeDocument(document);
  }

  return normalizeResumeDocument(migrateV1ToV2(document));
}

export function normalizeResumeDocument(document: ResumeDocument): ResumeDocument {
  return {
    ...document,
    meta: {
      ...document.meta,
      profileType: normalizeProfileType(document.meta.profileType),
      targetRole: normalizeOptionalString(document.meta.targetRole),
    },
    design: {
      ...document.design,
      pageSize: "A4",
      templateId: normalizeTemplateId(document.design.templateId),
    },
    content: {
      ...document.content,
      languages: document.content.languages ?? { items: [] },
    },
  };
}

function normalizeTemplateId(templateId: string): TemplateId {
  return templateId === "meridian" ? "meridian" : "slate";
}

function normalizeProfileType(profileType: string): ProfileType {
  switch (profileType) {
    case "attachee":
    case "careerChanger":
    case "graduate":
    case "intern":
    case "professional":
      return profileType;
    case "changer":
      return "careerChanger";
    case "earlyCareer":
    case "general":
      return "graduate";
    case "experienced":
    default:
      return "professional";
  }
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getSummarySection(resume: ResumeDocument): SummarySection {
  return {
    id: "summary",
    type: "summary",
    title: getSummaryTitle(resume.meta.profileType),
    items: resume.content.summary.text.trim()
      ? [{ id: "summary", order: 0, text: resume.content.summary.text }]
      : [],
  };
}

function getSummaryTitle(profileType: ProfileType) {
  return ["attachee", "graduate", "intern"].includes(profileType)
    ? "Career Objective"
    : "Professional Summary";
}

function getEducationSection(resume: ResumeDocument): EducationSection {
  return {
    id: "education",
    type: "education",
    title: "Education",
    items: sortDatedItems(resume.content.education.items),
  };
}

function getExperienceSection(resume: ResumeDocument): ExperienceSection {
  return {
    id: "experience",
    type: "experience",
    title: "Experience",
    items: sortDatedItems(resume.content.experience.items),
  };
}

function getSkillsSection(resume: ResumeDocument): SkillsSection {
  return {
    id: "skills",
    type: "skills",
    title: "Skills",
    items: byOrder(resume.content.skills.items),
  };
}

function getLanguagesSection(resume: ResumeDocument): LanguagesSection {
  return {
    id: "languages",
    type: "languages",
    title: "Languages",
    items: byOrder(resume.content.languages.items),
  };
}

function getHobbiesSection(resume: ResumeDocument): HobbiesSection {
  return {
    id: "hobbies",
    type: "hobbies",
    title: "Hobbies",
    items: byOrder(resume.content.hobbies.items),
  };
}

function getReferencesSection(resume: ResumeDocument): ReferencesSection {
  if (resume.content.references.mode === "omitted") {
    return { id: "references", type: "references", title: "References", items: [] };
  }

  if (resume.content.references.mode === "onRequest") {
    return {
      id: "references",
      type: "references",
      title: "References",
      items: [{ id: "references-on-request", order: 0, name: "", role: "", organization: "", requestText: "References available upon request." }],
    };
  }

  return {
    id: "references",
    type: "references",
    title: "References",
    items: byOrder(resume.content.references.items),
  };
}

function sortDatedItems<T extends ResumeItem & { endDate: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dateCompare = dateSortValue(b.endDate) - dateSortValue(a.endDate);
    return dateCompare || a.order - b.order;
  });
}

function dateSortValue(value: string) {
  return value.toLowerCase() === "present" ? Number.MAX_SAFE_INTEGER : Date.parse(`${value}-01`) || 0;
}

function migrateV1ToV2(document: LegacyResumeDocumentV1): ResumeDocument {
  const contacts = byOrder(document.header.contacts);
  const fullNameParts = document.header.fullName.trim().split(/\s+/);
  const email = contacts.find((contact) => contact.type === "email")?.value ?? "";
  const phone = contacts.find((contact) => contact.type === "phone")?.value ?? "";
  const firstName = fullNameParts.shift() ?? "";
  const lastName = fullNameParts.join(" ");

  return {
    schemaVersion: 2,
    meta: {
      ...document.meta,
      profileType: normalizeProfileType(document.meta.profileType),
      targetRole: normalizeOptionalString(document.meta.targetRole),
    },
    design: {
      ...document.design,
      templateId: normalizeTemplateId(document.design.templateId),
    },
    personal: {
      firstName,
      lastName,
      headline: document.header.headline,
      location: document.header.location,
      email,
      phone,
      links: contacts
        .filter((contact) => contact.type !== "email" && contact.type !== "phone")
        .map(({ id, type, label, value }) => ({ id, type: type as Exclude<LinkType, "email" | "phone">, label, value })),
      photo: document.header.photo,
    },
    content: {
      summary: { text: firstVisibleSectionItem(document, "summary")?.text as string ?? "" },
      education: { items: sectionItems<EducationItem>(document, "education") },
      experience: { items: sectionItems<ExperienceItem>(document, "experience") },
      languages: { items: [] },
      skills: { items: sectionItems<SkillsItem>(document, "skills") },
      hobbies: { items: customTextItems(document).map((item) => ({ id: item.id, order: item.order, text: item.text })) },
      references: { mode: "omitted", items: [] },
    },
  };
}

function sectionItems<T extends ResumeItem>(document: LegacyResumeDocumentV1, type: string): T[] {
  return sectionsOfType(document, type)
    .flatMap((section) => section.items)
    .filter((item) => item.visible !== false)
    .map(({ visible: _visible, ...item }) => item as unknown as T);
}

function firstVisibleSectionItem(document: LegacyResumeDocumentV1, type: string) {
  return sectionsOfType(document, type)
    .flatMap((section) => section.items)
    .find((item) => item.visible !== false);
}

function customTextItems(document: LegacyResumeDocumentV1): HobbyItem[] {
  return sectionsOfType(document, "custom")
    .flatMap((section) => section.items)
    .filter((item) => item.visible !== false && typeof item.text === "string" && item.text.trim())
    .map((item) => ({ id: item.id, order: item.order, text: item.text as string }));
}

function sectionsOfType(document: LegacyResumeDocumentV1, type: string) {
  return byOrder(document.sections)
    .filter((section) => section.visible !== false && section.type === type);
}

export const sampleResume: ResumeDocument = {
  schemaVersion: 2,
  meta: {
    id: "sample",
    title: "Sample Resume",
    updatedAt: "2026-08-20T08:00:00.000Z",
    profileType: "professional",
    targetRole: "Senior Product Manager",
  },
  design: {
    templateId: "slate",
    pageSize: "A4",
    fontPairing: "contrast",
    typeScale: "normal",
    density: "normal",
    margins: "normal",
    accent: "slate",
    dateFormat: "MMM yyyy",
  },
  personal: {
    firstName: "Amara",
    lastName: "Chikafu",
    headline: "Senior Product Manager",
    location: "Harare, Zimbabwe",
    email: "amara.chikafu@example.com",
    phone: "+263 77 000 0000",
    links: [],
    photo: null,
  },
  content: {
    summary: { text: "Product manager with eight years building payments and lending products for emerging markets." },
    education: { items: [] },
    experience: { items: [] },
    languages: { items: [] },
    skills: { items: [] },
    hobbies: { items: [] },
    references: { mode: "omitted", items: [] },
  },
};
