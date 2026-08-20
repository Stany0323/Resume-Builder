import { describe, expect, it } from "vitest";
import type { Bullet } from "../index";
import {
  bulletsToText,
  normaliseBulletLine,
  reconcileLines,
  splitBulletLines,
} from "./reconcile-lines";

function bullets(...texts: string[]): Bullet[] {
  return texts.map((text, order) => ({ id: `b${order + 1}`, order, text }));
}

function counter() {
  let count = 0;
  return {
    makeId: () => `new${(count += 1)}`,
    get minted() {
      return count;
    },
  };
}

describe("reconcileLines", () => {
  it("preserves every id when nothing changed", () => {
    const { makeId } = counter();
    const result = reconcileLines(bullets("alpha", "beta", "gamma"), "alpha\nbeta\ngamma", makeId);

    expect(result.map((bullet) => bullet.id)).toEqual(["b1", "b2", "b3"]);
  });

  it("mints an id only for the edited line", () => {
    const { makeId } = counter();
    const result = reconcileLines(bullets("alpha", "beta", "gamma"), "alpha\nBETA EDITED\ngamma", makeId);

    expect(result.map((bullet) => bullet.id)).toEqual(["b1", "new1", "b3"]);
  });

  it("keeps surrounding ids when a line is inserted", () => {
    const { makeId } = counter();
    const result = reconcileLines(bullets("alpha", "beta"), "alpha\ninserted\nbeta", makeId);

    expect(result.map((bullet) => bullet.id)).toEqual(["b1", "new1", "b2"]);
    expect(result.map((bullet) => bullet.order)).toEqual([0, 1, 2]);
  });

  it("keeps remaining ids when a line is deleted", () => {
    const { makeId } = counter();
    const result = reconcileLines(bullets("alpha", "beta", "gamma"), "alpha\ngamma", makeId);

    expect(result.map((bullet) => bullet.id)).toEqual(["b1", "b3"]);
  });

  it("preserves ids across a reorder", () => {
    const idCounter = counter();
    const result = reconcileLines(bullets("alpha", "beta", "gamma"), "gamma\nalpha\nbeta", idCounter.makeId);

    expect(result.map((bullet) => bullet.id)).toEqual(["b3", "b1", "b2"]);
    expect(idCounter.minted).toBe(0);
  });

  it("gives duplicate texts distinct ids", () => {
    const { makeId } = counter();
    const result = reconcileLines(bullets("same", "same"), "same\nsame\nsame", makeId);

    expect(result.map((bullet) => bullet.id)).toEqual(["b1", "b2", "new1"]);
  });

  it("clears bullets when the textarea is emptied", () => {
    const { makeId } = counter();

    expect(reconcileLines(bullets("alpha", "beta"), "", makeId)).toEqual([]);
  });

  it("always emits contiguous order from zero", () => {
    const { makeId } = counter();
    const result = reconcileLines(bullets("a", "b", "c"), "x\na\ny\nc\nz", makeId);

    expect(result.map((bullet) => bullet.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it("round-trips through bulletsToText without minting ids", () => {
    const idCounter = counter();
    const original = bullets("alpha", "beta", "gamma");

    expect(reconcileLines(original, bulletsToText(original), idCounter.makeId)).toEqual(original);
    expect(idCounter.minted).toBe(0);
  });

  it("keeps untouched bullet ids stable across many keystrokes", () => {
    const idCounter = counter();
    let current = bullets("stable one", "editing", "stable two");

    for (let keystroke = 0; keystroke < 100; keystroke += 1) {
      current = reconcileLines(current, `stable one\nediting${keystroke}\nstable two`, idCounter.makeId);
    }

    expect([current[0].id, current[2].id]).toEqual(["b1", "b3"]);
    expect(idCounter.minted).toBe(100);
  });
});

describe("splitBulletLines", () => {
  it("strips bullet glyphs", () => {
    expect(splitBulletLines("• one\n- two\n* three\n▪ four\n· five"))
      .toEqual(["one", "two", "three", "four", "five"]);
  });

  it("strips list numbering", () => {
    expect(splitBulletLines("1. one\n2) two\n10. ten")).toEqual(["one", "two", "ten"]);
  });

  it("drops blank lines and trims", () => {
    expect(splitBulletLines("  one  \n\n\n   \n two ")).toEqual(["one", "two"]);
  });

  it("handles CRLF and lone CR", () => {
    expect(splitBulletLines("one\r\ntwo\rthree")).toEqual(["one", "two", "three"]);
  });

  it("does not eat mid-sentence hyphens", () => {
    expect(splitBulletLines("cost-effective re-architecture")).toEqual(["cost-effective re-architecture"]);
  });

  it("handles a realistic Word paste", () => {
    expect(splitBulletLines("• Grew wallet from 90,000 to 400,000 users\n• Cut drop-off from 61% to 28%\n\n• Led a team of six"))
      .toEqual([
        "Grew wallet from 90,000 to 400,000 users",
        "Cut drop-off from 61% to 28%",
        "Led a team of six",
      ]);
  });
});

describe("normaliseBulletLine", () => {
  it("normalises smart quotes and non-breaking spaces", () => {
    expect(normaliseBulletLine("Led the “team” and Bob’s group")).toBe('Led the "team" and Bob\'s group');
  });

  it("collapses internal whitespace", () => {
    expect(normaliseBulletLine("too    many     spaces")).toBe("too many spaces");
  });
});
