import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fixture3Page from "../../../../fixtures/fixture-3page.json";
import {
  extractResumeBlocks,
  migrateResumeDocument,
  SECTION_BLOCK_EXTRACTORS,
  SECTION_TYPES,
  getRenderableSections,
  hasVisibleSectionContent,
  type LegacyResumeDocumentV1,
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
    const resume = migrateResumeDocument(fixture3Page as LegacyResumeDocumentV1);
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
    const resume = migrateResumeDocument(fixture3Page as LegacyResumeDocumentV1);
    const renderedMarkup = renderToStaticMarkup(<ResumePreview resume={resume} />);

    expect(extractDataBlockIds(renderedMarkup)).toEqual(
      extractResumeBlocks(resume).map((block) => block.id),
    );
  });
});

function extractDataBlockIds(markup: string) {
  return [...markup.matchAll(/data-block-id="([^"]+)"/g)].map((match) => match[1]);
}
