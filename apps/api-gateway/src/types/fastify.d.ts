import type { VisionClaims } from "../middleware/auth";
import type { SocketManager } from "../sockets/socketManager";

declare module "fastify" {
  interface FastifyRequest {
    user?: VisionClaims;
  }
  interface FastifyInstance {
    socketManager: SocketManager | null;
  }
}
