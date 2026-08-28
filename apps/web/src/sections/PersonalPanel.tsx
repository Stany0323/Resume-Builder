import { useState } from "react";
import type { ResumeDocument } from "@resume-builder/core";
import { TEMPLATES } from "@resume-builder/render";
import { Disclosure, TextField } from "./fields";
import { PhotoField } from "./PhotoField";
import {
  AddButton,
  RemoveButton,
  UndoRow,
  makeId,
  useRemovalUndo,
} from "./list-controls";

type Personal = ResumeDocument["personal"];
type Link = Personal["links"][number];
type LinkType = Link["type"];

const LINK_TYPES: Array<{
  label: string;
  placeholder: string;
  value: LinkType;
}> = [
  { label: "Website", placeholder: "yourname.com", value: "url" },
  { label: "LinkedIn", placeholder: "linkedin.com/in/you", value: "linkedin" },
  { label: "GitHub", placeholder: "github.com/you", value: "github" },
  { label: "Other", placeholder: "", value: "custom" },
];

export function PersonalPanel({
  deletePhoto,
  onChange,
  personal,
  templateId,
  uploadPhoto,
}: {
  deletePhoto?: (url: string) => Promise<void>;
  onChange: (patch: Partial<Personal>) => void;
  personal: Personal;
  templateId: ResumeDocument["design"]["templateId"];
  uploadPhoto?: (dataUrl: string, previousUrl?: string) => Promise<{ url: string }>;
}) {
  const set =
    (field: "firstName" | "lastName" | "email" | "phone") => (value: string) =>
      onChange({ [field]: value } as Partial<Personal>);

  const setOptional =
    (field: "headline" | "location" | "dateOfBirth") => (value: string) =>
      onChange({
        [field]: value.trim() === "" ? undefined : value,
      } as Partial<Personal>);

  const showsPhoto = TEMPLATES[templateId].supportsPhoto;

  return (
    <>
      <PhotoField
        deletePhoto={deletePhoto}
        onChange={(photo) => onChange({ photo })}
        photo={personal.photo}
        uploadPhoto={uploadPhoto}
      />
      <PhotoTemplateNote
        hasPhoto={Boolean(personal.photo)}
        showsPhoto={showsPhoto}
        templateId={templateId}
      />

      <div className="field-grid two-columns">
        <TextField
          label="First name"
          onChange={set("firstName")}
          value={personal.firstName}
        />
        <TextField
          label="Last name"
          onChange={set("lastName")}
          value={personal.lastName}
        />
      </div>
      <TextField
        hint="What you do, not what you want. “Senior Product Manager”, not “Seeking opportunities”."
        label="Headline"
        onChange={setOptional("headline")}
        value={personal.headline ?? ""}
      />
      <div className="field-grid two-columns">
        <TextField
          inputMode="email"
          label="Email"
          onChange={set("email")}
          type="email"
          value={personal.email}
        />
        <TextField
          inputMode="tel"
          label="Phone"
          onChange={set("phone")}
          type="tel"
          value={personal.phone}
        />
      </div>
      <EmailWarning email={personal.email} />
      <TextField
        label="Location"
        onChange={setOptional("location")}
        value={personal.location ?? ""}
      />

      <LinksField
        links={personal.links}
        onChange={(links) => onChange({ links })}
      />

      <Disclosure label="Optional details">
        <DateOfBirthField
          onChange={(value) =>
            onChange({ dateOfBirth: value.trim() === "" ? undefined : value })
          }
          value={personal.dateOfBirth ?? ""}
        />
        <DateOfBirthNote
          dateOfBirth={personal.dateOfBirth}
          templateId={templateId}
        />
      </Disclosure>
    </>
  );
}

function DateOfBirthField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const formattedValue = formatDateOfBirthInput(value);
  const isComplete = formattedValue.length === 10;
  const isValid = !isComplete || isValidDateOfBirth(formattedValue);

  return (
    <label>
      Date of birth
      <input
        inputMode="numeric"
        maxLength={10}
        onChange={(event) => onChange(formatDateOfBirthInput(event.target.value))}
        placeholder="dd-mm-yyyy"
        type="text"
        value={formattedValue}
      />
      {!isValid ? (
        <span className="field-message" role="status">
          Use dd-mm-yyyy.
        </span>
      ) : null}
    </label>
  );
}

