import { Body, Controller, Delete, Get, Inject, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { parseInput } from "../common/validation.js";
import { signupSchema, updateMeSchema } from "./user.schemas.js";
import { UsersService } from "./users.service.js";

@Controller()
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Post("users")
  signup(@Body() body: unknown) {
    return this.users.signup(parseInput(signupSchema, body));
  }

  @Get("me")
  @UseGuards(SupabaseAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.users.me(request.user);
  }

  @Patch("me")
  @UseGuards(SupabaseAuthGuard)
  updateMe(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.users.updateMe(request.user, parseInput(updateMeSchema, body));
  }

  @Delete("me")
  @UseGuards(SupabaseAuthGuard)
  deleteMe(@Req() request: AuthenticatedRequest) {
    return this.users.deleteMe(request.user);
  }
}
