import type { ResumeDocument } from "@resume-builder/core";

declare global {
  interface Window {
    __resumeMeasure?: {
      measure: (resume: ResumeDocument) => Promise<unknown>;
    };
  }
}

export {};
