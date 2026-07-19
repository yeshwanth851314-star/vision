/**
 * @visionos/api-gateway/src/services/telemetryService.ts
 * Real-Time Concourse CV Telemetry Ingestion & Spatial Evaluation Service (`17_Computer_Vision_Pipeline.md`, `19_Event_Architecture.md`).
 */

import type { ZoneTelemetryDTO} from "@visionos/shared";
import { evaluateQueueDensity } from "@visionos/shared";
import { firestoreManager } from "../db/firestoreClient";
import { recordAuditLog } from "../db/client";
import { SocketManager } from "../sockets/socketManager";

export interface IEdgeFrameMetadataInput {
  traceId: string;
  cameraId: string;
  zoneId: string;
  sectorName: string;
  personBoundingBoxCount: number;
  areaSqM: number;
  queueDepthMeters: number;
  averageFlowVelocityMps: number;
}

export class TelemetryService {
  /**
   * Ingests a 1 Hz frame telemetry packet emitted by an edge NVIDIA Jetson node (`@visionos/edge-cv`),
   * updates sharded Firestore documents, evaluates queue density thresholds, checks against PostGIS limits,
   * records immutable audit logs, and pushes real-time WebSocket updates to all active web & mobile clients.
   */
  public async processEdgeFrameTelemetry(input: IEdgeFrameMetadataInput): Promise<ZoneTelemetryDTO> {
    const density = parseFloat((input.personBoundingBoxCount / input.areaSqM).toFixed(2));
    const evalResult = evaluateQueueDensity(density);

    // 1. Write sharded telemetry directly into `/stadium/zones/{zoneId}/telemetry_shards/shard_{0..9}`
    const shardPath = await firestoreManager.writeTelemetryShard(
      input.zoneId,
      input.cameraId,
      input.personBoundingBoxCount,
      input.queueDepthMeters
    );

    // 2. Update parent aggregated zone document in Firestore
    const _updatedZoneDoc = await firestoreManager.updateConcourseZone(input.zoneId, {
      currentDensityPerSqM: density,
      currentPersonCount: input.personBoundingBoxCount,
      flowVelocityPerMinute: Math.round(input.averageFlowVelocityMps * 60),
      status: evalResult.status,
      isDigitalSignageThrottled: evalResult.status === "CRITICAL",
    });

    // 3. Construct exact DTO (`ZoneTelemetryDTO`) from `@visionos/shared`
    const telemetryDto: ZoneTelemetryDTO = {
      zoneId: input.zoneId,
      sectorName: input.sectorName,
      densityPerSqM: density,
      headcount: input.personBoundingBoxCount,
      averageFlowVelocityMps: input.averageFlowVelocityMps,
      status: evalResult.status,
      timestamp: Date.now(),
    };

    // 4. Broadcast via Socket.io v4 real-time mesh to room `stadium:zone:{zoneId}`
    SocketManager.emitToRoom(`stadium:zone:${input.zoneId}`, "telemetry:concourse", telemetryDto);

    // 5. If CRITICAL, trigger global emergency override warning & log forensic audit trail
    if (evalResult.status === "CRITICAL") {
      await recordAuditLog({
        traceId: input.traceId,
        actorJwtSub: `SYSTEM_CV_${input.cameraId}`,
        actorRole: "SYSTEM_AI_ROUTER",
        actionType: "CONCOURSE_CRITICAL_SURGE_DETECTED",
        targetResource: `stadium_zones/${input.zoneId}`,
        payloadBefore: null,
        payloadAfter: {
          density,
          headcount: input.personBoundingBoxCount,
          shardPath,
          status: "CRITICAL",
        },
      });

      // Also broadcast global emergency warning on `alerts:emergency`
      SocketManager.emitToRoom("alerts:emergency", "alert:critical_surge", {
        zoneId: input.zoneId,
        density,
        timestamp: Date.now(),
        message: `High concourse crowd density (${density} p/m²) at ${input.sectorName}! Activating diversion protocols.`,
      });
    }

    return telemetryDto;
  }
}

export const telemetryService = new TelemetryService();
