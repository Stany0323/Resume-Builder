import Fastify from "fastify";
import cors from "@fastify/cors";

const server = Fastify({ logger: true });

await server.register(cors, { origin: true });

server.get("/health", async () => ({ ok: true }));

server.post("/render/pdf", async (_request, reply) => {
  reply.code(501);
  return {
    error: "PDF rendering is not implemented yet",
    next: "Sprint 0 will wire headless Chromium parity fixtures here.",
  };
});

const port = Number(process.env.PORT ?? 4300);
await server.listen({ port, host: "127.0.0.1" });
