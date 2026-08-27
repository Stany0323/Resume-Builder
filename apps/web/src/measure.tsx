import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { extractResumeBlocks, PAGE_BOXES, paginateBlocks, type PageSize, type ResumeDocument } from "@resume-builder/core";
import { ResumePreview } from "@resume-builder/render";
import "./styles.css";
import "./templates.css";

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
    flushSync(() => {
      root.render(
        <React.StrictMode>
          <div className="measure-stage">
            <ResumePreview resume={resume} />
          </div>
        </React.StrictMode>,
      );
    });

    await document.fonts.ready;
    await nextFrame();

    const measuredBlocks = measureBlocks();
    const heights = new Map(measuredBlocks.map((block) => [block.id, block.height]));
    const pageBox = PAGE_BOXES.A4;
    const pagination = paginateBlocks(
      extractResumeBlocks(resume),
      pageBox,
      (block) => heights.get(block.id) ?? 0,
    );

    return {
      pageSize: "A4",
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
  const page = document.querySelector<HTMLElement>(".resume-page");
  const pageStyle = page ? getComputedStyle(page) : null;
  let cursorBottom = page
    ? page.getBoundingClientRect().top + numberValue(pageStyle?.paddingTop ?? "0")
    : 0;

  return [...document.querySelectorAll<HTMLElement>("[data-block-id]")]
    .map((element) => ({
      id: element.dataset.blockId ?? "",
      height: measureBlockAdvance(element, (bottom) => {
        const height = Math.max(0, bottom - cursorBottom);
        cursorBottom = Math.max(cursorBottom, bottom);
        return height;
      }),
    }))
    .filter((block) => block.id);
}

function measureBlockAdvance(
  element: HTMLElement,
  commit: (bottom: number) => number,
) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return commit(rect.bottom + numberValue(style.marginBottom));
}

function numberValue(value: string) {
  return Number.parseFloat(value) || 0;
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
