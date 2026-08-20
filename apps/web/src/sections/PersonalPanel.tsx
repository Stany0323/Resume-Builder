import { useState } from "react";
import type { ResumeDocument } from "@resume-builder/core";
import { TEMPLATES } from "@resume-builder/render";
import { Disclosure, TextField } from "./fields";
import { PhotoField } from "./PhotoField";
import { AddButton, RemoveButton, UndoRow, makeId, useRemovalUndo } from "./list-controls";

type Personal = ResumeDocument["personal"];
type Link = Personal["links"][number];
type LinkType = Link["type"];

const LINK_TYPES: Array<{ label: string; placeholder: string; value: LinkType }> = [
  { label: "Website", placeholder: "yourname.com", value: "url" },
  { label: "LinkedIn", placeholder: "linkedin.com/in/you", value: "linkedin" },
  { label: "GitHub", placeholder: "github.com/you", value: "github" },
  { label: "Other", placeholder: "", value: "custom" },
];

export function PersonalPanel({
  onChange,
  personal,
  templateId,
}: {
  onChange: (patch: Partial<Personal>) => void;
  personal: Personal;
  templateId: ResumeDocument["design"]["templateId"];
}) {
  const set = (field: "firstName" | "lastName" | "email" | "phone") => (value: string) =>
    onChange({ [field]: value } as Partial<Personal>);

  const setOptional = (field: "headline" | "location" | "dateOfBirth") => (value: string) =>
    onChange({ [field]: value.trim() === "" ? undefined : value } as Partial<Personal>);

  const showsPhoto = TEMPLATES[templateId].supportsPhoto;

  return (
    <>
      <PhotoField onChange={(photo) => onChange({ photo })} photo={personal.photo} />
      <PhotoTemplateNote hasPhoto={Boolean(personal.photo)} showsPhoto={showsPhoto} templateId={templateId} />

      <div className="field-grid two-columns">
        <TextField label="First name" onChange={set("firstName")} value={personal.firstName} />
        <TextField label="Last name" onChange={set("lastName")} value={personal.lastName} />
      </div>
      <TextField
        hint="What you do, not what you want. “Senior Product Manager”, not “Seeking opportunities”."
        label="Headline"
        onChange={setOptional("headline")}
        value={personal.headline ?? ""}
      />
      <div className="field-grid two-columns">
        <TextField inputMode="email" label="Email" onChange={set("email")} type="email" value={personal.email} />
        <TextField inputMode="tel" label="Phone" onChange={set("phone")} type="tel" value={personal.phone} />
      </div>
      <EmailWarning email={personal.email} />
      <TextField label="Location" onChange={setOptional("location")} value={personal.location ?? ""} />

      <LinksField links={personal.links} onChange={(links) => onChange({ links })} />

      <Disclosure label="Optional details">
        <TextField
          label="Date of birth"
          onChange={setOptional("dateOfBirth")}
          type="month"
          value={personal.dateOfBirth ?? ""}
        />
        <DateOfBirthNote dateOfBirth={personal.dateOfBirth} templateId={templateId} />
      </Disclosure>
    </>
  );
}

/* ------------------------------------------------------- photo × template */

/**
 * A photo that silently vanishes when you switch template is the worst kind of
 * bug — the user did something deliberate and the app quietly undid it. The
 * data is kept either way; this just explains why it isn't showing.
 */
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

  const withPhoto = (Object.keys(TEMPLATES) as Array<ResumeDocument["design"]["templateId"]>)
    .filter((id) => TEMPLATES[id].supportsPhoto)
    .map((id) => TEMPLATES[id].label);

  return (
    <p className="advisory" role="status">
      {TEMPLATES[templateId].label} doesn’t show a photo — it’s a résumé style where one is unusual. Your photo is
      still saved. {withPhoto.join(", ")} all show it.
    </p>
  );
}

/* --------------------------------------------------------------- DOB note */

/**
 * Advisory only. Never blocks, never strips the field — DOB is expected on CVs
 * across much of the world and merely unusual on US résumés.
 */
function DateOfBirthNote({
  dateOfBirth,
  templateId,
}: {
  dateOfBirth?: string;
  templateId: ResumeDocument["design"]["templateId"];
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !dateOfBirth || templateId !== "atlas") {
    return null;
  }

  return (
    <p className="advisory" role="status">
      Date of birth is uncommon on US-style résumés, and some employers there treat it as a discrimination risk. It’s
      expected on CVs in many other regions — keep it if that’s your market.{" "}
      <button className="link-button" onClick={() => setDismissed(true)} type="button">
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

/* ------------------------------------------------------------------ Links */

/**
 * `personal.links` has no `order` field, so this manages its own add/remove
 * rather than going through useItemList. Order is entry order.
 */
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
    onChange(links.map((link) => (link.id === id ? { ...link, ...patch } : link)));
  };

  const add = () => {
    // Suggest the next type the user hasn't used yet — most people add
    // LinkedIn then GitHub, and pre-selecting saves a click each time.
    const used = new Set(links.map((link) => link.type));
    const next = LINK_TYPES.find((option) => option.value !== "custom" && !used.has(option.value));

    onChange([...links, { id: makeId("l"), type: next?.value ?? "custom", value: "" }]);
  };

  return (
    <div className="links-field">
      <span className="field-group-label">Links</span>
      {links.length === 0 && !removal.pending ? (
        <p className="form-note">Portfolio, LinkedIn, GitHub — whatever a reader should be able to click.</p>
      ) : null}

      {links.map((link, index) => {
        const option = LINK_TYPES.find((candidate) => candidate.value === link.type);

        return (
          <div className="link-row" key={link.id}>
            <label className="link-type">
              <span className="visually-hidden">Link type</span>
              <select
                onChange={(event) => update(link.id, { type: event.target.value as LinkType })}
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
                  onChange={(event) => update(link.id, { label: event.target.value })}
                  placeholder="Label"
                  value={link.label ?? ""}
                />
              </label>
            ) : null}

            <label className="link-value">
              <span className="visually-hidden">{option?.label ?? "Link"} address</span>
              <input
                inputMode="url"
                onChange={(event) => update(link.id, { value: event.target.value })}
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
