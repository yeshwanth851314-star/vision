/**
 * @visionos/api-gateway/controllers/copController.ts
 * Command Center (COP), CV Telemetry, Turnstile Check-in, BMS HVAC, and AI Swarm HTTP Controllers.
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { IGateObserver} from "@visionos/shared";
import { HTTP_STATUS, CheckInRequestSchema, RouteRequestSchema, DispatchAckSchema, EmergencyTriggerSchema } from "@visionos/shared";
import type { IEdgeFrameMetadataInput } from "../services/telemetryService";
import { telemetryService } from "../services/telemetryService";
import type { ICreateDispatchInput } from "../services/dispatchService";
import { dispatchService } from "../services/dispatchService";
import type { ITurnstileCheckinInput } from "../services/checkinService";
import { checkinService } from "../services/checkinService";
import { bmsService } from "../services/bmsService";
import { recordAuditLog } from "../db/client";
import { aiRouter, swarmOrchestrator } from "@visionos/ai-router";
import { calculateRoute } from "../services/navigationService";
import { firestoreManager } from "../db/firestoreClient";
import { SocketManager } from "../sockets/socketManager";

const mockGates: Record<string, IGateObserver> = {
  GATE_B4: {
    gateId: "GATE_B4",
    gateNumber: "B4",
    isOpen: true,
    isLockedOut: false,
    throughputPerMinute: 85,
    queueTimeMinutes: 4.2,
  },
  GATE_W2: {
    gateId: "GATE_W2",
    gateNumber: "W2",
    isOpen: true,
    isLockedOut: false,
    throughputPerMinute: 40,
    queueTimeMinutes: 1.1,
  },
};

export async function getGateStatus(request: FastifyRequest<{ Params: { gateId: string } }>, reply: FastifyReply) {
  const { gateId } = request.params;
  const gate = mockGates[gateId];
  if (!gate) {
    return reply.status(HTTP_STATUS.NOT_FOUND).send({ error: `Gate ${gateId} not found` });
  }
  return reply.status(HTTP_STATUS.OK).send(gate);
}

export async function overrideGateLockout(
  request: FastifyRequest<{ Body: { gateId: string; lockout: boolean; reason: string } }>,
  reply: FastifyReply
) {
  const { gateId, lockout, reason } = request.body;
  const gate = mockGates[gateId];
  if (!gate) {
    return reply.status(HTTP_STATUS.NOT_FOUND).send({ error: `Gate ${gateId} not found` });
  }
  gate.isLockedOut = lockout;
  gate.isOpen = !lockout;

  const userSub = request.user?.sub || "COMMANDER_VANCE_LOCAL";
  const userRole = request.user?.role || "ROLE_ORGANIZER";

  await recordAuditLog({
    traceId: `trace_override_${Date.now()}`,
    actorJwtSub: userSub,
    actorRole: userRole,
    actionType: lockout ? "GATE_EMERGENCY_LOCKOUT" : "GATE_NORMAL_UNLOCK",
    targetResource: `gates/${gateId}`,
    payloadBefore: { isLockedOut: !lockout },
    payloadAfter: { isLockedOut: lockout, reason },
    ipAddress: request.ip,
  });

  return reply.status(HTTP_STATUS.OK).send({
    success: true,
    gate,
    timestamp: Date.now(),
  });
}

export async function ingestEdgeFrameTelemetry(
  request: FastifyRequest<{ Body: IEdgeFrameMetadataInput }>,
  reply: FastifyReply
) {
  try {
    const result = await telemetryService.processEdgeFrameTelemetry(request.body);
    return reply.status(HTTP_STATUS.OK).send(result);
  } catch (err: any) {
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
}

export async function createVolunteerDispatch(
  request: FastifyRequest<{ Body: ICreateDispatchInput }>,
  reply: FastifyReply
) {
  try {
    const userSub = request.user?.sub || "COMMANDER_VANCE_LOCAL";
    const userRole = request.user?.role || "ROLE_ORGANIZER";
    const result = await dispatchService.createFieldDispatch({
      ...request.body,
      actorJwtSub: userSub,
      actorRole: userRole,
    });
    return reply.status(HTTP_STATUS.CREATED).send(result);
  } catch (err: any) {
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
}

export async function updateDispatchStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: { status: "PENDING" | "ACKNOWLEDGED" | "EN_ROUTE" | "RESOLVED" | "ESCALATED" } }>,
  reply: FastifyReply
) {
  try {
    const userSub = request.user?.sub || "VOLUNTEER_LOCAL";
    const result = await dispatchService.updateDispatchStatus({
      dispatchId: request.params.id,
      newStatus: request.body.status,
      actorJwtSub: userSub,
      traceId: `trace_dispatch_update_${Date.now()}`,
    });
    return reply.status(HTTP_STATUS.OK).send(result);
  } catch (err: any) {
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
}

export async function processTurnstileCheckin(
  request: FastifyRequest<{ Body: ITurnstileCheckinInput }>,
  reply: FastifyReply
) {
  try {
    const userSub = request.user?.sub || "SYSTEM_TURNSTILE_B4";
    const result = await checkinService.processTurnstileCheckin({
      ...request.body,
      actorJwtSub: userSub,
    });
    const statusCode = result.success ? HTTP_STATUS.OK : (result.isAlreadyCheckedIn ? HTTP_STATUS.CONFLICT : HTTP_STATUS.UNAUTHORIZED);
    return reply.status(statusCode).send(result);
  } catch (err: any) {
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
}

export async function executeHVACThrottling(
  request: FastifyRequest<{ Body: { zoneId: string; targetAirflowPct: number; targetTempCelsius: number } }>,
  reply: FastifyReply
) {
  try {
    const userSub = request.user?.sub || "COMMANDER_VANCE_LOCAL";
    const result = await bmsService.executeHVACThrottling({
      traceId: `trace_bms_${Date.now()}`,
      zoneId: request.body.zoneId,
      targetAirflowPct: request.body.targetAirflowPct,
      targetTempCelsius: request.body.targetTempCelsius,
      actorJwtSub: userSub,
    });
    return reply.status(HTTP_STATUS.OK).send(result);
  } catch (err: any) {
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
}

/**
 * POST /api/v1/ai/route
 * Routes user queries across Tier 1 (ScaNN), Tier 2 (Flash), and Tier 3 (Pro).
 */
