import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { parseInput, parseUuid } from "../common/validation.js";
import { deleteAssetByUrlSchema, listAssetsSchema, replaceAssetSchema, uploadAssetSchema } from "./asset.schemas.js";
import { AssetsService } from "./assets.service.js";

@Controller("assets")
@UseGuards(SupabaseAuthGuard)
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assets: AssetsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: unknown) {
    const input = parseInput(listAssetsSchema, query, "Invalid asset query.");
    return this.assets.list(request.user, input.kind);
  }

  @Post()
  upload(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.assets.upload(request.user, parseInput(uploadAssetSchema, body));
  }

  @Post("replace")
  replace(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.assets.replace(request.user, parseInput(replaceAssetSchema, body));
  }

  @Delete()
  deleteByUrl(@Req() request: AuthenticatedRequest, @Query() query: unknown) {
    return this.assets.deleteByUrl(
      request.user,
      parseInput(deleteAssetByUrlSchema, query, "Invalid asset delete query."),
    );
  }

  @Delete(":id")
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.assets.delete(request.user, parseUuid(id));
  }
}
