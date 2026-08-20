import type { ResumeDocument } from "@resume-builder/core";

/**
 * The document rendered inside template thumbnails.
 *
 * Deliberately short. At thumbnail scale nobody reads the words — what reads
 * is *structure*: header weight, ruled vs unruled headings, spacing rhythm,
 * where the accent lands. So this carries one of each shape and stops.
 *
 * It is never editable and never saved. It exists so the picker can render the
 * real templates rather than shipping screenshots that drift out of date.
 */
export const TEMPLATE_SAMPLE: ResumeDocument = {
  schemaVersion: 2,
  meta: {
    id: "template-sample",
    title: "Template sample",
    updatedAt: "2026-01-01T00:00:00.000Z",
    profileType: "experienced",
  },
  design: {
    templateId: "atlas",
    pageSize: "A4",
    fontPairing: "source",
    typeScale: "normal",
    density: "normal",
    margins: "normal",
    accent: "slate",
    dateFormat: "MMM yyyy",
  },
  personal: {
    firstName: "Amara",
    lastName: "Chikafu",
    headline: "Senior Product Manager",
    location: "Harare, Zimbabwe",
    email: "amara@example.com",
    phone: "+263 77 000 0000",
    links: [
      { id: "s-l1", type: "linkedin", label: "LinkedIn", value: "linkedin.com/in/example" },
    ],
    photo: null,
  },
  content: {
    summary: {
      text: "Product manager with eight years building payments and lending products for emerging markets. Led the team that took a mobile wallet from pilot to 400,000 monthly active users.",
    },
    experience: {
      items: [
        {
          id: "s-x1",
          order: 0,
          role: "Senior Product Manager",
          organization: "Kopa Financial",
          location: "Harare, ZW",
          startDate: "2023-02",
          endDate: "present",
          bullets: [
            { id: "s-x1b1", order: 0, text: "Grew mobile wallet from 90,000 to 400,000 monthly active users in 19 months." },
            { id: "s-x1b2", order: 1, text: "Cut onboarding drop-off from 61% to 28% by rebuilding identity verification." },
          ],
        },
        {
          id: "s-x2",
          order: 1,
          role: "Product Manager",
          organization: "Sable Commerce",
          location: "Cape Town, ZA",
          startDate: "2020-06",
          endDate: "2023-01",
          bullets: [
            { id: "s-x2b1", order: 0, text: "Launched merchant settlement reporting used by 2,300 sellers at launch." },
          ],
        },
      ],
    },
    education: {
      items: [
        {
          id: "s-e1",
          order: 0,
          degree: "BSc Computer Science",
          institution: "University of Zimbabwe",
          startDate: "2014-02",
          endDate: "2017-11",
          detail: "First Class Honours",
          bullets: [],
        },
      ],
    },
    skills: {
      items: [
        { id: "s-k1", order: 0, groupLabel: "Product", entries: ["Discovery", "Roadmapping", "Pricing"] },
        { id: "s-k2", order: 1, groupLabel: "Technical", entries: ["SQL", "Python", "Figma"] },
      ],
    },
    hobbies: { items: [] },
    references: { mode: "omitted", items: [] },
  },
};
