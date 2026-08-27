import { Module } from "@nestjs/common";
import { ApprovedController } from "./approved/approved.controller.js";
import { ApprovedService } from "./approved/approved.service.js";
import { SupabaseAuthGuard } from "./auth/supabase-auth.guard.js";
import { SupabaseAuthService } from "./auth/supabase-auth.service.js";
import { HealthController } from "./health.controller.js";
import { PrismaService } from "./prisma.service.js";
import { ResumesController } from "./resumes/resumes.controller.js";
import { ResumesService } from "./resumes/resumes.service.js";

@Module({
  controllers: [HealthController, ResumesController, ApprovedController],
  providers: [PrismaService, ResumesService, ApprovedService, SupabaseAuthService, SupabaseAuthGuard],
})
export class AppModule {}
