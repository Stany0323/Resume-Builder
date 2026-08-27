import { BadRequestException, Controller, Get, Inject, Query } from "@nestjs/common";
import { z, ZodError } from "zod";
import { ApprovedService } from "./approved.service.js";

const searchQuerySchema = z.object({
  query: z.string().optional().default(""),
  limit: z.coerce.number().int().min(1).max(30).optional().default(12),
});

@Controller("approved")
export class ApprovedController {
  constructor(@Inject(ApprovedService) private readonly approved: ApprovedService) {}

  @Get("skills")
  skills(@Query() query: unknown) {
    const input = parseSearchQuery(query);
    return this.approved.searchSkills(input.query, input.limit);
  }
}

function parseSearchQuery(query: unknown) {
  try {
    return searchQuerySchema.parse(query);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: "Invalid search query.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    throw error;
  }
}
