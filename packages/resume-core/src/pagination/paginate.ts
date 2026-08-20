import type { ResumeBlock } from "../index";
import type { PageBox } from "./page-boxes";
import { getMinimumKeepRunHeight } from "./rules";

export interface PaginatedPage {
  index: number;
  blocks: ResumeBlock[];
  firstBlockId: string | null;
  usedHeight: number;
}

export interface PaginationResult {
  pages: PaginatedPage[];
  breakBlockIds: string[];
  overflowBlockIds: string[];
}

export type MeasureBlock = (block: ResumeBlock, pageBox: PageBox) => number;

export function paginateBlocks(
  blocks: ResumeBlock[],
  pageBox: PageBox,
  measureBlock: MeasureBlock,
): PaginationResult {
  const pages: PaginatedPage[] = [];
  const overflowBlockIds: string[] = [];
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
    const blockHeight = measureBlock(block, pageBox);
    const keepRunHeight = getMinimumKeepRunHeight(blocks, index, pageBox, measureBlock);

    if (blockHeight > pageBox.height) {
      overflowBlockIds.push(block.id);
    }

    if (currentBlocks.length > 0 && usedHeight + keepRunHeight > pageBox.height) {
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
    overflowBlockIds,
  };
}
