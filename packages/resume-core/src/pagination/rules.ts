import type { ResumeBlock } from "../index";
import type { PageBox } from "./page-boxes";
import type { MeasureBlock } from "./paginate";

export function getMinimumKeepRunHeight(
  blocks: ResumeBlock[],
  startIndex: number,
  pageBox: PageBox,
  measureBlock: MeasureBlock,
) {
  const block = blocks[startIndex];
  let height = measureBlock(block, pageBox);

  if (block.kind === "section-header") {
    const nextItemIndex = startIndex + 1;
    const nextItem = blocks[nextItemIndex];

    if (nextItem?.kind === "item" && nextItem.sectionId === block.sectionId) {
      height += measureBlock(nextItem, pageBox);
      height += getFirstItemChildHeight(blocks, nextItemIndex, pageBox, measureBlock);
    }

    return height;
  }

  if (block.avoidBreakBefore || block.kind === "item") {
    height += getFirstItemChildHeight(blocks, startIndex, pageBox, measureBlock);
  }

  return height;
}

function getFirstItemChildHeight(
  blocks: ResumeBlock[],
  itemIndex: number,
  pageBox: PageBox,
  measureBlock: MeasureBlock,
) {
  const item = blocks[itemIndex];
  const child = blocks[itemIndex + 1];

  if (!item.itemId || child?.itemId !== item.itemId || child.sectionId !== item.sectionId) {
    return 0;
  }

  return measureBlock(child, pageBox);
}
