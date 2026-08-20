import { useEffect, useRef, useState } from "react";
import {
  bulletsToText,
  reconcileLines,
  splitBulletLines,
  type HobbyItem,
  type ReferenceItem,
  type SkillsItem,
} from "@resume-builder/core";

type ReferencesMode = "omitted" | "onRequest" | "listed";

/* ------------------------------------------------------------------ Skills */

export function SkillsPanel({
  items,
  onChange,
}: {
  items: SkillsItem[];
  onChange: (items: SkillsItem[]) => void;
}) {
  const removal = useRemovalUndo<SkillsItem>((restored, index) => {
    const next = [...items];
    next.splice(index, 0, restored);
    onChange(reorder(next));
  });

  const updateGroup = (id: string, patch: Partial<SkillsItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addGroup = () => {
    onChange(reorder([...items, { id: makeId("k"), order: items.length, groupLabel: "", entries: [] }]));
  };

  if (items.length === 0 && !removal.pending) {
    return (
      <EmptyState
        actionLabel="Add a skill group"
        onAction={addGroup}
        text="Group your skills — “Languages”, “Tools”, “Practices”. Two or three groups reads better than one long list."
      />
    );
  }

  return (
    <>
      {items.map((item, index) => (
        <div className="item-editor" key={item.id}>
          <div className="item-editor-header">
            <TextField
              label="Group name"
              onChange={(value) => updateGroup(item.id, { groupLabel: value })}
              value={item.groupLabel}
            />
            <RemoveButton
              label={`Remove ${item.groupLabel || "skill group"}`}
              onRemove={() => {
                removal.remove(item, index);
                onChange(reorder(items.filter((candidate) => candidate.id !== item.id)));
              }}
            />
          </div>
          <ChipsField
            entries={item.entries}
            label="Skills"
            onChange={(entries) => updateGroup(item.id, { entries })}
          />
        </div>
      ))}
      <UndoRow removal={removal} what="Skill group" />
      <AddButton label="Add a skill group" onClick={addGroup} />
    </>
  );
}

/* ----------------------------------------------------------------- Hobbies */

export function HobbiesPanel({
  items,
  onChange,
}: {
  items: HobbyItem[];
  onChange: (items: HobbyItem[]) => void;
}) {
  // HobbyItem is structurally identical to Bullet, so the same line/ID
  // reconciliation applies — unchanged lines keep their ids.
  const text = bulletsToText(items);

  if (items.length === 0) {
    return (
      <>
        <p className="form-note">
          Optional. A short line or two, if they say something a recruiter can’t get from your experience.
        </p>
        <LinesField
          label="Interests — one per line"
          onChange={(value) => onChange(reconcileLines(items, value, () => makeId("h")))}
          placeholderRows={3}
          value={text}
        />
      </>
    );
  }

  return (
    <LinesField
      countLabel={`${items.length} ${items.length === 1 ? "interest" : "interests"}`}
      label="Interests — one per line"
      onChange={(value) => onChange(reconcileLines(items, value, () => makeId("h")))}
      placeholderRows={Math.max(3, Math.min(6, items.length + 1))}
      value={text}
    />
  );
}

/* -------------------------------------------------------------- References */

const REFERENCE_MODES: Array<{ hint?: string; label: string; value: ReferencesMode }> = [
  { label: "Don’t include references", value: "omitted" },
  { label: "“References available upon request.”", value: "onRequest" },
  { label: "List my referees", value: "listed" },
];

export function ReferencesPanel({
  items,
  mode,
  onChange,
}: {
  items: ReferenceItem[];
  mode: ReferencesMode;
  onChange: (next: { items: ReferenceItem[]; mode: ReferencesMode }) => void;
}) {
  const removal = useRemovalUndo<ReferenceItem>((restored, index) => {
    const next = [...items];
    next.splice(index, 0, restored);
    onChange({ mode, items: reorder(next) });
  });

  // Switching away from "listed" keeps referee data in the document — it just
  // stops rendering. Losing typed referees on a radio click would be a small
  // betrayal, and retaining them costs nothing.
  const setMode = (next: ReferencesMode) => onChange({ mode: next, items });

  const updateReferee = (id: string, patch: Partial<ReferenceItem>) => {
    onChange({ mode, items: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  };

  const addReferee = () => {
    onChange({
      mode,
      items: reorder([
        ...items,
        { id: makeId("r"), order: items.length, name: "", role: "", organization: "" },
      ]),
    });
  };

  return (
    <>
      <fieldset className="mode-choice">
        <legend className="visually-hidden">How to handle references</legend>
        {REFERENCE_MODES.map((option) => (
          <label className="radio-field" key={option.value}>
            <input
              checked={mode === option.value}
              name="references-mode"
              onChange={() => setMode(option.value)}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {mode === "listed" ? (
        <>
          {items.length === 0 && !removal.pending ? (
            <p className="form-note">Add at least one referee, or switch back to “available upon request”.</p>
          ) : null}
          {items.map((item, index) => (
            <div className="item-editor" key={item.id}>
              <div className="item-editor-header">
                <TextField
                  label="Name"
                  onChange={(value) => updateReferee(item.id, { name: value })}
                  value={item.name}
                />
                <RemoveButton
                  label={`Remove ${item.name || "referee"}`}
                  onRemove={() => {
                    removal.remove(item, index);
                    onChange({ mode, items: reorder(items.filter((candidate) => candidate.id !== item.id)) });
                  }}
                />
              </div>
              <div className="field-grid two-columns">
                <TextField
                  label="Role"
                  onChange={(value) => updateReferee(item.id, { role: value })}
                  value={item.role}
                />
                <TextField
                  label="Organisation"
                  onChange={(value) => updateReferee(item.id, { organization: value })}
                  value={item.organization}
                />
              </div>
              <div className="field-grid two-columns">
                <TextField
                  label="Email"
                  onChange={(value) => updateReferee(item.id, { email: emptyToUndefined(value) })}
                  value={item.email ?? ""}
                />
                <TextField
                  label="Phone"
                  onChange={(value) => updateReferee(item.id, { phone: emptyToUndefined(value) })}
                  value={item.phone ?? ""}
                />
              </div>
            </div>
          ))}
          <UndoRow removal={removal} what="Referee" />
          <AddButton label="Add a referee" onClick={addReferee} />
        </>
      ) : null}

      {mode === "omitted" && items.length > 0 ? (
        <p className="form-note">
          {items.length} {items.length === 1 ? "referee is" : "referees are"} saved but not shown. Choose “List my
          referees” to include {items.length === 1 ? "them" : "them"}.
        </p>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------- shared bits */

function ChipsField({
  entries,
  label,
  onChange,
}: {
  entries: string[];
  label: string;
  onChange: (entries: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const additions = raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && !entries.includes(entry));

    if (additions.length > 0) {
      onChange([...entries, ...additions]);
    }
    setDraft("");
  };

  return (
    <div className="chips-field">
      <label>
        {label}
        <input
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
          placeholder={entries.length === 0 ? "Type a skill, then press Enter" : ""}
          value={draft}
        />
      </label>
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

function LinesField({
  countLabel,
  label,
  onChange,
  placeholderRows,
  value,
}: {
  countLabel?: string;
  label: string;
  onChange: (value: string) => void;
  placeholderRows: number;
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
          if (!pasted.includes("\n")) {
            return;
          }
          event.preventDefault();
          const cleaned = splitBulletLines(pasted).join("\n");
          const target = event.currentTarget;
          const before = target.value.slice(0, target.selectionStart ?? 0);
          const after = target.value.slice(target.selectionEnd ?? 0);
          onChange(`${before}${cleaned}${after}`);
        }}
        rows={placeholderRows}
        value={value}
      />
      {countLabel ? <span className="counter-line">{countLabel}</span> : null}
    </label>
  );
}

function EmptyState({
  actionLabel,
  onAction,
  text,
}: {
  actionLabel: string;
  onAction: () => void;
  text: string;
}) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      <AddButton label={actionLabel} onClick={onAction} />
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="add-button" onClick={onClick} type="button">
      + {label}
    </button>
  );
}

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button aria-label={label} className="remove-button" onClick={onRemove} type="button">
      Remove
    </button>
  );
}

function UndoRow<T>({ removal, what }: { removal: RemovalUndo<T>; what: string }) {
  if (!removal.pending) {
    return null;
  }

  return (
    <div className="undo-row" role="status">
      <span>{what} removed.</span>
      <button onClick={removal.undo} type="button">
        Undo
      </button>
    </div>
  );
}

/* Removal is the one action that needs undo (PIVOT-v3 §6). Remove immediately,
   offer undo briefly — an undo affordance beats a confirmation modal. */

type RemovalUndo<T> = {
  pending: { index: number; item: T } | null;
  remove: (item: T, index: number) => void;
  undo: () => void;
};

const UNDO_WINDOW_MS = 8000;

function useRemovalUndo<T>(restore: (item: T, index: number) => void): RemovalUndo<T> {
  const [pending, setPending] = useState<{ index: number; item: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  return {
    pending,
    remove: (item, index) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setPending({ index, item });
      timer.current = setTimeout(() => setPending(null), UNDO_WINDOW_MS);
    },
    undo: () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      if (pending) {
        restore(pending.item, pending.index);
      }
      setPending(null);
    },
  };
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label>
      {label}
      <input onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function reorder<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

function emptyToUndefined(value: string) {
  return value.trim().length === 0 ? undefined : value;
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
