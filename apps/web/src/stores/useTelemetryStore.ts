/**
 * @visionos/web/stores/useTelemetryStore.ts
 * Zustand client state store managing live concourse density, turnstile counts, and emergency alerts (`21_State_Management.md`).
 */

import { create } from "zustand";
import type { ZoneTelemetryDTO, CrowdAlertPayload } from "@visionos/shared";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

export interface ITurnstileEvent {
  sectorCode: string;
  entryGateCode: string;
  checkedInAt: string;
}

export interface ITelemetryState {
  zones: Record<string, ZoneTelemetryDTO>;
  activeEmergency: CrowdAlertPayload | null;
  turnstileCheckins: Record<string, number>;
  socket: Socket | null;
  isConnected: boolean;
  updateZoneTelemetry: (telemetry: ZoneTelemetryDTO) => void;
  setEmergencyOverride: (alert: CrowdAlertPayload | null) => void;
  recordTurnstileCheckin: (sectorCode: string) => void;
  connectSocketMesh: (gatewayUrl?: string, token?: string) => void;
  disconnectSocketMesh: () => void;
}

export const useTelemetryStore = create<ITelemetryState>((set, get) => ({
  zones: {
    CONCOURSE_B4_EAST: {
      zoneId: "CONCOURSE_B4_EAST",
      sectorName: "Gate B4 East Concourse",
      densityPerSqM: 1.8,
      headcount: 420,
      averageFlowVelocityMps: 1.2,
      status: "NORMAL",
      timestamp: Date.now(),
    },
    CONCOURSE_B4_WEST: {
      zoneId: "CONCOURSE_B4_WEST",
      sectorName: "Gate B4 West Concourse",
      densityPerSqM: 2.4,
      headcount: 580,
      averageFlowVelocityMps: 0.9,
      status: "WARNING",
      timestamp: Date.now(),
    },
    CONCOURSE_W2_ADA: {
      zoneId: "CONCOURSE_W2_ADA",
      sectorName: "Gate W2 Step-Free Corridor",
      densityPerSqM: 1.1,
      headcount: 140,
      averageFlowVelocityMps: 1.4,
      status: "NORMAL",
      timestamp: Date.now(),
    },
    VIP_SUITE_GOLD: {
      zoneId: "VIP_SUITE_GOLD",
      sectorName: "VIP Gold Lounge & Suites",
      densityPerSqM: 0.6,
      headcount: 85,
      averageFlowVelocityMps: 0.5,
      status: "NORMAL",
      timestamp: Date.now(),
    },
    UPPER_RING_NORTH: {
      zoneId: "UPPER_RING_NORTH",
      sectorName: "Upper Tier North Ring",
      densityPerSqM: 1.9,
      headcount: 610,
      averageFlowVelocityMps: 1.1,
      status: "NORMAL",
      timestamp: Date.now(),
    },
  },
  activeEmergency: null,
  turnstileCheckins: {
    SECTOR_112: 1240,
    SECTOR_114: 980,
    VIP_SUITE_A: 65,
  },
  socket: null,
  isConnected: false,

  updateZoneTelemetry: (telemetry) =>
    set((state) => ({
      zones: {
        ...state.zones,
        [telemetry.zoneId]: telemetry,
      },
    })),

  setEmergencyOverride: (alert) => set({ activeEmergency: alert }),

  recordTurnstileCheckin: (sectorCode) =>
    set((state) => ({
      turnstileCheckins: {
        ...state.turnstileCheckins,
        [sectorCode]: (state.turnstileCheckins[sectorCode] || 0) + 1,
      },
    })),

  connectSocketMesh: (gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8080", token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJDT01NQU5ERVJfVkFOQ0UiLCJyb2xlIjoiQ09NTUFOREVSIn0.signature") => {
    if (get().socket) return;

    const socket = io(gatewayUrl, {
      auth: { token },
      path: "/api/v1/realtime/mesh",
      transports: ["websocket"],
      reconnectionAttempts: 15,
      reconnectionDelay: 100,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    socket.on("connect", () => {
      console.log("[COP Telemetry Store] Connected to real-time mesh gateway:", socket.id);
      set({ isConnected: true });
    });

    socket.on("disconnect", () => {
      console.log("[COP Telemetry Store] Disconnected from mesh gateway.");
      set({ isConnected: false });
    });

    socket.on("telemetry:concourse", (telemetry: ZoneTelemetryDTO) => {
      get().updateZoneTelemetry(telemetry);
    });

    socket.on("alert:critical_surge", (alertPayload: { alertId?: string, zoneId: string, density: number, message: string, timestamp: number }) => {
      get().setEmergencyOverride({
        alertId: alertPayload.alertId || crypto.randomUUID(),
        zoneId: alertPayload.zoneId,
        severity: "CRITICAL",
        densityDetected: alertPayload.density,
        recommendedGate: "GATE_W2",
        message: alertPayload.message,
        timestamp: alertPayload.timestamp,
      });
    });

    socket.on("EMERGENCY_OVERRIDE", (payload: { overrideId?: string, targetSectorId?: string, evacuationTargetSafeGate: string, instructions: string }) => {
      get().setEmergencyOverride({
        alertId: payload.overrideId || crypto.randomUUID(),
        zoneId: payload.targetSectorId || "GLOBAL_STADIUM",
        severity: "EMERGENCY_OVERRIDE",
        densityDetected: 0,
        recommendedGate: payload.evacuationTargetSafeGate,
        message: payload.instructions,
        timestamp: Date.now(),
      });
    });

    socket.on("telemetry:turnstile", (event: ITurnstileEvent) => {
      get().recordTurnstileCheckin(event.sectorCode);
    });

    set({ socket });
  },

  disconnectSocketMesh: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
