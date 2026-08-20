import { describe, expect, it } from "vitest";
import fixture1Page from "../../../fixtures/fixture-1page.v2.json";
import fixture3Page from "../../../fixtures/fixture-3page.v2.json";
import {
  extractResumeBlocks,
  hasVisibleSectionContent,
  PAGE_BOXES,
  paginateBlocks,
  type MeasureBlock,
  type PageBox,
  type ResumeBlock,
  type ResumeDocument,
} from "./index";

const a4 = PAGE_BOXES.A4;

const measureFixtureBlock: MeasureBlock = (block, pageBox) => {
  const lineHeight = block.kind === "header" ? 18 : 14;
  const baseHeight = baseHeightByKind(block);
  const usableWidth = pageBox.width - 112;
  const charsPerLine = Math.max(24, Math.floor(usableWidth / 5.8));
  const lines = Math.max(1, Math.ceil(block.content.length / charsPerLine));

  return baseHeight + lines * lineHeight;
};

describe("resume pagination primitives", () => {
  it("extracts visible blocks in render order", () => {
    const blocks = extractResumeBlocks(fixture3Page as ResumeDocument);

    expect(blocks[0]?.id).toBe("header");
    expect(blocks.map((block) => block.id)).toContain("section:experience:item:x1:bullet:x1b1");
    expect(blocks.map((block) => block.content).join(" ")).not.toContain("SENTINEL");
    expect(blocks.map((block) => block.content).join(" ")).not.toContain(
      "If this text appears in any rendered output",
    );
  });

  it("skips visible sections that have no visible items", () => {
    const resume: ResumeDocument = {
      ...fixture1Page as ResumeDocument,
      content: {
        ...(fixture1Page as ResumeDocument).content,
        summary: { text: "" },
        education: { items: [] },
        experience: { items: [] },
        skills: { items: [] },
        hobbies: { items: [] },
        references: { mode: "omitted", items: [] },
      },
    };

    expect(hasVisibleSectionContent({ id: "hobbies", type: "hobbies", title: "Hobbies", items: [] })).toBe(false);
    expect(extractResumeBlocks(resume).map((block) => block.id)).toEqual(["header"]);
  });

  it("keeps the baseline fixture on one A4 page", () => {
    const blocks = extractResumeBlocks(fixture1Page as ResumeDocument);
    const result = paginateBlocks(blocks, a4, measureFixtureBlock);

    expect(result.pages).toHaveLength(1);
    expect(result.breakBlockIds).toEqual([]);
  });

  it("produces stable multi-page breaks for the hostile fixture", () => {
    const blocks = extractResumeBlocks(fixture3Page as ResumeDocument);
    const a4Result = paginateBlocks(blocks, a4, measureFixtureBlock);

    expect(a4Result.pages.length).toBe(3);
    expect(a4Result.breakBlockIds).toHaveLength(2);
  });

  it("keeps item titles with their first child block", () => {
    const blocks = extractResumeBlocks(fixture3Page as ResumeDocument);

    const result = paginateBlocks(blocks, a4, measureFixtureBlock);

    expect(findItemIntroOrphan(result.pages)).toBeNull();
  });

  it("lets density alter breaks without rendering", () => {
    const blocks = extractResumeBlocks(fixture3Page as ResumeDocument);
    const densityBreaks = ["compact", "normal", "relaxed"].map((density) => {
      const densityMeasure = (block: ResumeBlock, pageBox: PageBox) => {
        const multiplier = density === "compact" ? 0.72 : density === "relaxed" ? 1.34 : 1;
        return measureFixtureBlock(block, pageBox) * multiplier;
      };

      return paginateBlocks(blocks, a4, densityMeasure).breakBlockIds.join("|");
    });

    expect(new Set(densityBreaks).size).toBeGreaterThan(1);
  });

  it("reports blocks that cannot fit on any page", () => {
    const oversizedBlock: ResumeBlock = {
      id: "oversized",
      kind: "bullet",
      content: "x".repeat(10_000),
    };

    const result = paginateBlocks([oversizedBlock], a4, measureFixtureBlock);

    expect(result.overflowBlockIds).toEqual(["oversized"]);
  });
});

function baseHeightByKind(block: ResumeBlock) {
  switch (block.kind) {
    case "header":
      return 54;
    case "section-header":
      return 18;
    case "item":
      return 12;
    case "item-summary":
    case "item-detail":
      return 4;
    case "bullet":
      return 3;
  }
}

function findItemIntroOrphan(pages: Array<{ blocks: ResumeBlock[] }>) {
  for (let index = 0; index < pages.length - 1; index += 1) {
    const lastBlock = pages[index].blocks.at(-1);
    const firstNextBlock = pages[index + 1].blocks[0];

    if (
      lastBlock &&
      ["item", "item-summary", "item-detail"].includes(lastBlock.kind) &&
      firstNextBlock?.kind === "bullet" &&
      firstNextBlock?.itemId === lastBlock.itemId &&
      firstNextBlock.sectionId === lastBlock.sectionId
    ) {
      return { pageIndex: index, itemId: lastBlock.itemId, nextBlockId: firstNextBlock.id };
    }
  }

  return null;
}
