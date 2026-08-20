import Fastify from "fastify";
import cors from "@fastify/cors";
import { chromium } from "playwright";
import { z } from "zod";
import { type ResumeDocument } from "@resume-builder/core";

const server = Fastify({ logger: true });

await server.register(cors, { origin: true });

server.get("/health", async () => ({ ok: true }));

const measureRequestSchema = z.object({
  resume: z.unknown(),
  measureUrl: z.string().url().default("http://127.0.0.1:5173/?measure=1"),
});

server.post("/render/measure", async (request) => {
  const { resume, measureUrl } = measureRequestSchema.parse(request.body);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(measureUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.__resumeMeasure));

    return await page.evaluate(async (document) => {
      return window.__resumeMeasure!.measure(document as ResumeDocument);
    }, resume);
  } finally {
    await browser.close();
  }
});

server.post("/render/pdf", async (_request, reply) => {
  reply.code(501);
  return {
    error: "PDF rendering is not implemented yet",
    next: "Sprint 0 will wire headless Chromium parity fixtures here.",
  };
});

const port = Number(process.env.PORT ?? 4300);
await server.listen({ port, host: "127.0.0.1" });
