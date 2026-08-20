export type PageSize = "A4" | "Letter";
export type TemplateId = "atlas" | "meridian";
export type ProfileType = "general" | "earlyCareer" | "experienced" | "changer";

export interface OrderedNode {
  id: string;
  order: number;
  visible: boolean;
}

export interface ResumeDocument {
  schemaVersion: 1;
  meta: {
    id: string;
    title: string;
    updatedAt: string;
    profileType: ProfileType;
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
  header: {
    fullName: string;
    headline?: string;
    location?: string;
    photo: null | {
      assetId: string;
      cropRect: { x: number; y: number; w: number; h: number };
      shape: "circle" | "square";
    };
    contacts: Array<{
      id: string;
      type: "email" | "phone" | "url" | "linkedin" | "github" | "custom";
      label?: string;
      value: string;
      order: number;
    }>;
  };
  sections: ResumeSection[];
}

export type ResumeSection =
  | SummarySection
  | ExperienceSection
  | EducationSection
  | SkillsSection
  | ProjectsSection
  | CertificationsSection
  | AwardsSection
  | PublicationsSection
  | VolunteerSection
  | CustomSection;

export interface BaseSection<TType extends string, TItem extends OrderedNode> extends OrderedNode {
  type: TType;
  title: string;
  items: TItem[];
}

export interface Bullet {
  id: string;
  order: number;
  text: string;
}

export type SummarySection = BaseSection<"summary", OrderedNode & { text: string }>;
export type ExperienceSection = BaseSection<"experience", OrderedNode & {
  role: string;
  organization: string;
  location?: string;
  startDate: string;
  endDate: string;
  summary?: string | null;
  bullets: Bullet[];
}>;
export type EducationSection = BaseSection<"education", OrderedNode & {
  degree: string;
  institution: string;
  location?: string;
  startDate: string;
  endDate: string;
  detail?: string;
  bullets: Bullet[];
}>;
export type SkillsSection = BaseSection<"skills", OrderedNode & {
  groupLabel: string;
  entries: string[];
}>;
export type ProjectsSection = BaseSection<"projects", OrderedNode & {
  name: string;
  role?: string;
  url?: string | null;
  startDate?: string;
  endDate?: string;
  summary?: string | null;
  bullets: Bullet[];
}>;
export type CertificationsSection = BaseSection<"certifications", OrderedNode & {
  name: string;
  issuer: string;
  date: string;
  credentialId?: string | null;
}>;
export type AwardsSection = BaseSection<"awards", OrderedNode & {
  name: string;
  issuer: string;
  date: string;
  detail?: string;
}>;
export type PublicationsSection = BaseSection<"publications", OrderedNode & {
  title: string;
  venue: string;
  date: string;
  url?: string | null;
}>;
export type VolunteerSection = BaseSection<"volunteer", OrderedNode & {
  role: string;
  organization: string;
  location?: string;
  startDate: string;
  endDate: string;
  bullets: Bullet[];
}>;
export type CustomSection = BaseSection<"custom", OrderedNode & {
  title?: string | null;
  text?: string;
  bullets: Bullet[];
}>;

export const byOrder = <T extends { order: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.order - b.order);

export interface PageBox {
  width: number;
  height: number;
}

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

export interface PaginatedPage {
  index: number;
  blocks: ResumeBlock[];
  firstBlockId: string | null;
  usedHeight: number;
}

export interface PaginationResult {
  pages: PaginatedPage[];
  breakBlockIds: string[];
}

export type MeasureBlock = (block: ResumeBlock, pageBox: PageBox) => number;
type BlockItem = OrderedNode & Record<string, unknown>;

export function extractResumeBlocks(resume: ResumeDocument): ResumeBlock[] {
  const blocks: ResumeBlock[] = [{
    id: "header",
    kind: "header",
    content: [
      resume.header.fullName,
      resume.header.headline,
      resume.header.location,
      ...byOrder(resume.header.contacts).map((contact) =>
        `${contact.label ? `${contact.label}: ` : ""}${contact.value}`),
    ].filter(Boolean).join(" "),
  }];

  for (const section of byOrder(resume.sections).filter((candidate) => candidate.visible)) {
    const visibleItems = [...section.items]
      .sort((a, b) => a.order - b.order)
      .filter((item) => item.visible) as unknown as BlockItem[];

    if (visibleItems.length === 0) {
      continue;
    }

    blocks.push({
      id: `section:${section.id}:header`,
      kind: "section-header",
      content: section.title,
      sectionId: section.id,
      keepWithNext: true,
    });

    for (const item of visibleItems) {
      blocks.push({
        id: `section:${section.id}:item:${item.id}`,
        kind: "item",
        content: getItemPrimaryText(section, item),
        sectionId: section.id,
        itemId: item.id,
        avoidBreakBefore: true,
      });

      if (typeof item.summary === "string" && item.summary.length > 0) {
        blocks.push({
          id: `section:${section.id}:item:${item.id}:summary`,
          kind: "item-summary",
          content: item.summary,
          sectionId: section.id,
          itemId: item.id,
        });
      }

      if (typeof item.detail === "string" && item.detail.length > 0) {
        blocks.push({
          id: `section:${section.id}:item:${item.id}:detail`,
          kind: "item-detail",
          content: item.detail,
          sectionId: section.id,
          itemId: item.id,
        });
      }

      if (typeof item.credentialId === "string" && item.credentialId.length > 0) {
        blocks.push({
          id: `section:${section.id}:item:${item.id}:credential`,
          kind: "item-detail",
          content: `Credential: ${item.credentialId}`,
          sectionId: section.id,
          itemId: item.id,
        });
      }

      if (
        section.type === "custom" &&
        typeof item.title === "string" &&
        typeof item.text === "string" &&
        item.text.length > 0
      ) {
        blocks.push({
          id: `section:${section.id}:item:${item.id}:text`,
          kind: "item-detail",
          content: item.text,
          sectionId: section.id,
          itemId: item.id,
        });
      }

      if (Array.isArray(item.bullets)) {
        for (const bullet of byOrder(item.bullets as Bullet[])) {
          blocks.push({
            id: `section:${section.id}:item:${item.id}:bullet:${bullet.id}`,
            kind: "bullet",
            content: bullet.text,
            sectionId: section.id,
            itemId: item.id,
            bulletId: bullet.id,
          });
        }
      }
    }
  }

  return blocks;
}

function getItemPrimaryText(section: ResumeSection, item: BlockItem) {
  switch (section.type) {
    case "summary":
      return stringValue(item.text);
    case "experience":
    case "volunteer":
      return [
        stringValue(item.role),
        stringValue(item.organization),
        stringValue(item.location),
        formatDateRangeForBlock(stringValue(item.startDate), stringValue(item.endDate)),
      ].filter(Boolean).join(", ");
    case "education":
      return [
        stringValue(item.degree),
        stringValue(item.institution),
        stringValue(item.location),
        formatDateRangeForBlock(stringValue(item.startDate), stringValue(item.endDate)),
      ].filter(Boolean).join(", ");
    case "skills":
      return `${stringValue(item.groupLabel)}: ${stringArrayValue(item.entries).join(", ")}`;
    case "projects":
      return [
        stringValue(item.name),
        stringValue(item.role),
        stringValue(item.url),
        formatDateRangeForBlock(stringValue(item.startDate), stringValue(item.endDate)),
      ].filter(Boolean).join(", ");
    case "certifications":
      return [stringValue(item.name), stringValue(item.issuer), stringValue(item.date)].filter(Boolean).join(", ");
    case "awards":
      return [stringValue(item.name), stringValue(item.issuer), stringValue(item.date)].filter(Boolean).join(", ");
    case "publications":
      return [
        stringValue(item.title),
        stringValue(item.venue),
        stringValue(item.url),
        stringValue(item.date),
      ].filter(Boolean).join(", ");
    case "custom":
      return stringValue(item.title) || stringValue(item.text);
  }
}

function formatDateRangeForBlock(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return "";
  }

