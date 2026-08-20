import type { ResumeDocument } from "@resume-builder/core";

/**
 * A brand-new, empty resume. The app boots into this — never into a fixture.
 *
 * Everything starts empty so each section shows its empty state and its
 * "+ Add …" action, which is how the user learns what the form contains.
 * References defaults to "omitted" (template-independent, see FIXTURES.v2.md)
 * so an untouched form produces no References section at all.
 */
export function createBlankResume(): ResumeDocument {
  return {
    schemaVersion: 2,
    meta: {
      id: crypto.randomUUID(),
      title: "Untitled resume",
      updatedAt: new Date().toISOString(),
      profileType: "general",
    },
    design: {
      templateId: "atlas",
      pageSize: defaultPageSize(),
      fontPairing: "source",
      typeScale: "normal",
      density: "normal",
      margins: "normal",
      accent: "slate",
      dateFormat: "MMM yyyy",
    },
    personal: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      links: [],
      photo: null,
    },
    content: {
      summary: { text: "" },
      education: { items: [] },
      experience: { items: [] },
      skills: { items: [] },
      hobbies: { items: [] },
      references: { mode: "omitted", items: [] },
    },
  };
}

/**
 * Letter is used in the US, Canada and a couple of other markets; A4 is the
 * default essentially everywhere else. Guessing from locale is better than
 * defaulting everyone to one and making most of the world change it — and the
 * control stays visible either way.
 */
const LETTER_REGIONS = new Set(["US", "CA", "MX", "PH", "CL", "CO", "VE"]);

export function defaultPageSize(): ResumeDocument["design"]["pageSize"] {
  try {
    const locale = new Intl.Locale(navigator.language);
    const region = locale.region ?? locale.maximize().region;
    return region && LETTER_REGIONS.has(region) ? "Letter" : "A4";
  } catch {
    return "A4";
  }
}

/** True when nothing has been entered — used to decide whether to prompt on import. */
export function isBlankResume(resume: ResumeDocument): boolean {
  const { personal, content } = resume;

  return (
    personal.firstName.trim() === "" &&
    personal.lastName.trim() === "" &&
    personal.email.trim() === "" &&
    personal.phone.trim() === "" &&
    personal.links.length === 0 &&
    content.summary.text.trim() === "" &&
    content.education.items.length === 0 &&
    content.experience.items.length === 0 &&
    content.skills.items.length === 0 &&
    content.hobbies.items.length === 0 &&
    content.references.items.length === 0
  );
}
