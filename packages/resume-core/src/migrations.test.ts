import { describe, expect, it } from "vitest";
import fixture3Page from "../../../fixtures/fixture-3page.json";
import { getRenderableSections, migrateResumeDocument, type LegacyResumeDocumentV1 } from "./index";

describe("resume document migrations", () => {
  it("migrates v1 fixtures to schema v2 without losing pivot content", () => {
    const migrated = migrateResumeDocument(fixture3Page as LegacyResumeDocumentV1);
    const sectionTypes = getRenderableSections(migrated).map((section) => section.type);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.personal.firstName).toBe("Tendai");
    expect(migrated.personal.email).toBe("tendai.mukamuri.nyathi@example.com");
    expect(sectionTypes).toEqual(["summary", "experience", "skills", "education", "hobbies"]);
    expect(migrated.content.experience.items[0]?.bullets[0]?.text).toContain("Redesigned the settlement ledger");
    expect(migrated.content.references.mode).toBe("omitted");
  });

  it("does not migrate items from hidden v1 sections", () => {
    const document = baseV1Document({
      sections: [{
        id: "hidden-experience",
        type: "experience",
        title: "Experience",
        order: 0,
        visible: false,
        items: [experienceItem({ id: "secret", role: "SECRET ROLE" })],
      }],
    });

    const migrated = migrateResumeDocument(document);

    expect(migrated.content.experience.items).toEqual([]);
  });

  it("concatenates duplicate v1 sections in section order", () => {
    const document = baseV1Document({
      sections: [
        {
          id: "earlier-experience",
          type: "experience",
          title: "Earlier Experience",
          order: 1,
          visible: true,
          items: [experienceItem({ id: "lost", role: "Earlier Role", order: 0 })],
        },
        {
          id: "experience",
          type: "experience",
          title: "Experience",
          order: 0,
          visible: true,
          items: [experienceItem({ id: "kept", role: "Recent Role", order: 0 })],
        },
      ],
    });

    const migrated = migrateResumeDocument(document);

    expect(migrated.content.experience.items.map((item) => item.role)).toEqual(["Recent Role", "Earlier Role"]);
  });

  it("does not leak hidden custom sections into hobbies", () => {
    const document = baseV1Document({
      sections: [
        {
          id: "hidden-sentinel",
          type: "custom",
          title: "Hidden",
          order: 0,
          visible: false,
          items: [{
            id: "sentinel",
            order: 0,
            visible: true,
            text: "If this text appears in any rendered output, section visibility is broken.",
          }],
        },
        {
          id: "languages",
          type: "custom",
          title: "Languages",
          order: 1,
          visible: true,
          items: [{ id: "languages-item", order: 0, visible: true, text: "Shona, English" }],
        },
      ],
    });

    const migrated = migrateResumeDocument(document);

    expect(migrated.content.hobbies.items.map((item) => item.text)).toEqual(["Shona, English"]);
  });
});

function baseV1Document(overrides: Partial<LegacyResumeDocumentV1>): LegacyResumeDocumentV1 {
  return {
    schemaVersion: 1,
    meta: {
      id: "v1-test",
      title: "V1 Test",
      updatedAt: "2026-08-20T08:00:00.000Z",
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
    header: {
      fullName: "Test User",
      photo: null,
      contacts: [
        { id: "email", type: "email", value: "test@example.com", order: 0 },
        { id: "phone", type: "phone", value: "+263 77 000 0000", order: 1 },
      ],
    },
    sections: [],
    ...overrides,
  };
}

function experienceItem(overrides: { id: string; role: string; order?: number }) {
  return {
    id: overrides.id,
    order: overrides.order ?? 0,
    visible: true,
    role: overrides.role,
    organization: "Example Org",
    startDate: "2020-01",
    endDate: "2024-01",
    summary: null,
    bullets: [],
  };
}
