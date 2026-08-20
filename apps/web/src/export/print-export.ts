import type { ResumeDocument } from "@resume-builder/core";

/**
 * Interim download path: the browser's own print-to-PDF, driven by the exact
 * same `ResumePreview` components and CSS the editor renders.
 *
 * ANTI-FORK TRIPWIRE (plan §9.2). This path exists only because it costs
 * almost nothing on top of the shared render path. It must never grow into a
 * second renderer. The rule:
 *
 *   The only print-specific CSS permitted is page-box setup and hiding app
 *   chrome. If `@media print` ever starts restyling `.resume-*` — different
 *   spacing, different type, different break rules — we have forked, and this
 *   path gets deleted that day. Server PDF remains the source of truth.
 *
 * `@page size` cannot be set from a stylesheet variable, so it is injected per
 * call and removed afterwards.
 */

const STYLE_ID = "resume-print-page-box";

const A4_PAGE_SIZE = "210mm 297mm";

export function printResume(resume: ResumeDocument): void {
  const style = document.createElement("style");

  style.id = STYLE_ID;
  style.textContent = `@page { size: ${A4_PAGE_SIZE}; margin: 0; }`;

  document.getElementById(STYLE_ID)?.remove();
  document.head.append(style);
  document.body.dataset.printing = "true";

  const cleanup = () => {
    document.getElementById(STYLE_ID)?.remove();
    delete document.body.dataset.printing;
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);

  // Safari doesn't always fire afterprint; belt and braces.
  setTimeout(() => {
    if (document.body.dataset.printing === "true") {
      cleanup();
    }
  }, 60_000);

  window.print();
}

/**
 * Whether print-to-PDF is worth offering. Mobile browsers technically support
 * window.print() but the result is unreliable, and mobile is view/export-only
 * by design — so we surface the honest limitation rather than a broken button.
 */
export function canPrintReliably(): boolean {
  return !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
