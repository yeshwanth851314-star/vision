/**
 * @visionos/web/components/cop/EmergencyEvacBanner.tsx
 * Emergency Evacuation Lockout Banner (`VIS-102`, `FR-EMR-002`).
 */

"use client";

import React from "react";
import type { CrowdAlertPayload} from "@visionos/shared";
import { VISIONOS_COLORS } from "@visionos/shared";

interface IEmergencyEvacBannerProps {
  alert: CrowdAlertPayload;
  onAcknowledge?: () => void;
}

export const EmergencyEvacBanner: React.FC<IEmergencyEvacBannerProps> = ({ alert }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: VISIONOS_COLORS.CRITICAL_RED,
        color: "#000000",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "3.5rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "1.5rem" }}>
        🚨 EMERGENCY EVACUATION PROTOCOL ACTIVE 🚨
      </h1>
      <p style={{ fontSize: "1.8rem", maxWidth: "800px", marginBottom: "2rem" }}>
        {alert.message}
      </p>
      <div
        style={{
          backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
          border: `3px solid ${VISIONOS_COLORS.LPU_GOLD}`,
          padding: "1.5rem 3rem",
          borderRadius: "12px",
        }}
      >
        <h2 style={{ color: VISIONOS_COLORS.LPU_GOLD, fontSize: "2rem", margin: 0 }}>
          RECOMMENDED ADA STEP-FREE SAFE EXIT: {alert.recommendedGate}
        </h2>
      </div>
    </div>
  );
};
