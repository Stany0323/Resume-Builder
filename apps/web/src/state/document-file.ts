import { migrateResumeDocument, type ResumeDocument } from "@resume-builder/core";

/**
 * Import / export of the resume as JSON.
 *
 * "Your data is never trapped" is one of three stated product bets, so these
 * live at the foot of the form panel rather than buried in a menu.
 */

export function resumeFilename(resume: ResumeDocument, extension: string): string {
  const name = [resume.personal.firstName, resume.personal.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  return name ? `${name}-Resume.${extension}` : `Resume.${extension}`;
}

export function downloadResumeJson(resume: ResumeDocument): void {
  const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = resumeFilename(resume, "json");
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ResumeImportError extends Error {}

/**
 * Parses and migrates an imported file.
 *
 * Validation is deliberately shallow: enough to reject a file that clearly
 * isn't a resume, not so strict that a slightly-off hand-edited document is
 * refused. A user who exported, edited and re-imported their own JSON should
 * not be told it's invalid because one optional field is missing.
 */
export async function readResumeFile(file: File): Promise<ResumeDocument> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new ResumeImportError("That file isn’t valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new ResumeImportError("That file doesn’t look like a resume.");
  }

  const version = parsed.schemaVersion;

  if (version !== 1 && version !== 2) {
    throw new ResumeImportError(
      typeof version === "number"
        ? `That file uses schema version ${version}, which this version of the app doesn’t understand.`
        : "That file doesn’t look like a resume — no schema version.",
    );
  }

  if (version === 2 && !isRecord(parsed.content)) {
    throw new ResumeImportError("That resume file is missing its content.");
  }

  if (version === 1 && !Array.isArray(parsed.sections)) {
    throw new ResumeImportError("That resume file is missing its sections.");
  }

  try {
    return migrateResumeDocument(parsed as unknown as Parameters<typeof migrateResumeDocument>[0]);
  } catch {
    throw new ResumeImportError("That resume couldn’t be upgraded to the current format.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
