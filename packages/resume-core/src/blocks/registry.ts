import type { Bullet, ResumeBlock, ResumeItem, ResumeSection } from "../index";

type BlockItem = ResumeItem & Record<string, unknown>;
export type SectionBlockExtractor<TSection extends ResumeSection = ResumeSection> = (section: TSection) => ResumeBlock[];
export type SectionType = ResumeSection["type"];

export const SECTION_TYPES = [
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "hobbies",
  "references",
] as const satisfies readonly SectionType[];

export const SECTION_BLOCK_EXTRACTORS: Record<SectionType, SectionBlockExtractor> = {
  summary: extractSectionBlocks,
  experience: extractSectionBlocks,
  education: extractSectionBlocks,
  skills: extractSectionBlocks,
  languages: extractSectionBlocks,
  hobbies: extractSectionBlocks,
  references: extractSectionBlocks,
};

function extractSectionBlocks(section: ResumeSection): ResumeBlock[] {
  const blocks: ResumeBlock[] = [{
    id: `section:${section.id}:header`,
    kind: "section-header",
    content: section.title,
    sectionId: section.id,
    keepWithNext: true,
  }];

  for (const item of visibleItems(section)) {
    blocks.push({
      id: `section:${section.id}:item:${item.id}`,
      kind: "item",
      content: getItemPrimaryText(section, item),
      sectionId: section.id,
      itemId: item.id,
      avoidBreakBefore: true,
    });

    blocks.push(...getOptionalItemBlocks(section, item));
    blocks.push(...getBulletBlocks(section, item));
  }

  return blocks;
}

function visibleItems(section: ResumeSection) {
  return [...section.items]
    .sort((a, b) => a.order - b.order) as unknown as BlockItem[];
}

function getOptionalItemBlocks(section: ResumeSection, item: BlockItem): ResumeBlock[] {
  const blocks: ResumeBlock[] = [];

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

  return blocks;
}

function getBulletBlocks(section: ResumeSection, item: BlockItem): ResumeBlock[] {
  if (!Array.isArray(item.bullets)) {
    return [];
  }

  return [...item.bullets as Bullet[]]
    .sort((a, b) => a.order - b.order)
    .map((bullet) => ({
      id: `section:${section.id}:item:${item.id}:bullet:${bullet.id}`,
      kind: "bullet",
      content: bullet.text,
      sectionId: section.id,
      itemId: item.id,
      bulletId: bullet.id,
    }));
}

function getItemPrimaryText(section: ResumeSection, item: BlockItem) {
  switch (section.type) {
    case "summary":
      return stringValue(item.text);
    case "experience":
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
    case "languages":
      return [
        stringValue(item.language),
        typeof item.level === "number" ? `level ${item.level} of 5` : "",
      ].filter(Boolean).join(", ");
    case "hobbies":
      return stringValue(item.text);
    case "references":
      return stringValue(item.requestText) || [
        stringValue(item.name),
        stringValue(item.role),
        stringValue(item.organization),
        stringValue(item.email),
        stringValue(item.phone),
      ].filter(Boolean).join(", ");
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
