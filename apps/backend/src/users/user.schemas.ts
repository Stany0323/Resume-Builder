import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(128),
  name: z.string().trim().min(1).max(120).optional(),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
