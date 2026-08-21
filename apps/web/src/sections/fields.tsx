import { useState, type ReactNode } from "react";
import { normaliseBulletLine, splitBulletLines } from "@resume-builder/core";

/**
 * Shared form inputs. Paste sanitisation lives here so it applies everywhere
 * by construction rather than by remembering to add it (FORM-SPEC §2.4).
 *
 * Conservatism rule: text is always preserved cleanly first, and nothing is
 * ever silently restructured. Where a paste can't fit the field, we say what
 * we did rather than quietly discarding it.
 */

/* ---------------------------------------------------------------- helpers */

function insertAtCursor(
  target: HTMLInputElement | HTMLTextAreaElement,
  insertion: string,
): string {
  const before = target.value.slice(0, target.selectionStart ?? target.value.length);
  const after = target.value.slice(target.selectionEnd ?? target.value.length);
  return `${before}${insertion}${after}`;
}

/* -------------------------------------------------------------- TextField */

export function TextField({
  hint,
  inputMode,
  label,
  onChange,
  type = "text",
  value,
}: {
  hint?: ReactNode;
  inputMode?: "text" | "email" | "tel" | "url";
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  return (
    <label>
      {label}
      <input
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text/plain");
          const lines = splitBulletLines(pasted);

          // A clean single-line paste needs no intervention beyond
          // normalisation, and letting the browser handle it preserves undo.
          if (lines.length <= 1 && pasted === normaliseBulletLine(pasted)) {
            return;
          }

          event.preventDefault();
          onChange(insertAtCursor(event.currentTarget, lines[0] ?? ""));

          setPasteNote(
            lines.length > 1
              ? `Pasted ${lines.length} lines — kept the first. The rest are still on your clipboard.`
              : null,
          );
        }}
        type={type}
        value={value}
      />
      {pasteNote ? (
        <span className="field-message" role="status">
          {pasteNote}{" "}
          <button className="link-button" onClick={() => setPasteNote(null)} type="button">
            Dismiss
          </button>
        </span>
      ) : null}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------- LinesField */

/** Textarea where each line is one item. Paste is split and de-bulleted. */
export function LinesField({
  countLabel,
  label,
  onChange,
  rows,
  value,
}: {
  countLabel?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label>
      {label}
      <textarea
        className="bullets-textarea"
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text/plain");
          if (!pasted.includes("\n") && pasted === normaliseBulletLine(pasted)) {
            return;
          }
          event.preventDefault();
          onChange(insertAtCursor(event.currentTarget, splitBulletLines(pasted).join("\n")));
        }}
        rows={rows}
        value={value}
      />
      {countLabel ? <span className="counter-line">{countLabel}</span> : null}
    </label>
  );
}

/* -------------------------------------------------------------- ProseField */

/** Multi-line prose that is *not* a list — the summary. Newlines collapse. */
export function ProseField({
  advisory,
  label,
  onChange,
  rows,
  value,
}: {
  advisory?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label>
      {label}
      <textarea
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text/plain");
          const cleaned = splitBulletLines(pasted).join(" ");
          if (cleaned === pasted) {
            return;
          }
          event.preventDefault();
          onChange(insertAtCursor(event.currentTarget, cleaned));
        }}
        rows={rows}
        value={value}
      />
      {advisory ? <span className="counter-line">{advisory}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------- ChipsField */

export function ChipsField({
  entries,
  label,
  maxEntries,
  onChange,
  placeholder,
}: {
  entries: string[];
  label: string;
  maxEntries?: number;
  onChange: (entries: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const isFull = typeof maxEntries === "number" && entries.length >= maxEntries;

  const commit = (raw: string) => {
    if (isFull) {
      setDraft("");
      return;
    }

    const additions = raw
      .split(/[,\n]/)
      .map((entry) => normaliseBulletLine(entry))
      .filter((entry) => entry.length > 0 && !entries.includes(entry));

    if (additions.length > 0) {
      onChange([...entries, ...additions].slice(0, maxEntries ?? Number.POSITIVE_INFINITY));
    }
    setDraft("");
  };

  return (
    <div className="chips-field">
      <label>
        {label}
        <input
          disabled={isFull}
          onBlur={() => commit(draft)}
          onChange={(event) => {
            // Comma commits, which is what people type. Enter also commits,
            // which is what they expect. Support both.
            if (event.target.value.includes(",")) {
              commit(event.target.value);
              return;
            }
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(draft);
              return;
            }
            if (event.key === "Backspace" && draft === "" && entries.length > 0) {
              onChange(entries.slice(0, -1));
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text/plain");
            if (!/[,\n]/.test(pasted)) {
              return;
            }
            // A pasted list is unambiguous — commit every entry at once.
            event.preventDefault();
            commit(pasted);
          }}
          placeholder={isFull ? "Maximum reached" : entries.length === 0 ? placeholder ?? "Type one, then press Enter" : ""}
          value={draft}
        />
      </label>
      {typeof maxEntries === "number" ? (
        <span className="counter-line">
          {entries.length}/{maxEntries} {maxEntries === 1 ? "skill" : "skills"}
        </span>
      ) : null}
      {entries.length > 0 ? (
        <ul className="chips">
          {entries.map((entry) => (
            <li key={entry}>
              <button
                aria-label={`Remove ${entry}`}
                onClick={() => onChange(entries.filter((candidate) => candidate !== entry))}
                type="button"
              >
                {entry}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- Disclosure */

export function Disclosure({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="disclosure">
      <button
        aria-expanded={open}
        className="disclosure-toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">{open ? "−" : "+"}</span> {label}
      </button>
      {open ? <div className="disclosure-body">{children}</div> : null}
    </div>
  );
}
