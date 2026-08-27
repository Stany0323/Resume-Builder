import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;

@Injectable()
export class ApprovedService {
  constructor(private readonly prisma: PrismaService) {}

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

  async searchCertifications(query = "", limit = DEFAULT_LIMIT) {
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

    const certifications = await this.prisma.approvedCertification.findMany({
      where,
      orderBy: [{ name: "asc" }, { provider: "asc" }],
      take,
      select: {
        id: true,
        name: true,
        provider: true,
      },
    });

    return { certifications };
  }
}

function clampLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
}
