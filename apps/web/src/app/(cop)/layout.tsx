"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VISIONOS_COLORS } from "@visionos/shared";

export default function CopLayout({ children }: { children: any }) {
  const pathname = usePathname();

  const getTabStyle = (path: string) => {
    const isActive = pathname === path;
    return {
      color: VISIONOS_COLORS.TEXT_PRIMARY,
      textDecoration: "none",
      padding: "0.45rem 1rem",
      borderRadius: "6px",
      fontSize: "0.88rem",
      fontWeight: "600" as const,
      backgroundColor: isActive ? "rgba(212, 175, 55, 0.15)" : "rgba(255, 255, 255, 0.05)",
      border: isActive ? `1px solid ${VISIONOS_COLORS.LPU_GOLD}` : "1px solid rgba(255, 255, 255, 0.15)",
      transition: "all 0.2s"
    };
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: VISIONOS_COLORS.BACKGROUND_DARK }}>
      {/* Top Header Bar */}
      <header style={{ 
        backgroundColor: VISIONOS_COLORS.LPU_MAROON, 
        borderBottom: `2px solid ${VISIONOS_COLORS.LPU_GOLD}`, 
        padding: "1rem 2rem", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "1.4rem", color: VISIONOS_COLORS.TEXT_PRIMARY, fontWeight: "800", letterSpacing: "-0.5px" }}>
            VisionOS <span style={{ color: VISIONOS_COLORS.LPU_GOLD, fontWeight: "400" }}>Command & Operations Platform (COP)</span>
          </h1>
 
          {/* Navigation Tabs */}
          <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link
              href="/dashboard"
              style={getTabStyle("/dashboard")}
            >
              🌐 3D Digital Twin
            </Link>
            <Link
              href="/incidents"
              style={getTabStyle("/incidents")}
            >
              🚨 Field Dispatches & Incidents
            </Link>
            <Link
              href="/sustainability"
              style={getTabStyle("/sustainability")}
            >
              🌱 BMS HVAC & Energy Throttling
            </Link>
            <Link
              href="/swarm-audit"
              style={getTabStyle("/swarm-audit")}
            >
              🤖 Swarm Traceability Audit
            </Link>
          </nav>
        </div>

        <div style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.85rem", color: VISIONOS_COLORS.TEXT_PRIMARY, fontWeight: "700" }}>MARCUS VANCE</div>
            <div style={{ fontSize: "0.72rem", color: VISIONOS_COLORS.LPU_GOLD, fontWeight: "600", letterSpacing: "0.5px" }}>COMMANDER • ROLE_ORGANIZER</div>
          </div>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: VISIONOS_COLORS.NORMAL_GREEN, boxShadow: `0 0 10px ${VISIONOS_COLORS.NORMAL_GREEN}` }}></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: "2rem", flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}
