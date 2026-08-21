import {
  bulletsToText,
  reconcileLines,
  type HobbyItem,
  type ReferenceItem,
  type SkillsItem,
} from "@resume-builder/core";
import { ChipsField, LinesField, TextField } from "./fields";
import {
  AddButton,
  EmptyState,
  RemoveButton,
  UndoRow,
  makeId,
  useItemList,
} from "./list-controls";

type ReferencesMode = "omitted" | "onRequest" | "listed";

/* ------------------------------------------------------------------ Skills */

export function SkillsPanel({
  items,
  onChange,
}: {
  items: SkillsItem[];
  onChange: (items: SkillsItem[]) => void;
}) {
  const list = useItemList(items, onChange);

  const add = () => list.add({ id: makeId("k"), order: items.length, groupLabel: "", entries: [] });

  if (items.length === 0 && !list.removal.pending) {
    return (
      <EmptyState
        actionLabel="Add a skill group"
        onAction={add}
        text="Group your skills — “Languages”, “Tools”, “Practices”. Two or three groups reads better than one long list."
      />
    );
  }

  return (
    <>
      {items.map((item) => (
        <div className="item-editor" key={item.id}>
          <div className="item-editor-header">
            <TextField
              label="Group name"
              onChange={(groupLabel) => list.update(item.id, { groupLabel })}
              value={item.groupLabel}
            />
            <RemoveButton
              label={`Remove ${item.groupLabel || "skill group"}`}
              onRemove={() => list.remove(item.id)}
            />
          </div>
          <ChipsField
            entries={item.entries}
            label="Skills"
            onChange={(entries) => list.update(item.id, { entries })}
            placeholder="Type a skill, then press Enter"
          />
        </div>
      ))}
      <UndoRow removal={list.removal} what="Skill group" />
      <AddButton label="Add a skill group" onClick={add} />
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
  const handleChange = (value: string) => onChange(reconcileLines(items, value, () => makeId("h")));

  return (
    <>
      {items.length === 0 ? (
        <p className="form-note">
          Optional. A short line or two, if they say something a recruiter can’t get from your experience.
        </p>
      ) : null}
      <LinesField
        countLabel={items.length > 0 ? `${items.length} ${items.length === 1 ? "interest" : "interests"}` : undefined}
        label="Interests — one per line"
        onChange={handleChange}
        rows={Math.max(3, Math.min(6, items.length + 1))}
        value={bulletsToText(items)}
      />
    </>
  );
}

/* -------------------------------------------------------------- References */

const REFERENCE_MODES: Array<{ label: string; value: ReferencesMode }> = [
  { label: "Don’t include references", value: "omitted" },
  { label: "“References available upon request.”", value: "onRequest" },
  { label: "List my referees", value: "listed" },
];
const MAX_REFERENCES = 3;

export function ReferencesPanel({
  items,
  mode,
  onChange,
}: {
  items: ReferenceItem[];
  mode: ReferencesMode;
  onChange: (next: { items: ReferenceItem[]; mode: ReferencesMode }) => void;
}) {
  const list = useItemList(items, (next) => onChange({ mode, items: next }));

  // Switching away from "listed" keeps referee data in the document — it just
  // stops rendering. Losing typed referees on a radio click would be a small
  // betrayal, and retaining them costs nothing.
  const setMode = (next: ReferencesMode) => onChange({ mode: next, items });

  const hasMaxReferences = items.length >= MAX_REFERENCES;
  const add = () => {
    if (hasMaxReferences) {
      return;
    }

    list.add({ id: makeId("r"), order: items.length, name: "", role: "", organization: "" });
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
          {items.length === 0 && !list.removal.pending ? (
            <p className="form-note">Add at least one referee, or switch back to “available upon request”.</p>
          ) : null}
          {items.map((item) => (
            <div className="item-editor" key={item.id}>
              <div className="item-editor-header">
                <TextField
                  label="Name"
                  onChange={(name) => list.update(item.id, { name })}
                  value={item.name}
                />
                <RemoveButton
                  label={`Remove ${item.name || "referee"}`}
                  onRemove={() => list.remove(item.id)}
                />
              </div>
              <div className="field-grid two-columns">
                <TextField label="Role" onChange={(role) => list.update(item.id, { role })} value={item.role} />
                <TextField
                  label="Organisation"
                  onChange={(organization) => list.update(item.id, { organization })}
                  value={item.organization}
                />
              </div>
              <div className="field-grid two-columns">
                <TextField
                  inputMode="email"
                  label="Email"
                  onChange={(email) => list.update(item.id, { email: emptyToUndefined(email) })}
                  value={item.email ?? ""}
                />
                <TextField
                  inputMode="tel"
                  label="Phone"
                  onChange={(phone) => list.update(item.id, { phone: emptyToUndefined(phone) })}
                  value={item.phone ?? ""}
                />
              </div>
            </div>
          ))}
          <UndoRow removal={list.removal} what="Referee" />
          {hasMaxReferences ? (
            <p className="form-note">You can add up to 3 referees.</p>
          ) : null}
          <AddButton
            disabled={hasMaxReferences}
            label={hasMaxReferences ? "Maximum 3 referees" : "Add a referee"}
            onClick={add}
          />
        </>
      ) : null}

      {mode !== "listed" && items.length > 0 ? (
        <p className="form-note">
          {items.length} {items.length === 1 ? "referee is" : "referees are"} saved but not shown. Choose “List my
          referees” to include {items.length === 1 ? "them" : "them"}.
        </p>
      ) : null}
    </>
  );
}

function emptyToUndefined(value: string) {
  return value.trim().length === 0 ? undefined : value;
}
