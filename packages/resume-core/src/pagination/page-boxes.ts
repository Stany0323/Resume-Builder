import type { PageSize } from "../index";

export interface PageBox {
  width: number;
  height: number;
}

export const PAGE_BOXES: Record<PageSize, PageBox> = {
  A4: { width: 595, height: 842 },
};
