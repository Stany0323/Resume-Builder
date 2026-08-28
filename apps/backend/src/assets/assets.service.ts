import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma.service.js";
import type { AssetKind, DeleteAssetByUrlInput, ReplaceAssetInput, UploadAssetInput } from "./asset.schemas.js";

const BUCKETS: Record<AssetKind, string> = {
  companyLogo: "company-logos",
  institutionLogo: "institution-logos",
  profilePhoto: "profile-photos",
};

@Injectable()
export class AssetsService {
  private readonly storage: SupabaseClient;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    }

    this.storage = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async list(user: AuthenticatedUser, kind?: AssetKind) {
    const assets = await this.prisma.asset.findMany({
      where: {
        userId: user.id,
        ...(kind ? { kind } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        url: true,
        storagePath: true,
        createdAt: true,
      },
    });

    return {
      assets: assets.map((asset) => ({
        ...asset,
        createdAt: asset.createdAt.toISOString(),
      })),
    };
  }

  async upload(user: AuthenticatedUser, input: UploadAssetInput) {
    const uploaded = await this.uploadToStorage(user.id, input);
    const asset = await this.prisma.asset.create({
      data: {
        kind: input.kind,
        storagePath: uploaded.storagePath,
        url: uploaded.url,
        userId: user.id,
      },
    });

    return { asset: serializeAsset(asset, uploaded.storagePath) };
  }

  async replace(user: AuthenticatedUser, input: ReplaceAssetInput) {
    const previous = input.previousUrl
      ? await this.prisma.asset.findFirst({
          where: {
            kind: input.kind,
            url: input.previousUrl,
            userId: user.id,
          },
        })
      : null;

    const uploaded = await this.uploadToStorage(user.id, input);

    const asset = previous
      ? await this.prisma.asset.update({
          data: {
            storagePath: uploaded.storagePath,
            url: uploaded.url,
          },
          where: { id: previous.id },
        })
      : await this.prisma.asset.create({
          data: {
            kind: input.kind,
            storagePath: uploaded.storagePath,
            url: uploaded.url,
            userId: user.id,
          },
        });

    await this.removePreviousAsset(user.id, input.kind, previous, input.previousUrl);

    return { asset: serializeAsset(asset, uploaded.storagePath) };
  }

  async deleteByUrl(user: AuthenticatedUser, input: DeleteAssetByUrlInput) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        kind: input.kind,
        url: input.url,
        userId: user.id,
      },
    });

    if (!asset) {
      const deleted = await this.removeStorageUrlForUser(user.id, input.kind, input.url);
      return { deleted };
    }

    await this.deleteAssetRecord(asset);
    return { deleted: true };
  }

  private async uploadToStorage(userId: string, input: UploadAssetInput) {
    const parsed = parseDataUrl(input.dataUrl);
    const bucket = BUCKETS[input.kind];
    const extension = extensionForMime(parsed.mimeType);
    const safeName = slugFileName(input.fileName ?? input.kind);
    const storagePath = `${userId}/${input.kind}/${crypto.randomUUID()}-${safeName}.${extension}`;

    await this.ensureBucket(bucket);

    const { error } = await this.storage.storage.from(bucket).upload(storagePath, parsed.buffer, {
      contentType: parsed.mimeType,
      upsert: false,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const { data } = this.storage.storage.from(bucket).getPublicUrl(storagePath);

    return {
      storagePath,
      url: data.publicUrl,
    };
  }

  async delete(user: AuthenticatedUser, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, userId: user.id },
    });

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    await this.deleteAssetRecord(asset);

    return { deleted: true };
  }

  async deleteAllForUser(userId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { userId },
      select: {
        kind: true,
        storagePath: true,
      },
    });

    const byBucket = new Map<string, string[]>();
    for (const asset of assets) {
      const bucket = BUCKETS[asset.kind as AssetKind];
      if (!bucket) {
        continue;
      }

      byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), asset.storagePath]);
    }

    await Promise.all([...byBucket.entries()].map(([bucket, paths]) => this.removeFromBucket(bucket, paths)));
  }

  private async deleteAssetRecord(asset: { id: string; kind: string; storagePath?: string; url?: string }) {
    if (asset.storagePath) {
      await this.removeFromStorage(asset.kind, [asset.storagePath]);
    } else if (asset.url) {
      await this.removeStorageUrl(asset.kind, asset.url);
    }
    await this.prisma.asset.delete({ where: { id: asset.id } });
  }

  private async removePreviousAsset(
    userId: string,
    kind: AssetKind,
    asset: { kind: string; storagePath?: string } | null,
    previousUrl?: string,
  ) {
    if (asset?.storagePath) {
      await this.removeFromStorage(asset.kind, [asset.storagePath]);
      return true;
    }

    if (!previousUrl) {
      return false;
    }

    return this.removeStorageUrlForUser(userId, kind, previousUrl);
  }

  private async removeStorageUrlForUser(userId: string, kind: AssetKind, url: string) {
    const bucket = BUCKETS[kind];
    const storagePath = storagePathFromPublicUrl(bucket, url);

    if (!storagePath || !storagePath.startsWith(`${userId}/`)) {
      return false;
    }

    await this.removeFromBucket(bucket, [storagePath]);
    return true;
  }

  private async removeStorageUrl(kind: string, url: string) {
    const bucket = BUCKETS[kind as AssetKind];

    if (!bucket) {
      return false;
    }

    const storagePath = storagePathFromPublicUrl(bucket, url);

    if (!storagePath) {
      return false;
    }

    await this.removeFromBucket(bucket, [storagePath]);
    return true;
  }

  private async removeFromStorage(kind: string, paths: string[]) {
    const bucket = BUCKETS[kind as AssetKind];

    if (!bucket || paths.length === 0) {
      return;
    }

    await this.removeFromBucket(bucket, paths);
  }

  private async removeFromBucket(bucket: string, paths: string[]) {
    const { error } = await this.storage.storage.from(bucket).remove(paths);

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  private async ensureBucket(bucket: string) {
    const { data } = await this.storage.storage.getBucket(bucket);

    if (data) {
      return;
    }

    await this.storage.storage.createBucket(bucket, {
      public: true,
    });
  }
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);

  if (!match) {
    throw new BadRequestException("Asset must be a base64 data URL.");
  }

  return {
    buffer: Buffer.from(match[2], "base64"),
    mimeType: match[1],
  };
}

function extensionForMime(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/svg+xml":
      return "svg";
    case "image/webp":
      return "webp";
    default:
      throw new BadRequestException("Unsupported asset file type.");
  }
}

function slugFileName(value: string) {
  const slug = value
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "asset";
}

function storagePathFromPublicUrl(bucket: string, value: string) {
  try {
    const url = new URL(value);
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    const signedPrefix = `/storage/v1/object/sign/${bucket}/`;
    const prefix = url.pathname.startsWith(publicPrefix)
      ? publicPrefix
      : url.pathname.startsWith(signedPrefix)
        ? signedPrefix
        : null;

    if (!prefix) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

function serializeAsset(asset: {
  id: string;
  kind: string;
  url: string;
  createdAt: Date;
}, storagePath: string) {
  return {
    id: asset.id,
    kind: asset.kind,
    storagePath,
    url: asset.url,
    createdAt: asset.createdAt.toISOString(),
  };
}
