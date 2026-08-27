import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const skills = [
  ["JavaScript", "Programming"],
  ["TypeScript", "Programming"],
  ["React", "Frontend"],
  ["Node.js", "Backend"],
  ["NestJS", "Backend"],
  ["PostgreSQL", "Database"],
  ["Prisma", "Database"],
  ["Microsoft Excel", "Productivity"],
  ["Power BI", "Analytics"],
  ["Data Analysis", "Analytics"],
  ["Project Management", "Operations"],
  ["Customer Service", "Operations"],
  ["Communication", "Professional"],
  ["Leadership", "Professional"],
  ["Problem Solving", "Professional"],
  ["Research", "Academic"],
  ["Report Writing", "Academic"],
  ["Risk Assessment", "Operations"],
  ["Payroll", "HR"],
  ["Recruitment", "HR"],
] as const;

async function main() {
  await prisma.approvedSkill.createMany({
    data: skills.map(([name, category]) => ({ category, name })),
    skipDuplicates: true,
  });
}

await main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
