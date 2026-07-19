/**
 * @visionos/api-gateway/routes/copRoutes.ts
 * REST route registration for Command Center (COP), CV Telemetry, Turnstile, BMS HVAC, and AI Router operations (`13_API_Specification.md`).
 */

import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import {
  getGateStatus,
  overrideGateLockout,
  ingestEdgeFrameTelemetry,
  createVolunteerDispatch,
  updateDispatchStatus,
  processTurnstileCheckin,
  executeHVACThrottling,
  executeAIRouterQuery,
  executeAISwarmLoop,
  checkinFan,
  getNavigationRoute,
  acknowledgeDispatch,
  triggerEmergency,
} from "../controllers/copController";
import { verifyJwtAuth, requireRoles } from "../middleware/authMiddleware";

export async function registerCopRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRequest", async (request, reply) => {
    const traceId = request.headers["x-trace-id"] || request.headers["X-Trace-Id"] || crypto.randomUUID();
    request.headers["x-trace-id"] = String(traceId);
    reply.header("X-Trace-Id", String(traceId));
  });
  // Gate Status & Override (`FR-COP-001`, `FR-EMR-002`)
  // Gate Status & Override (`FR-COP-001`, `FR-EMR-002`)
  fastify.get<{ Params: { gateId: string } }>("/api/v1/cop/gates/:gateId", { preHandler: verifyJwtAuth }, getGateStatus);
  fastify.post<{ Body: { gateId: string; lockout: boolean; reason: string } }>(
    "/api/v1/cop/gates/override",
    { preHandler: requireRoles("ROLE_ORGANIZER", "ROLE_RESPONDER") },
    overrideGateLockout
  );

  // High-frequency CV Telemetry Ingestion (`17_Computer_Vision_Pipeline.md`)
  fastify.post<{ Body: any }>("/api/v1/telemetry/frame", { preHandler: verifyJwtAuth }, ingestEdgeFrameTelemetry);

  // Volunteer Field Incident Dispatching (`FR-EMR-001`)
  fastify.post<{ Body: any }>("/api/v1/cop/dispatches", { preHandler: verifyJwtAuth }, createVolunteerDispatch);
  fastify.patch<{ Params: { id: string }; Body: { status: "PENDING" | "ACKNOWLEDGED" | "EN_ROUTE" | "RESOLVED" | "ESCALATED" } }>("/api/v1/cop/dispatches/:id/status", { preHandler: verifyJwtAuth }, updateDispatchStatus);

  // Dynamic ECDSA QR Pass Check-in (`FR-SEC-001`)
  fastify.post<{ Body: any }>("/api/v1/turnstile/checkin", { preHandler: verifyJwtAuth }, processTurnstileCheckin);

  // BACnet / Modbus BMS HVAC Throttling (`FR-SUS-001`)
  fastify.post<{ Body: { zoneId: string; targetAirflowPct: number; targetTempCelsius: number } }>(
    "/api/v1/bms/hvac/throttle",
    { preHandler: requireRoles("ROLE_ORGANIZER", "ROLE_RESPONDER") },
    executeHVACThrottling
  );

  // Three-Tier AI Router & LangGraph Agent Swarm (`14_AI_Architecture.md`, `15_Agent_Specifications.md`)
  fastify.post<{ Body: { queryText?: string; query?: string; requiresComplexReasoning?: boolean } }>("/api/v1/ai/route", { preHandler: verifyJwtAuth }, executeAIRouterQuery);
  fastify.post<{ Body: { zoneId: string; densityPerSqM: number; currentTempCelsius?: number; isADA?: boolean; incidentDescription?: string } }>(
    "/api/v1/ai/swarm/execute",
    { preHandler: requireRoles("ROLE_ORGANIZER", "ROLE_RESPONDER") },
    executeAISwarmLoop
  );

  // Approved fan/volunteer/API contracts from 13_API_Specification.md.
  fastify.post<{ Body: any }>("/api/v1/auth/checkin", { preHandler: requireRoles("ROLE_FAN", "ROLE_VOLUNTEER") }, checkinFan);
  fastify.post<{ Body: any }>("/api/v1/navigation/route", { preHandler: verifyJwtAuth }, getNavigationRoute);
  fastify.post<{ Body: any }>("/api/v1/dispatches/ack", { preHandler: requireRoles("ROLE_VOLUNTEER", "ROLE_ORGANIZER") }, acknowledgeDispatch);
  fastify.post<{ Body: any }>("/api/v1/cop/emergency/trigger", { preHandler: requireRoles("ROLE_ORGANIZER") }, triggerEmergency);
}
