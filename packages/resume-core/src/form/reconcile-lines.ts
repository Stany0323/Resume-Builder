import type { Bullet } from "../index";

/**
 * Reconciles a textarea's lines against existing bullets, preserving `id` for
 * lines whose text is unchanged.
 *
 * Why this exists: bullet `id`s appear in block IDs and in the measurement
 * cache key. Regenerating them on every keystroke silently destroys the
 * measurement cache and makes Tighten useless — it degrades rather than fails,
 * so no test would catch it. See FORM-SPEC.md §2.3.
 *
 * Uses a longest-common-subsequence over line text, so insertions, deletions
 * and reorderings all preserve the IDs of untouched lines.
 */
export function reconcileLines(
  existing: readonly Bullet[],
  text: string,
  makeId: () => string,
): Bullet[] {
  const lines = splitBulletLines(text);
  const oldTexts = existing.map((bullet) => bullet.text);

  const matches = longestCommonSubsequence(oldTexts, lines);
  const idForNewIndex = new Map<number, string>();

  for (const [oldIndex, newIndex] of matches) {
    idForNewIndex.set(newIndex, existing[oldIndex].id);
  }

  // Lines that didn't match by LCS may still be reusable: a line that is
  // present in `existing` but was pushed out of the subsequence (e.g. by a
  // move) should keep its id rather than being treated as new.
  const consumed = new Set(matches.map(([oldIndex]) => oldIndex));
  const spareByText = new Map<string, string[]>();

  existing.forEach((bullet, index) => {
    if (consumed.has(index)) {
      return;
    }
    const bucket = spareByText.get(bullet.text);
    if (bucket) {
      bucket.push(bullet.id);
    } else {
      spareByText.set(bullet.text, [bullet.id]);
    }
  });

  return lines.map((lineText, index) => {
    let id = idForNewIndex.get(index);

    if (!id) {
      id = spareByText.get(lineText)?.shift() ?? makeId();
    }

    return { id, order: index, text: lineText };
  });
}

/** Serialises bullets back into textarea content. */
export function bulletsToText(bullets: readonly Bullet[]): string {
  return [...bullets]
    .sort((a, b) => a.order - b.order)
    .map((bullet) => bullet.text)
    .join("\n");
}

/**
 * Splits pasted or typed content into bullet lines.
 * Strips common bullet glyphs and numbering, normalises whitespace and
 * punctuation, and drops blank lines. See FORM-SPEC.md §2.4.
 */
export function splitBulletLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map(normaliseBulletLine)
    .filter((line) => line.length > 0);
}

const LEADING_MARKER = /^\s*(?:[•·▪◦‣∙*–—-]+|\d{1,2}[.)])\s+/;

export function normaliseBulletLine(line: string): string {
  return line
    .replace(/ /g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(LEADING_MARKER, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns matched [oldIndex, newIndex] pairs of a longest common subsequence. */
function longestCommonSubsequence(a: readonly string[], b: readonly string[]): Array<[number, number]> {
  const rows = a.length;
  const cols = b.length;

  if (rows === 0 || cols === 0) {
    return [];
  }

  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;

  while (i < rows && j < cols) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return pairs;
}
