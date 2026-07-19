/**
 * @visionos/api-gateway/middleware/authMiddleware.ts
 * JWT RBAC and authentication validation (`20_WebSocket_Flow.md` & `22_Security_Model.md`).
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { HTTP_STATUS } from "@visionos/shared";
import type { VisionRole } from "./auth";
import { verifyVisionToken } from "./auth";

export async function verifyJwtAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(HTTP_STATUS.UNAUTHORIZED).send({
      error: "Unauthorized: Missing or invalid Bearer token",
    });
    return;
  }
  const token = authHeader.split(" ")[1];
  const claims = token ? verifyVisionToken(token) : null;
  if (!claims) {
    reply.status(HTTP_STATUS.UNAUTHORIZED).send({
      error: "Unauthorized: Invalid, expired, or unverifiable bearer token",
    });
    return;
  }
  request.user = claims;
}

export function requireRoles(...roles: VisionRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await verifyJwtAuth(request, reply);
    if (reply.sent) return;
    if (!request.user || !roles.includes(request.user.role)) {
      reply.status(HTTP_STATUS.FORBIDDEN).send({ error: "Forbidden: insufficient role for this operation" });
    }
  };
}
