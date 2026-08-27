import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ResumeDocument } from "@resume-builder/core";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { CreateResumeInput, SyncResumeInput } from "./resume.schemas.js";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class ResumesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthenticatedUser) {
    await this.ensureUser(user);

    const resumes = await this.prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        profileType: true,
        revision: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { resumes };
  }

  async create(user: AuthenticatedUser, input: CreateResumeInput) {
    await this.ensureUser(user);

    const document = input.document as unknown as ResumeDocument;
    const title = input.title ?? document.meta.title;

    const resume = await this.prisma.resume.create({
      data: {
        id: document.meta.id,
        userId: user.id,
        title,
        profileType: document.meta.profileType,
        designJson: toJson(document.design),
        personalJson: toJson(document.personal),
        contentJson: toJson(document.content),
        versions: {
          create: {
            revision: 1,
            snapshotJson: toJson(document),
          },
        },
      },
    });

    return { resume: this.toDocumentResponse(resume) };
  }

  async get(user: AuthenticatedUser, id: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId: user.id },
    });

    if (!resume) {
      throw new NotFoundException("Resume not found.");
    }

    return { resume: this.toDocumentResponse(resume) };
  }

  async sync(user: AuthenticatedUser, id: string, input: SyncResumeInput) {
    const existing = await this.prisma.resume.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      throw new NotFoundException("Resume not found.");
    }

    if (input.baseRevision && input.baseRevision !== existing.revision) {
      throw new ConflictException({
        message: "Resume has changed on the server.",
        serverRevision: existing.revision,
      });
    }

    const nextRevision = existing.revision + 1;
    const document = input.document as unknown as ResumeDocument;
    const title = input.title ?? document.meta.title;

    const resume = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.resume.update({
        where: { id },
        data: {
          title,
          profileType: document.meta.profileType,
          designJson: toJson(document.design),
          personalJson: toJson(document.personal),
          contentJson: toJson(document.content),
          revision: nextRevision,
        },
      });

      await tx.resumeVersion.create({
        data: {
          resumeId: id,
          revision: nextRevision,
          snapshotJson: toJson({
            ...document,
            meta: {
              ...document.meta,
              id,
              title,
              updatedAt: updated.updatedAt.toISOString(),
            },
          }),
        },
      });

      return updated;
    });

    return { resume: this.toDocumentResponse(resume) };
  }

  async versions(user: AuthenticatedUser, id: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!resume) {
      throw new NotFoundException("Resume not found.");
    }

    const versions = await this.prisma.resumeVersion.findMany({
      where: { resumeId: id },
      orderBy: { revision: "desc" },
      select: {
        id: true,
        revision: true,
        createdAt: true,
      },
    });

    return { versions };
  }

  private toDocumentResponse(resume: {
    id: string;
    title: string;
    profileType: ResumeDocument["meta"]["profileType"];
    designJson: unknown;
    personalJson: unknown;
    contentJson: unknown;
    revision: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: resume.id,
      revision: resume.revision,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      document: {
        schemaVersion: 2,
        meta: {
          id: resume.id,
          title: resume.title,
          updatedAt: resume.updatedAt.toISOString(),
          profileType: resume.profileType,
        },
        design: resume.designJson,
        personal: resume.personalJson,
        content: resume.contentJson,
      },
    };
  }

  private async ensureUser(user: AuthenticatedUser) {
    await this.prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email ?? `${user.id}@unknown.local`,
      },
      create: {
        id: user.id,
        email: user.email ?? `${user.id}@unknown.local`,
      },
    });
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
