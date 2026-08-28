import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { SupabaseAuthService } from "../auth/supabase-auth.service.js";
import { AssetsService } from "../assets/assets.service.js";
import { PrismaService } from "../prisma.service.js";
import type { SignupInput, UpdateMeInput } from "./user.schemas.js";

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SupabaseAuthService) private readonly auth: SupabaseAuthService,
    @Inject(AssetsService) private readonly assets: AssetsService,
  ) {}

  async signup(input: SignupInput) {
    const authUser = await this.auth.createUser(input);
    const user = await this.prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email ?? input.email,
        name: input.name ?? null,
      },
      create: {
        id: authUser.id,
        email: authUser.email ?? input.email,
        name: input.name ?? null,
      },
    });

    return { user: toUserResponse(user) };
  }

  async me(user: AuthenticatedUser) {
    const profile = await this.prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email ?? `${user.id}@unknown.local`,
      },
      create: {
        id: user.id,
        email: user.email ?? `${user.id}@unknown.local`,
      },
    });

    return { user: toUserResponse(profile) };
  }

  async updateMe(user: AuthenticatedUser, input: UpdateMeInput) {
    await this.me(user);

    const profile = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
      },
    });

    return { user: toUserResponse(profile) };
  }

  async deleteMe(user: AuthenticatedUser) {
    const existing = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("User not found.");
    }

    await this.assets.deleteAllForUser(user.id);
    await this.prisma.user.delete({ where: { id: user.id } });
    await this.auth.deleteUser(user.id);

    return { deleted: true };
  }
}

function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
