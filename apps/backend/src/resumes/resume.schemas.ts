import { z } from "zod";

const profileTypeSchema = z.enum([
  "attachee",
  "careerChanger",
  "graduate",
  "intern",
  "professional",
]);

const resumeDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  meta: z.object({
    id: z.string(),
    title: z.string(),
    updatedAt: z.string(),
    profileType: profileTypeSchema,
    targetRole: z.string().optional(),
  }),
  design: z.record(z.string(), z.unknown()),
  personal: z.record(z.string(), z.unknown()),
  content: z.record(z.string(), z.unknown()),
});

export const createResumeSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  document: resumeDocumentSchema,
});

export const syncResumeSchema = z.object({
  baseRevision: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(120).optional(),
  document: resumeDocumentSchema,
});

export type CreateResumeInput = z.infer<typeof createResumeSchema>;
export type SyncResumeInput = z.infer<typeof syncResumeSchema>;
