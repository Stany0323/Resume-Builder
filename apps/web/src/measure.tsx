import React from "react";
import { createRoot } from "react-dom/client";
import { extractResumeBlocks, PAGE_BOXES, paginateBlocks, type PageSize, type ResumeDocument } from "@resume-builder/core";
import { ResumePreview } from "@resume-builder/render";
import "./styles.css";

declare global {
  interface Window {
    __resumeMeasure?: {
      measure: (resume: ResumeDocument) => Promise<MeasuredResume>;
    };
  }
}

export interface MeasuredBlock {
  id: string;
  height: number;
}

export interface MeasuredResume {
  pageSize: PageSize;
  blocks: MeasuredBlock[];
  pages: Array<{
    index: number;
    firstBlockId: string | null;
    usedHeight: number;
  }>;
  pageBox: {
    width: number;
    height: number;
  };
  totalBlockHeight: number;
  breakBlockIds: string[];
  overflowBlockIds: string[];
  fontHash: string;
}

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

window.__resumeMeasure = {
  async measure(resume) {
    root.render(
      <React.StrictMode>
        <div className="measure-stage">
          <ResumePreview resume={resume} />
        </div>
      </React.StrictMode>,
    );

    await document.fonts.ready;
    await nextFrame();

    const measuredBlocks = measureBlocks();
    const heights = new Map(measuredBlocks.map((block) => [block.id, block.height]));
    const pageBox = PAGE_BOXES[resume.design.pageSize];
    const pagination = paginateBlocks(
      extractResumeBlocks(resume),
      pageBox,
      (block) => heights.get(block.id) ?? 0,
    );

    return {
      pageSize: resume.design.pageSize,
      blocks: measuredBlocks,
      pages: pagination.pages.map((page) => ({
        index: page.index,
        firstBlockId: page.firstBlockId,
        usedHeight: page.usedHeight,
      })),
      pageBox,
      totalBlockHeight: measuredBlocks.reduce((sum, block) => sum + block.height, 0),
      breakBlockIds: pagination.breakBlockIds,
      overflowBlockIds: pagination.overflowBlockIds,
      fontHash: getFontHash(),
    };
  },
};

function measureBlocks(): MeasuredBlock[] {
  return [...document.querySelectorAll<HTMLElement>("[data-block-id]")]
    .map((element) => ({
      id: element.dataset.blockId ?? "",
      height: element.getBoundingClientRect().height,
    }))
    .filter((block) => block.id);
}

function getFontHash() {
  const page = document.querySelector<HTMLElement>(".resume-page");
  const style = page ? getComputedStyle(page) : document.body.style;

  return [
    style.fontFamily,
    style.fontSize,
    style.lineHeight,
    style.fontWeight,
    document.fonts.size,
  ].join("|");
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
