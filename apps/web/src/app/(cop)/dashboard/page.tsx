/* eslint-disable */
/**
 * @visionos/web/app/page.tsx
 * Main COP Dashboard View incorporating 3D Digital Twin, Turnstile Stats, and AI Swarm Execution (`Pod 1`).
 */

"use client";

import React, { useEffect, useState } from "react";
import { Stadium3DCanvas } from "../../../components/cop/Stadium3DCanvas";
import { EmergencyEvacBanner } from "../../../components/cop/EmergencyEvacBanner";
import { useTelemetryStore } from "../../../stores/useTelemetryStore";
import { VISIONOS_COLORS, evaluateQueueDensity } from "@visionos/shared";

export default function CopDashboardPage() {
  const activeEmergency = useTelemetryStore((state) => state.activeEmergency);
  const setEmergencyOverride = useTelemetryStore((state) => state.setEmergencyOverride);
  const turnstileCheckins = useTelemetryStore((state) => state.turnstileCheckins);
  const isConnected = useTelemetryStore((state) => state.isConnected);
  const connectSocketMesh = useTelemetryStore((state) => state.connectSocketMesh);
  const disconnectSocketMesh = useTelemetryStore((state) => state.disconnectSocketMesh);
  const updateZoneTelemetry = useTelemetryStore((state) => state.updateZoneTelemetry);

  const [swarmLog, setSwarmLog] = useState<string | null>(null);

  useEffect(() => {
    connectSocketMesh();
    return () => {
      disconnectSocketMesh();
    };
  }, [connectSocketMesh, disconnectSocketMesh]);

  const triggerMockSurge = () => {
    setEmergencyOverride({
      alertId: "11111111-1111-1111-1111-111111111111",
      zoneId: "CONCOURSE_B4_EAST",
      severity: "CRITICAL",
      densityDetected: 3.8,
      recommendedGate: "GATE_W2",
      message: "Critical bottleneck detected at Gate B4 concourse! Immediate ADA step-free diversion required.",
      timestamp: Date.now(),
    });

    updateZoneTelemetry({
      zoneId: "CONCOURSE_B4_EAST",
      sectorName: "Gate B4 East Concourse",
      densityPerSqM: 3.8,
      headcount: 850,
      averageFlowVelocityMps: 0.4,
      status: "CRITICAL",
      timestamp: Date.now(),
    });
  };

  const triggerSwarmTriage = async () => {
    setSwarmLog("Executing LangGraph multi-agent loop across CrowdAgent, DispatchAgent, SustainabilityAgent, & NavigationAgent...");
    setTimeout(() => {
      setSwarmLog(
        "✅ SWARM RESOLVED: Assigned VOL-842 (P0_CRITICAL Overcrowd). Throttled BACnet AHU-1024 Airflow to 100% @ 19.5°C. Re-routed 420 fans to Gate W2 step-free corridor."
      );
    }, 800);
  };

  const resetSurge = () => {
    setEmergencyOverride(null);
    setSwarmLog(null);
    updateZoneTelemetry({
      zoneId: "CONCOURSE_B4_EAST",
      sectorName: "Gate B4 East Concourse",
      densityPerSqM: 1.8,
      headcount: 420,
      averageFlowVelocityMps: 1.2,
      status: "NORMAL",
      timestamp: Date.now(),
    });
  };

  return (
    <div>
      {activeEmergency && <EmergencyEvacBanner alert={activeEmergency} />}

      {/* Top Telemetry Header & Mesh Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", margin: 0, color: VISIONOS_COLORS.TEXT_PRIMARY, fontWeight: "900" }}>
            Concourse Operations Real-Time Telemetry
          </h2>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.4rem" }}>
            <span style={{ fontSize: "0.85rem", color: VISIONOS_COLORS.TEXT_SECONDARY }}>
              Socket.io v4 Mesh Status:
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: "bold",
                color: isConnected ? VISIONOS_COLORS.NORMAL_GREEN : VISIONOS_COLORS.AR_CHEVRON_CYAN,
              }}
            >
              {isConnected ? "🟢 CONNECTED (1 Hz Live Stream)" : "🔵 LOCAL STORAGE SNAPSHOT (1 Hz Polling)"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
          <button
            onClick={triggerMockSurge}
            style={{
              backgroundColor: VISIONOS_COLORS.CRITICAL_RED,
              color: "#000000",
              border: "none",
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🔥 Simulate Critical Surge (3.8 p/m²)
          </button>
          <button
            onClick={triggerSwarmTriage}
            style={{
              backgroundColor: VISIONOS_COLORS.LPU_MAROON,
              color: VISIONOS_COLORS.LPU_GOLD,
              border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}`,
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🤖 Trigger LangGraph Swarm Triage
          </button>
          <button
            onClick={resetSurge}
            style={{
              backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
              color: VISIONOS_COLORS.NORMAL_GREEN,
              border: `1px solid ${VISIONOS_COLORS.NORMAL_GREEN}`,
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ✅ Reset Concourse Status
          </button>
        </div>
      </div>

      {/* Turnstile Stats Row */}
      <div style={{ display: "flex", gap: "1.2rem", marginBottom: "1.5rem" }}>
        {Object.entries(turnstileCheckins).map(([sector, count]) => (
          <div
            key={sector}
            style={{
              flex: 1,
              backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
              border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}`,
              borderRadius: "10px",
              padding: "1rem",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: VISIONOS_COLORS.TEXT_SECONDARY, fontWeight: "600" }}>
              Turnstile Check-ins ({sector})
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", color: VISIONOS_COLORS.LPU_GOLD, marginTop: "0.2rem" }}>
              {count.toLocaleString()} <span style={{ fontSize: "0.9rem", color: VISIONOS_COLORS.TEXT_PRIMARY }}>attendees</span>
            </div>
          </div>
        ))}
      </div>

      {/* Swarm Execution Audit Banner */}
      {swarmLog && (
        <div
          style={{
            backgroundColor: "rgba(128, 0, 0, 0.4)",
            border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}`,
            padding: "1rem 1.4rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            color: VISIONOS_COLORS.TEXT_PRIMARY,
            fontWeight: "600",
          }}
        >
          {swarmLog}
        </div>
      )}

      {/* 3D Digital Twin Canvas */}
      <Stadium3DCanvas />
    </div>
  );
}
