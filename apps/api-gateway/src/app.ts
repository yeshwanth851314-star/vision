import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { registerCopRoutes } from "./routes/copRoutes";
import type { SocketManager } from "./sockets/socketManager";

export async function buildApp() {
  const fastify = Fastify({
    logger: false, // Disable logging in tests
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  });

  const isProd = process.env.NODE_ENV === "production";
  const originsEnv = process.env.ALLOWED_ORIGINS;

  if (isProd) {
    if (!originsEnv || originsEnv.trim() === "" || originsEnv.split(",").map(o => o.trim()).includes("*")) {
      throw new Error("CORS configuration error: ALLOWED_ORIGINS environment variable is required and cannot be a wildcard '*' in production.");
    }
  }

  const allowedOrigins = originsEnv ? originsEnv.split(",").map(o => o.trim()) : ["http://localhost:3000", "http://localhost:5173"];

  await fastify.register(cors, {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Trace-Id"],
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  fastify.decorate("socketManager", null as unknown as SocketManager | null);

  await registerCopRoutes(fastify);

  fastify.get("/health", async () => {
    return { status: "UP", service: "api-gateway", timestamp: Date.now() };
  });

  return fastify;
}