function PhotoTemplateNote({
  hasPhoto,
  showsPhoto,
  templateId,
}: {
  hasPhoto: boolean;
  showsPhoto: boolean;
  templateId: ResumeDocument["design"]["templateId"];
}) {
  if (!hasPhoto || showsPhoto) {
    return null;
  }

  const withPhoto = (
    Object.keys(TEMPLATES) as Array<ResumeDocument["design"]["templateId"]>
  )
    .filter((id) => TEMPLATES[id].supportsPhoto)
    .map((id) => TEMPLATES[id].label);

  return (
    <p className="advisory" role="status">
      {TEMPLATES[templateId].label} doesn’t show a photo — it’s a résumé style
      where one is unusual. Your photo is still saved. {withPhoto.join(", ")}{" "}
      all show it.
    </p>
  );
}

function DateOfBirthNote({
  dateOfBirth,
  templateId,
}: {
  dateOfBirth?: string;
  templateId: ResumeDocument["design"]["templateId"];
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !dateOfBirth || templateId !== "slate") {
    return null;
  }

  return (
    <p className="advisory" role="status">
      Date of birth is uncommon on US-style résumés, and some employers there
      treat it as a discrimination risk. It’s expected on CVs in many other
      regions — keep it if that’s your market.{" "}
      <button
        className="link-button"
        onClick={() => setDismissed(true)}
        type="button"
      >
        Got it
      </button>
    </p>
  );
}

function EmailWarning({ email }: { email: string }) {
  if (email.trim() === "" || email.includes("@")) {
    return null;
  }

  return (
    <p className="field-message" role="status">
      That doesn’t look like an email address.
    </p>
  );
}

function formatDateOfBirthInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join("-");
}

function isValidDateOfBirth(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) {
    return false;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function LinksField({
  links,
  onChange,
}: {
  links: Link[];
  onChange: (links: Link[]) => void;
}) {
  const removal = useRemovalUndo<Link>((restored, index) => {
    const next = [...links];
    next.splice(index, 0, restored);
    onChange(next);
  });

  const update = (id: string, patch: Partial<Link>) => {
    onChange(
      links.map((link) => (link.id === id ? { ...link, ...patch } : link)),
    );
  };

  const add = () => {
    const used = new Set(links.map((link) => link.type));
    const next = LINK_TYPES.find(
      (option) => option.value !== "custom" && !used.has(option.value),
    );

    onChange([
      ...links,
      { id: makeId("l"), type: next?.value ?? "custom", value: "" },
    ]);
  };

  return (
    <div className="links-field">
      <span className="field-group-label">Links</span>
      {links.length === 0 && !removal.pending ? (
        <p className="form-note">
          Portfolio, LinkedIn, GitHub — whatever a reader should be able to
          click.
        </p>
      ) : null}

      {links.map((link, index) => {
        const option = LINK_TYPES.find(
          (candidate) => candidate.value === link.type,
        );

        return (
          <div className="link-row" key={link.id}>
            <label className="link-type">
              <span className="visually-hidden">Link type</span>
              <select
                onChange={(event) =>
                  update(link.id, { type: event.target.value as LinkType })
                }
                value={link.type}
              >
                {LINK_TYPES.map((candidate) => (
                  <option key={candidate.value} value={candidate.value}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </label>

            {link.type === "custom" ? (
              <label className="link-label">
                <span className="visually-hidden">Label</span>
                <input
                  onChange={(event) =>
                    update(link.id, { label: event.target.value })
                  }
                  placeholder="Label"
                  value={link.label ?? ""}
                />
              </label>
            ) : null}

            <label className="link-value">
              <span className="visually-hidden">
                {option?.label ?? "Link"} address
              </span>
              <input
                inputMode="url"
                onChange={(event) =>
                  update(link.id, { value: event.target.value })
                }
                placeholder={option?.placeholder}
                value={link.value}
              />
            </label>

            <RemoveButton
              label={`Remove ${option?.label ?? "link"}`}
              onRemove={() => {
                removal.remove(link, index);
                onChange(links.filter((candidate) => candidate.id !== link.id));
              }}
            />
          </div>
        );
      })}

      <UndoRow removal={removal} what="Link" />
      <AddButton label="Add a link" onClick={add} />
    </div>
  );
}
