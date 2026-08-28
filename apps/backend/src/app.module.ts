import { Module } from "@nestjs/common";
import { AssetsController } from "./assets/assets.controller.js";
import { AssetsService } from "./assets/assets.service.js";
import { SupabaseAuthGuard } from "./auth/supabase-auth.guard.js";
import { SupabaseAuthService } from "./auth/supabase-auth.service.js";
import { HealthController } from "./health.controller.js";
import { PrismaService } from "./prisma.service.js";
import { ResumesController } from "./resumes/resumes.controller.js";
import { ResumesService } from "./resumes/resumes.service.js";
import { UsersController } from "./users/users.controller.js";
import { UsersService } from "./users/users.service.js";

@Module({
  controllers: [
    HealthController,
    UsersController,
    ResumesController,
    AssetsController,
  ],
  providers: [
    PrismaService,
    UsersService,
    ResumesService,
    AssetsService,
    SupabaseAuthService,
    SupabaseAuthGuard,
  ],
})
export class AppModule {}