export async function executeAIRouterQuery(
  request: FastifyRequest<{ Body: { queryText?: string; query?: string; requiresComplexReasoning?: boolean } }>,
  reply: FastifyReply
) {
  try {
    const queryStr = request.body.queryText || request.body.query || "";
    const userRole = request.user?.role || "ROLE_FAN";
    const userSub = request.user?.sub || "";
    const result = await aiRouter.routeQuery(
      queryStr,
      request.body.requiresComplexReasoning,
      {
        traceId: (request.headers["x-trace-id"] as string) || `trace_ai_${Date.now()}`,
        userRole,
        actorJwtSub: userSub,
      }
    );
    return reply.status(HTTP_STATUS.OK).send(result);
  } catch (err: any) {
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
}

/**
 * POST /api/v1/ai/swarm/execute
 * Triggers autonomous LangGraph multi-agent loop over a concourse zone event.
 */
export async function executeAISwarmLoop(
  request: FastifyRequest<{ Body: { zoneId: string; densityPerSqM: number; currentTempCelsius?: number; isADA?: boolean; incidentDescription?: string } }>,
  reply: FastifyReply
) {
  try {
    const result = await swarmOrchestrator.executeSwarmLoop({
      traceId: `trace_swarm_${Date.now()}`,
      zoneId: request.body.zoneId,
      densityPerSqM: request.body.densityPerSqM,
      currentTempCelsius: request.body.currentTempCelsius,
      isADA: request.body.isADA,
      incidentDescription: request.body.incidentDescription,
    });
    return reply.status(HTTP_STATUS.OK).send(result);
  } catch (err: any) {
    return reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
}

export async function checkinFan(request: FastifyRequest, reply: FastifyReply) {
  const parsed = CheckInRequestSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: "Invalid check-in payload", details: parsed.error.flatten() });
  const result = await checkinService.processTurnstileCheckin({
    traceId: `trace_checkin_${Date.now()}`,
    ticketBarcodeHash: parsed.data.ticketBarcodeHash,
    entryGateCode: parsed.data.entryGateCode || "GATE_B4",
    actorJwtSub: request.user?.sub || "",
  });
  if (!result.success) return reply.status(result.isAlreadyCheckedIn ? HTTP_STATUS.CONFLICT : HTTP_STATUS.UNAUTHORIZED).send(result);
  return reply.status(HTTP_STATUS.OK).send({
    checkInStatus: "VERIFIED_ACTIVE",
    assignedSectorCode: result.sectorCode,
    seatPortalCode: "PORTAL_B4_LEVEL_1",
    offlineGraphPayloadUrl: "/api/v1/navigation/offline-graph",
    offlineTicketToken: "demo-token-issued-at-checkin",
    serverTimeUtc: new Date().toISOString(),
  });
}

