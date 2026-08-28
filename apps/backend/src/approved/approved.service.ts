import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service.js";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;

@Injectable()
export class ApprovedService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async searchSkills(query = "", limit = DEFAULT_LIMIT) {
    const take = clampLimit(limit);
    const where = {
      approved: true,
      ...(query.trim()
        ? {
            name: {
              contains: query.trim(),
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const skills = await this.prisma.approvedSkill.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take,
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    return { skills };
  }

  async createSkill(input: {
    name: string;
    category?: string | null;
    approved?: boolean;
  }) {
    try {
      const skill = await this.prisma.approvedSkill.create({
        data: {
          name: input.name,
          category: input.category ?? null,
          approved: input.approved ?? true,
        },
      });

      return { skill };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("Skill already exists.");
      }

      throw error;
    }
  }

  async updateSkill(
    id: string,
    input: Partial<{
      name: string;
      category: string | null;
      approved: boolean;
    }>,
  ) {
    try {
      const skill = await this.prisma.approvedSkill.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.approved !== undefined ? { approved: input.approved } : {}),
        },
      });

      return { skill };
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException("Skill not found.");
      }

      if (isUniqueConstraintError(error)) {
        throw new ConflictException("Skill already exists.");
      }

      throw error;
    }
  }

  async deleteSkill(id: string) {
    try {
      await this.prisma.approvedSkill.delete({ where: { id } });
      return { deleted: true };
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new NotFoundException("Skill not found.");
      }

      throw error;
    }
  }
}

function clampLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
