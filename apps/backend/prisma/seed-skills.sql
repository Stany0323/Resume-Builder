CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "skills"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

INSERT INTO "skills" ("name", "category", "approved")
VALUES
  ('JavaScript', 'Programming', true),
  ('TypeScript', 'Programming', true),
  ('React', 'Frontend', true),
  ('Node.js', 'Backend', true),
  ('NestJS', 'Backend', true),
  ('PostgreSQL', 'Database', true),
  ('Prisma', 'Database', true),
  ('Microsoft Excel', 'Productivity', true),
  ('Power BI', 'Analytics', true),
  ('Data Analysis', 'Analytics', true),
  ('Project Management', 'Operations', true),
  ('Customer Service', 'Operations', true),
  ('Communication', 'Professional', true),
  ('Leadership', 'Professional', true),
  ('Problem Solving', 'Professional', true),
  ('Research', 'Academic', true),
  ('Report Writing', 'Academic', true),
  ('Risk Assessment', 'Operations', true),
  ('Payroll', 'HR', true),
  ('Recruitment', 'HR', true)
ON CONFLICT ("name") DO UPDATE
SET
  "category" = EXCLUDED."category",
  "approved" = EXCLUDED."approved";
