import type { ResumeDocument } from "@resume-builder/core";

export function createBlankResume(): ResumeDocument {
  return {
    schemaVersion: 2,
    meta: {
      id: crypto.randomUUID(),
      title: "Untitled resume",
      updatedAt: new Date().toISOString(),
      profileType: "graduate",
    },
    design: {
      templateId: "slate",
      pageSize: "A4",
      fontPairing: "contrast",
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
      projects: { items: [] },
      certifications: { items: [] },
      languages: { items: [] },
      skills: { items: [] },
      hobbies: { items: [] },
      references: { mode: "omitted", items: [] },
    },
  };
}

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
    content.projects.items.length === 0 &&
    content.certifications.items.length === 0 &&
    content.languages.items.length === 0 &&
    content.skills.items.length === 0 &&
    content.hobbies.items.length === 0 &&
    content.references.items.length === 0
  );
}
