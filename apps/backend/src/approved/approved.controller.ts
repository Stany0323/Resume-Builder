import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import { parseInput, parseUuid } from "../common/validation.js";
import { ApprovedService } from "./approved.service.js";

const searchQuerySchema = z.object({
  query: z.string().optional().default(""),
  limit: z.coerce.number().int().min(1).max(30).optional().default(12),
});
const skillMutationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80).nullable().optional(),
  approved: z.boolean().optional().default(true),
});

@Controller("approved")
export class ApprovedController {
  constructor(@Inject(ApprovedService) private readonly approved: ApprovedService) {}

  @Get("skills")
  skills(@Query() query: unknown) {
    const input = parseInput(searchQuerySchema, query, "Invalid search query.");
    return this.approved.searchSkills(input.query, input.limit);
  }

  @Post("skills")
  @UseGuards(SupabaseAuthGuard)
  createSkill(@Body() body: unknown) {
    return this.approved.createSkill(parseInput(skillMutationSchema, body));
  }

  @Patch("skills/:id")
  @UseGuards(SupabaseAuthGuard)
  updateSkill(@Param("id") id: string, @Body() body: unknown) {
    return this.approved.updateSkill(parseUuid(id), parseInput(skillMutationSchema.partial(), body));
  }

  @Delete("skills/:id")
  @UseGuards(SupabaseAuthGuard)
  deleteSkill(@Param("id") id: string) {
    return this.approved.deleteSkill(parseUuid(id));
  }
}
