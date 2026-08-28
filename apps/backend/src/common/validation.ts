import { BadRequestException } from "@nestjs/common";
import { z, ZodError, type ZodType } from "zod";

export function parseUuid(value: string, field = "id") {
  return parseInput(z.string().uuid(), value, `Invalid ${field}.`);
}

export function parseInput<T>(
  schema: ZodType<T>,
  value: unknown,
  message = "Invalid request body.",
) {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message,
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    throw error;
  }
}
