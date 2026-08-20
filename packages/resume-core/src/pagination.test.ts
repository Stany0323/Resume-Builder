import { describe, expect, it } from "vitest";
import fixture1Page from "../../../fixtures/fixture-1page.json";
import fixture3Page from "../../../fixtures/fixture-3page.json";
import {
  extractResumeBlocks,
  paginateBlocks,
  type MeasureBlock,
  type PageBox,
  type ResumeBlock,
  type ResumeDocument,
} from "./index";

const a4: PageBox = { width: 595, height: 842 };
const letter: PageBox = { width: 612, height: 792 };

const measureFixtureBlock: MeasureBlock = (block, pageBox) => {
  const lineHeight = block.kind === "header" ? 18 : 14;
  const baseHeight = baseHeightByKind(block);
  const usableWidth = pageBox.width - 112;
  const charsPerLine = Math.max(24, Math.floor(usableWidth / 6.1));
  const lines = Math.max(1, Math.ceil(block.content.length / charsPerLine));

  return baseHeight + lines * lineHeight;
};

describe("resume pagination primitives", () => {
  it("extracts visible blocks in render order", () => {
    const blocks = extractResumeBlocks(fixture3Page as ResumeDocument);

    expect(blocks[0]?.id).toBe("header");
    expect(blocks.map((block) => block.id)).toContain("section:s2:item:i2:bullet:b1");
    expect(blocks.map((block) => block.id)).not.toContain("section:s11:item:i22");
    expect(blocks.map((block) => block.content).join(" ")).not.toContain(
      "If this text appears in any rendered output",
    );
  });

  it("keeps the baseline fixture on one A4 and Letter page", () => {
    for (const pageBox of [a4, letter]) {
      const blocks = extractResumeBlocks({ ...(fixture1Page as ResumeDocument), design: {
        ...(fixture1Page as ResumeDocument).design,
        pageSize: pageBox === a4 ? "A4" : "Letter",
      } });
      const result = paginateBlocks(blocks, pageBox, measureFixtureBlock);

      expect(result.pages).toHaveLength(1);
      expect(result.breakBlockIds).toEqual([]);
    }
  });

  it("produces width-sensitive breaks for the hostile fixture", () => {
    const blocks = extractResumeBlocks(fixture3Page as ResumeDocument);
    const a4Result = paginateBlocks(blocks, a4, measureFixtureBlock);
    const letterResult = paginateBlocks(blocks, letter, measureFixtureBlock);

    expect(a4Result.pages.length).toBeGreaterThan(1);
    expect(letterResult.pages.length).toBeGreaterThan(1);
    expect(a4Result.breakBlockIds).not.toEqual(letterResult.breakBlockIds);
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
