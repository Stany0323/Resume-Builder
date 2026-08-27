import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z, ZodError, type ZodType } from "zod";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { createResumeSchema, syncResumeSchema } from "./resume.schemas.js";
import { ResumesService } from "./resumes.service.js";

@Controller("resumes")
@UseGuards(SupabaseAuthGuard)
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.resumes.listForUser(request.user);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.resumes.create(request.user, parseInput(createResumeSchema, body));
  }

  @Get(":id")
  get(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.resumes.get(request.user, parseUuid(id));
  }

  @Patch(":id/sync")
  sync(@Req() request: AuthenticatedRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.resumes.sync(request.user, parseUuid(id), parseInput(syncResumeSchema, body));
  }

  @Get(":id/versions")
  versions(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.resumes.versions(request.user, parseUuid(id));
  }
}

function parseUuid(value: string, field = "id") {
  return parseInput(z.string().uuid(), value, `Invalid ${field}.`);
}

function parseInput<T>(schema: ZodType<T>, value: unknown, message = "Invalid request body.") {
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
