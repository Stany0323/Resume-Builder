/**
 * Moved to `packages/resume-render/src/design-tokens.ts` — tokens are a render
 * concern, and living in the package means the measurement route picks them up
 * without a parallel import.
 *
 * This file is a re-export so any straggling import keeps working. Safe to
 * delete once nothing references it.
 */
export * from "@resume-builder/render";