export async function getNavigationRoute(request: FastifyRequest, reply: FastifyReply) {
  const parsed = RouteRequestSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: "Invalid routing payload", details: parsed.error.flatten() });
  return reply.status(HTTP_STATUS.OK).send(calculateRoute(parsed.data));
}

export async function acknowledgeDispatch(request: FastifyRequest, reply: FastifyReply) {
  const parsed = DispatchAckSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: "Invalid dispatch acknowledgment", details: parsed.error.flatten() });
  const result = await dispatchService.updateDispatchStatus({
    dispatchId: parsed.data.dispatchId,
    newStatus: parsed.data.status,
    actorJwtSub: request.user?.sub || "",
    traceId: `trace_dispatch_ack_${Date.now()}`,
  });
  return reply.status(HTTP_STATUS.OK).send({ dispatchId: result.id, updatedStatus: result.status, acknowledgedAtUtc: new Date().toISOString() });
}

export async function triggerEmergency(request: FastifyRequest, reply: FastifyReply) {
  const parsed = EmergencyTriggerSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(HTTP_STATUS.BAD_REQUEST).send({ error: "Invalid emergency payload", details: parsed.error.flatten() });
  const overrideId = `override_${parsed.data.emergencyType}_${Date.now()}`;
  const globalEmergencyType = parsed.data.emergencyType === "CROWD_CRUSH_HAZARD" ? "CRITICAL_SURGE" : parsed.data.emergencyType === "STRUCTURAL_COMPROMISE" || parsed.data.emergencyType === "WEAPON_DETECTED" ? "SECURITY" : "FIRE";
  await firestoreManager.updateGlobalState({ isEmergencyEvacActive: true, emergencyType: globalEmergencyType, evacuationTargetSafeGate: parsed.data.evacuationTargetSafeGate, isGreenCorridorModeActive: true });
  const payload = { overrideId, ...parsed.data, isStepFreeVerified: true, instructions: `EVACUATE IMMEDIATELY TOWARD ${parsed.data.evacuationTargetSafeGate}. Follow staff instructions.` };
  SocketManager.emitToRoom("global:stadium", "EMERGENCY_OVERRIDE", payload);
  SocketManager.emitToRoom("alerts:emergency", "EMERGENCY_OVERRIDE", payload);
  await recordAuditLog({ traceId: `trace_emergency_${Date.now()}`, actorJwtSub: request.user?.sub || "", actorRole: request.user?.role || "", actionType: "EMERGENCY_OVERRIDE_TRIGGERED", targetResource: `sectors/${parsed.data.targetSectorId}`, payloadBefore: null, payloadAfter: payload, ipAddress: request.ip });
  return reply.status(HTTP_STATUS.CREATED).send({ overrideId, globalStateStatus: "CRITICAL_EMERGENCY", dispatchedGreenCorridors: [`CORRIDOR_${parsed.data.evacuationTargetSafeGate}_ENTRY_PATH`], affectedDeviceCountEstimate: 0, broadcastTimestampUtc: new Date().toISOString() });
}
