import React from "react";
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import fixture1Page from "../../../fixtures/fixture-1page.json";
import fixture3Page from "../../../fixtures/fixture-3page.json";
import { sampleResume, type PageSize, type ResumeDocument } from "@resume-builder/core";
import { ResumePreview } from "@resume-builder/render";
import "./styles.css";

const resumes = {
  sample: sampleResume,
  "fixture-1page": fixture1Page as ResumeDocument,
  "fixture-3page": fixture3Page as ResumeDocument,
};

type ResumeKey = keyof typeof resumes;

function App() {
  const [resumeKey, setResumeKey] = useState<ResumeKey>("fixture-1page");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const resume = useMemo<ResumeDocument>(() => ({
    ...resumes[resumeKey],
    design: {
      ...resumes[resumeKey].design,
      pageSize,
    },
  }), [pageSize, resumeKey]);

  return (
    <main className="app-shell">
      <aside className="toolbar" aria-label="Resume controls">
        <h1>Resume Builder</h1>
        <label>
          Fixture
          <select value={resumeKey} onChange={(event) => setResumeKey(event.target.value as ResumeKey)}>
            <option value="sample">Sample</option>
            <option value="fixture-1page">Sprint 0: one page</option>
            <option value="fixture-3page">Sprint 0: hostile</option>
          </select>
        </label>
        <div className="segmented-control" aria-label="Page size">
          {(["A4", "Letter"] as const).map((size) => (
            <button
              aria-pressed={pageSize === size}
              key={size}
              onClick={() => setPageSize(size)}
              type="button"
            >
              {size}
            </button>
          ))}
        </div>
      </aside>
      <section className="preview-stage" aria-label="Resume preview">
        <ResumePreview resume={resume} />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
