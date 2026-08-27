import { useRef, useState } from "react";
import type { ResumeDocument } from "@resume-builder/core";
import { Download } from "lucide-react";
import { downloadResumeJson, readResumeFile, ResumeImportError } from "../state/document-file";
import { canPrintReliably, printResume } from "../export/print-export";
import type { SaveStatus } from "../state/persistence";

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  syncing: "Syncing…",
  synced: "Saved to cloud",
  offline: "Offline — saved on this device.",
  // A failed sync is not lost work: the local write already succeeded, so the
  // wording must reassure rather than alarm.
  syncFailed: "Couldn’t reach the server — saved on this device.",
  error: "Couldn’t save on this device.",
};

// Import/Export JSON are developer affordances, not end-user features — but
// they're the only way to seed a document without typing it in, so they stay
// visible while running locally and disappear from production builds.
const SHOW_JSON_CONTROLS = import.meta.env.DEV;

export function ExportBar({
  onImport,
  resume,
  saveStatus,
}: {
  onImport: (resume: ResumeDocument) => void;
  resume: ResumeDocument;
  saveStatus: SaveStatus;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setError(null);
    try {
      onImport(await readResumeFile(file));
    } catch (cause) {
      setError(cause instanceof ResumeImportError ? cause.message : "That file couldn’t be read.");
    } finally {
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  };

  return (
    <div className="export-section">
      <div className="export-bar">
        <button
          className="primary"
          disabled={!canPrintReliably()}
          onClick={() => void printResume(resume)}
          title={canPrintReliably() ? undefined : "Printing to PDF isn’t reliable on mobile — use a desktop browser."}
          type="button"
        >
          <Download size={16} strokeWidth={2} />
          <span>Download PDF</span>
        </button>
        {SHOW_JSON_CONTROLS ? (
          <>
            <button onClick={() => downloadResumeJson(resume)} type="button">
              Export JSON
            </button>
            <button onClick={() => fileInput.current?.click()} type="button">
              Import JSON
            </button>
            <input
              accept="application/json,.json"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              ref={fileInput}
              style={{ display: "none" }}
              type="file"
            />
          </>
        ) : null}
      </div>
      {error ? <p className="import-error" role="alert">{error}</p> : null}
      <p aria-live="polite" className="save-status">{SAVE_LABEL[saveStatus]}</p>
    </div>
  );
}
