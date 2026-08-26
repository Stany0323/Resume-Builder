import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fixture3Page from "../../../../fixtures/fixture-3page.v2.json";
import {
  extractResumeBlocks,
  SECTION_BLOCK_EXTRACTORS,
  SECTION_TYPES,
  getRenderableSections,
  hasVisibleSectionContent,
  type ResumeDocument,
} from "@resume-builder/core";
import { ResumePreview } from "../index";
import { SECTION_RENDERERS } from "./registry";

describe("section render/block conformance", () => {
  it("has matching block and render registries for every section type", () => {
    expect(Object.keys(SECTION_BLOCK_EXTRACTORS).sort()).toEqual([...SECTION_TYPES].sort());
    expect(Object.keys(SECTION_RENDERERS).sort()).toEqual([...SECTION_TYPES].sort());
  });

  it("renders the same data-block-id sequence that core extracts", () => {
    const resume = fixtureWithEverySection();
    const visibleSections = getRenderableSections(resume).filter(hasVisibleSectionContent);

    expect(new Set(visibleSections.map((section) => section.type))).toEqual(new Set(SECTION_TYPES));

    for (const section of visibleSections) {
      const extractedBlockIds = SECTION_BLOCK_EXTRACTORS[section.type](section).map((block) => block.id);
      const renderedMarkup = renderToStaticMarkup(
        <section data-section-id={section.id} data-section-type={section.type}>
          <h3 data-block-id={`section:${section.id}:header`}>{section.title}</h3>
          {SECTION_RENDERERS[section.type](section)}
        </section>,
      );

      expect(extractDataBlockIds(renderedMarkup), section.type).toEqual(extractedBlockIds);
    }
  });

  it("renders the same document-level data-block-id sequence that core extracts", () => {
    const resume = fixtureWithEverySection();
    const renderedMarkup = renderToStaticMarkup(<ResumePreview resume={resume} />);

    expect(extractDataBlockIds(renderedMarkup)).toEqual(
      extractResumeBlocks(resume).map((block) => block.id),
    );
  });

  it("does not render listed reference items when references are on request", () => {
    const resume = fixture3Page as ResumeDocument;
    const renderedMarkup = renderToStaticMarkup(<ResumePreview resume={resume} />);

    expect(renderedMarkup).not.toContain("SENTINEL");
    expect(renderedMarkup).toContain("References available upon request.");
  });

  it("renders language levels as a five-dot scale", () => {
    const resume = fixture3Page as ResumeDocument;
    const languagesSection = getRenderableSections(resume).find((section) => section.type === "languages");

    if (!languagesSection) {
      throw new Error("Fixture is missing a languages section.");
    }

    const renderedMarkup = renderToStaticMarkup(
      <section>
        {SECTION_RENDERERS.languages(languagesSection)}
      </section>,
    );

    const languageCount = languagesSection.items.length;
    const dotMatches = renderedMarkup.match(/class="resume-language-dot"/g) ?? [];
    const filledDotMatches = renderedMarkup.match(/data-filled="true"/g) ?? [];

    expect(dotMatches).toHaveLength(languageCount * 5);
    expect(filledDotMatches).toHaveLength(
      languagesSection.items.reduce((total, item) => total + item.level, 0),
    );
    expect(renderedMarkup).toContain("out of 5");
  });
});

function fixtureWithEverySection(): ResumeDocument {
  return {
    ...fixture3Page as ResumeDocument,
    content: {
      ...(fixture3Page as ResumeDocument).content,
      projects: {
        items: [
          {
            id: "p1",
            order: 0,
            name: "Settlement Replay Verifier",
            role: "Maintainer",
            tools: "Rust, PostgreSQL",
            link: "github.com/example-tendai/replay-verifier",
            startDate: "2024-02",
            endDate: "present",
            summary: "Open-source test harness for replaying settlement events.",
            bullets: [
              {
                id: "p1b1",
                order: 0,
                text: "Adopted by three platform teams before ledger migrations.",
              },
            ],
          },
        ],
      },
      certifications: {
        items: [
          {
            id: "c1",
            order: 0,
            name: "AWS Certified Solutions Architect",
            issuer: "Amazon Web Services",
            issuedDate: "2024-04",
            expiryDate: "2027-04",
            credentialUrl: "aws.amazon.com/verification/example",
          },
        ],
      },
    },
  };
}

function extractDataBlockIds(markup: string) {
  return [...markup.matchAll(/data-block-id="([^"]+)"/g)].map((match) => match[1]);
}
