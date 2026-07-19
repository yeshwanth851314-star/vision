/**
 * @visionos/api-gateway/src/services/bmsService.ts
 * Industrial BACnet / Modbus HVAC & Signage Automation Service (`FR-SUS-001`, `11_Backend_Schema.md`).
 * Features resilient in-memory fallback when PostGIS database is offline during local hosting.
 */

import type { BMSCommand } from "@visionos/shared";
import { prisma, recordAuditLog } from "../db/client";
import { SocketManager } from "../sockets/socketManager";

export class BMSService {
  private inMemoryHvac: Map<string, any> = new Map([
    ["CONCOURSE_B4_EAST", { id: "hvac_sim_01", zoneId: "CONCOURSE_B4_EAST", bacnetDeviceId: 104, currentAirflowPct: 100, currentTempCelsius: 21.0, isThrottled: false, zone: { zoneCode: "CONCOURSE_B4_EAST" } }]
  ]);

  /**
   * Evaluates concourse thermal & airflow demands, updates relational `bms_hvac_zones` in PostGIS or local memory,
   * constructs standard `BMSCommand` payload, logs audit trail, and pushes command to bridge room.
   */
  public async executeHVACThrottling(params: {
    traceId: string;
    zoneId: string;
    targetAirflowPct: number;
    targetTempCelsius: number;
    actorJwtSub: string;
  }): Promise<BMSCommand> {
    let existingHvac: any;
    let updatedHvac: any;

    try {
      existingHvac = await prisma.bmsHvacZone.findUnique({
        where: { zoneId: params.zoneId },
      });
      if (existingHvac) {
        updatedHvac = await prisma.bmsHvacZone.update({
          where: { zoneId: params.zoneId },
          data: {
            currentAirflowPct: params.targetAirflowPct,
            currentTempCelsius: params.targetTempCelsius,
            isThrottled: params.targetAirflowPct < 100,
            throttledAt: params.targetAirflowPct < 100 ? new Date() : null,
          },
          include: { zone: true },
        });
      }
    } catch (_err) {
      // Offline / Local memory fallback
      existingHvac = this.inMemoryHvac.get(params.zoneId) || {
        id: `hvac_${params.zoneId}`,
        zoneId: params.zoneId,
        bacnetDeviceId: 104,
        currentAirflowPct: 100,
        currentTempCelsius: 21.0,
        isThrottled: false,
        zone: { zoneCode: params.zoneId },
      };
      updatedHvac = {
        ...existingHvac,
        currentAirflowPct: params.targetAirflowPct,
        currentTempCelsius: params.targetTempCelsius,
        isThrottled: params.targetAirflowPct < 100,
        throttledAt: params.targetAirflowPct < 100 ? new Date() : null,
      };
      this.inMemoryHvac.set(params.zoneId, updatedHvac);
    }

    if (!updatedHvac) {
      updatedHvac = {
        id: `hvac_${params.zoneId}`,
        zoneId: params.zoneId,
        bacnetDeviceId: 104,
        currentAirflowPct: params.targetAirflowPct,
        currentTempCelsius: params.targetTempCelsius,
        isThrottled: params.targetAirflowPct < 100,
        throttledAt: params.targetAirflowPct < 100 ? new Date() : null,
        zone: { zoneCode: params.zoneId },
      };
      this.inMemoryHvac.set(params.zoneId, updatedHvac);
    }

    const command: BMSCommand = {
      commandId: crypto.randomUUID(),
      protocol: "BACNET",
      targetDeviceNumber: String(updatedHvac.bacnetDeviceId || 104),
      property: "PRESENT_VALUE",
      value: `${params.targetAirflowPct}% @ ${params.targetTempCelsius}°C`,
      timestamp: Date.now(),
    };

    await recordAuditLog({
      traceId: params.traceId,
      actorJwtSub: params.actorJwtSub,
      actorRole: "SYSTEM_AI_SUSTAINABILITY",
      actionType: "BMS_HVAC_AIRFLOW_THROTTLED",
      targetResource: `bms_hvac_zones/${updatedHvac.id}`,
      payloadBefore: existingHvac ? {
        airflowPct: existingHvac.currentAirflowPct,
        tempCelsius: existingHvac.currentTempCelsius,
      } : null,
      payloadAfter: {
        airflowPct: updatedHvac.currentAirflowPct,
        tempCelsius: updatedHvac.currentTempCelsius,
        commandSent: command,
      },
    });

    SocketManager.emitToRoom("stadium:bms:commands", "bms:command_issued", {
      zoneCode: updatedHvac.zone?.zoneCode || params.zoneId,
      command,
      timestamp: Date.now(),
    });

    return command;
  }
}

export const bmsService = new BMSService();
