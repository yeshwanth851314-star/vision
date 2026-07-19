/**
 * @visionos/api-gateway server entry point
 * Orchestrates Fastify HTTP server, Socket.io real-time gateway, and PostgreSQL/PostGIS connection pool with graceful shutdown.
 */

import { buildApp } from "./app";
import { SocketManager } from "./sockets/socketManager";
import { prisma } from "./db/client";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const HOST = process.env.HOST || "0.0.0.0";

async function bootstrap() {
  const fastify = await buildApp();

  await fastify.ready();
  const socketManager = new SocketManager(fastify.server);
  (fastify as any).socketManager = socketManager;

  const address = await fastify.listen({ port: PORT, host: HOST });
  console.log(`[VisionOS API Gateway] Server listening on ${address}`);

  // Graceful shutdown with Prisma connection pool cleanup
  const shutdown = async (signal: string) => {
    console.log(`[VisionOS API Gateway] Received ${signal}. Shutting down gracefully...`);
    await fastify.close();
    await prisma.$disconnect();
    console.log("[VisionOS API Gateway] Prisma DB connection pool closed.");
    process.exit(0);
  };

  process.on("SIGINT", () => { void shutdown("SIGINT"); });
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
}

bootstrap().catch(async (err) => {
  console.error("[VisionOS API Gateway] Fatal startup failure:", err);
  await prisma.$disconnect();
  process.exit(1);
});
