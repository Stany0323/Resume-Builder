import { z } from "zod";

export const assetKindSchema = z.enum([
  "profilePhoto",
  "institutionLogo",
  "companyLogo",
]);

export const uploadAssetSchema = z.object({
  dataUrl: z.string().startsWith("data:"),
  fileName: z.string().trim().min(1).max(140).optional(),
  kind: assetKindSchema,
});

export const replaceAssetSchema = uploadAssetSchema.extend({
  previousUrl: z.string().trim().min(1).optional(),
});

export const deleteAssetByUrlSchema = z.object({
  kind: assetKindSchema,
  url: z.string().trim().min(1),
});

export const listAssetsSchema = z.object({
  kind: assetKindSchema.optional(),
});

export type AssetKind = z.infer<typeof assetKindSchema>;
export type UploadAssetInput = z.infer<typeof uploadAssetSchema>;
export type ReplaceAssetInput = z.infer<typeof replaceAssetSchema>;
export type DeleteAssetByUrlInput = z.infer<typeof deleteAssetByUrlSchema>;
