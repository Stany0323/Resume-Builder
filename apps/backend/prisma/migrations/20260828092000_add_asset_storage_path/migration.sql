CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "resume_versions"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "assets"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "skills"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "assets"
ADD COLUMN IF NOT EXISTS "storage_path" TEXT;

UPDATE "assets"
SET "storage_path" = "url"
WHERE "storage_path" IS NULL;

ALTER TABLE "assets"
ALTER COLUMN "storage_path" SET NOT NULL;
