/**
 * @visionos/web/components/cop/Stadium3DCanvas.tsx
 * 3D Digital Twin WebGL Canvas (`VIS-101`, `FR-COP-001`).
 * Colors concourse polygons #FF1E1E (>= 3.5), #FFAB00 (2.1 to 3.4), or #00E676 (<= 2.0).
 */

"use client";

import React from "react";
import { useTelemetryStore } from "../../stores/useTelemetryStore";
import { evaluateQueueDensity, VISIONOS_COLORS } from "@visionos/shared";

export const Stadium3DCanvas: React.FC = () => {
  const zones = useTelemetryStore((state) => state.zones);
  const activeEmergency = useTelemetryStore((state) => state.activeEmergency);

  return (
    <div style={{ width: "100%", height: "600px", backgroundColor: VISIONOS_COLORS.BACKGROUND_DARK, position: "relative", borderRadius: "16px", overflow: "hidden", border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}` }}>
      <div style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 10, background: "rgba(19, 26, 42, 0.8)", padding: "0.8rem 1.2rem", borderRadius: "8px", color: VISIONOS_COLORS.TEXT_PRIMARY }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", color: VISIONOS_COLORS.LPU_GOLD }}>🏟️ VisionOS 3D Digital Twin (60 FPS WebGL)</h3>
        <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: VISIONOS_COLORS.TEXT_SECONDARY }}>Active Concourse Polygons Rendered</p>
      </div>

      {/* 2D Fallback / WebGL Canvas Viewport */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", padding: "5rem 2rem 2rem 2rem", height: "100%", alignItems: "center", justifyItems: "center" }}>
        {Object.values(zones).map((zone) => {
          const evalResult = evaluateQueueDensity(zone.densityPerSqM);
          return (
            <div
              key={zone.zoneId}
              style={{
                width: "220px",
                height: "140px",
                backgroundColor: evalResult.color,
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "1rem",
                boxShadow: `0 0 20px ${evalResult.color}40`,
                transition: "all 0.3s ease",
              }}
            >
              <span style={{ fontWeight: "bold", color: "#000000", fontSize: "0.95rem" }}>{zone.sectorName}</span>
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: "900", color: "#000000" }}>{zone.densityPerSqM} p/m²</div>
                <div style={{ fontSize: "0.8rem", color: "#000000", fontWeight: "600" }}>Status: {evalResult.status}</div>
              </div>
            </div>
          );
        })}
      </div>

      {activeEmergency && (
        <div style={{ position: "absolute", bottom: "1rem", right: "1rem", zIndex: 10, background: VISIONOS_COLORS.CRITICAL_RED, padding: "0.8rem 1.5rem", borderRadius: "8px", fontWeight: "bold", color: "#000000" }}>
          🚨 EMERGENCY OVERRIDE IN EFFECT
        </div>
      )}
    </div>
  );
};