  return `${startDate ?? ""} - ${endDate ?? ""}`;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function paginateBlocks(
  blocks: ResumeBlock[],
  pageBox: PageBox,
  measureBlock: MeasureBlock,
): PaginationResult {
  const pages: PaginatedPage[] = [];
  let currentBlocks: ResumeBlock[] = [];
  let usedHeight = 0;

  const pushPage = () => {
    pages.push({
      index: pages.length,
      blocks: currentBlocks,
      firstBlockId: currentBlocks[0]?.id ?? null,
      usedHeight,
    });
    currentBlocks = [];
    usedHeight = 0;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const nextBlock = blocks[index + 1];
    const blockHeight = measureBlock(block, pageBox);
    const keepPairHeight = block.keepWithNext && nextBlock
      ? blockHeight + measureBlock(nextBlock, pageBox)
      : blockHeight;

    if (currentBlocks.length > 0 && usedHeight + keepPairHeight > pageBox.height) {
      pushPage();
    }

    currentBlocks.push(block);
    usedHeight += blockHeight;
  }

  if (currentBlocks.length > 0 || pages.length === 0) {
    pushPage();
  }

  return {
    pages,
    breakBlockIds: pages.slice(1).map((page) => page.firstBlockId).filter((id): id is string => Boolean(id)),
  };
}

export const sampleResume: ResumeDocument = {
  schemaVersion: 1,
  meta: {
    id: "sample",
    title: "Sample Resume",
    updatedAt: new Date().toISOString(),
    profileType: "experienced",
  },
  design: {
    templateId: "atlas",
    pageSize: "A4",
    fontPairing: "source",
    typeScale: "normal",
    density: "normal",
    margins: "normal",
    accent: "slate",
    dateFormat: "MMM yyyy",
  },
  header: {
    fullName: "Amara Chikafu",
    headline: "Senior Product Manager",
    location: "Harare, Zimbabwe",
    photo: null,
    contacts: [
      { id: "c1", type: "email", value: "amara.chikafu@example.com", order: 0 },
      { id: "c2", type: "phone", value: "+263 77 000 0000", order: 1 },
    ],
  },
  sections: [
    {
      id: "s1",
      type: "summary",
      title: "Summary",
      order: 0,
      visible: true,
      items: [
        {
          id: "i1",
          order: 0,
          visible: true,
          text: "Product manager with eight years building payments and lending products for emerging markets.",
        },
      ],
    },
  ],
};
