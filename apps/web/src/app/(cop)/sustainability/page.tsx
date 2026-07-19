/**
 * @visionos/web/app/sustainability/page.tsx
 * BMS HVAC Airflow & Energy Throttling Control Panel (`FR-SUS-001`, `VIS-601`).
 * Source of Truth: 15_Agent_Specifications.md & 19_Event_Architecture.md
 */

"use client";

import React, { useState } from "react";
import { VISIONOS_COLORS } from "@visionos/shared";

interface IBacnetAhuItem {
  id: string;
  ahuCode: string;
  vlanId: number;
  zoneId: string;
  sectorName: string;
  currentOccupancy: number;
  zeroOccupancyDurationMinutes: number;
  airflowPercentage: number;
  supplyAirTempCelsius: number;
  powerConsumptionKw: number;
  mode: "NORMAL_100_CFM" | "THROTTLED_50_CFM" | "EMERGENCY_PURGE_100_CFM";
  lastCommandedBy: string;
}

const INITIAL_AHUS: IBacnetAhuItem[] = [
  {
    id: "ahu_1024",
    ahuCode: "BACnet-AHU-1024",
    vlanId: 104,
    zoneId: "CONCOURSE_B4_EAST",
    sectorName: "Gate B4 East Concourse",
    currentOccupancy: 850,
    zeroOccupancyDurationMinutes: 0,
    airflowPercentage: 100,
    supplyAirTempCelsius: 19.5,
    powerConsumptionKw: 42.8,
    mode: "NORMAL_100_CFM",
    lastCommandedBy: "SustainabilityAgent (Active Surge Compensation)",
  },
  {
    id: "ahu_1025",
    ahuCode: "BACnet-AHU-1025",
    vlanId: 104,
    zoneId: "CONCOURSE_B4_WEST",
    sectorName: "Gate B4 West Concourse",
    currentOccupancy: 580,
    zeroOccupancyDurationMinutes: 0,
    airflowPercentage: 100,
    supplyAirTempCelsius: 20.0,
    powerConsumptionKw: 38.5,
    mode: "NORMAL_100_CFM",
    lastCommandedBy: "BMS Schedule (Match-Day Active)",
  },
  {
    id: "ahu_1088",
    ahuCode: "BACnet-AHU-1088",
    vlanId: 104,
    zoneId: "VIP_SUITE_GOLD",
    sectorName: "VIP Gold Lounge & Suites",
    currentOccupancy: 0,
    zeroOccupancyDurationMinutes: 22,
    airflowPercentage: 50,
    supplyAirTempCelsius: 23.5,
    powerConsumptionKw: 18.2,
    mode: "THROTTLED_50_CFM",
    lastCommandedBy: "SustainabilityAgent (Zero-Occupancy Airflow Throttled)",
  },
  {
    id: "ahu_1102",
    ahuCode: "BACnet-AHU-1102",
    vlanId: 104,
    zoneId: "CONCOURSE_W2_ADA",
    sectorName: "Gate W2 Step-Free Corridor",
    currentOccupancy: 140,
    zeroOccupancyDurationMinutes: 0,
    airflowPercentage: 100,
    supplyAirTempCelsius: 20.2,
    powerConsumptionKw: 31.0,
    mode: "NORMAL_100_CFM",
    lastCommandedBy: "BMS Schedule (Match-Day Active)",
  },
];

export default function SustainabilityPage() {
  const [ahus, setAhus] = useState<IBacnetAhuItem[]>(INITIAL_AHUS);
  const [isSimulatingThrottling, setIsSimulatingThrottling] = useState<boolean>(false);

  const totalPowerKw = ahus.reduce((sum, item) => sum + item.powerConsumptionKw, 0);
  const throttledAhusCount = ahus.filter((item) => item.mode === "THROTTLED_50_CFM").length;
  const estimatedHourlyCarbonReductionKg = throttledAhusCount * 14.5; // ~14.5 kg CO2/hr per throttled AHU

  const handleSimulateZeroOccupancyThrottle = () => {
    setIsSimulatingThrottling(true);
    setTimeout(() => {
      setAhus(
        ahus.map((item) => {
          if (item.ahuCode === "BACnet-AHU-1102") {
            return {
              ...item,
              currentOccupancy: 0,
              zeroOccupancyDurationMinutes: 16,
              airflowPercentage: 50,
              supplyAirTempCelsius: 23.0,
              powerConsumptionKw: 15.4,
              mode: "THROTTLED_50_CFM",
              lastCommandedBy: "SustainabilityAgent (Zero-Occupancy Auto-Throttled)",
            };
          }
          return item;
        })
      );
      setIsSimulatingThrottling(false);
    }, 600);
  };

  const handleManualOverrideMode = (id: string, mode: IBacnetAhuItem["mode"]) => {
    setAhus(
      ahus.map((item) => {
        if (item.id === id) {
          const isThrottled = mode === "THROTTLED_50_CFM";
          return {
            ...item,
            mode,
            airflowPercentage: isThrottled ? 50 : 100,
            supplyAirTempCelsius: isThrottled ? 23.5 : 19.5,
            powerConsumptionKw: isThrottled ? 17.5 : 40.2,
            lastCommandedBy: "Commander Marcus Vance (Manual COP Override)",
          };
        }
        return item;
      })
    );
  };

  const getModeBadgeColor = (mode: IBacnetAhuItem["mode"]) => {
    switch (mode) {
      case "THROTTLED_50_CFM":
        return VISIONOS_COLORS.NORMAL_GREEN;
      case "EMERGENCY_PURGE_100_CFM":
        return VISIONOS_COLORS.CRITICAL_RED;
      default:
        return VISIONOS_COLORS.AR_CHEVRON_CYAN;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.8rem" }}>
      {/* Top Header & Energy KPI Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", margin: 0, color: VISIONOS_COLORS.TEXT_PRIMARY, fontWeight: "900" }}>
            BMS HVAC Airflow & Energy Throttling Mesh (`FR-SUS-001`)
          </h2>
          <p style={{ margin: "0.3rem 0 0", color: VISIONOS_COLORS.TEXT_SECONDARY, fontSize: "0.9rem" }}>
            BACnet/IP (`VLAN 104`) supply airflow modulation driven autonomously by <strong style={{ color: VISIONOS_COLORS.NORMAL_GREEN }}>SustainabilityAgent</strong>.
          </p>
        </div>

        <button
          onClick={handleSimulateZeroOccupancyThrottle}
          disabled={isSimulatingThrottling}
          className="transition-all duration-200 hover:opacity-90 active:scale-95 active:shadow-[0_0_25px_rgba(0,255,204,0.65)]"
          style={{
            backgroundColor: VISIONOS_COLORS.NORMAL_GREEN,
            color: VISIONOS_COLORS.BACKGROUND_DARK,
            border: "none",
            padding: "0.7rem 1.4rem",
            borderRadius: "8px",
            fontWeight: "900",
            cursor: isSimulatingThrottling ? "not-allowed" : "pointer",
            boxShadow: "0 4px 15px rgba(0, 230, 118, 0.25)",
          }}
        >
          {isSimulatingThrottling ? "⚡ SustainabilityAgent Writing BACnet..." : "🌱 Simulate 15-Min Zero Occupancy Throttling (`AHU-1102` -> 50% CFM)"}
        </button>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
            border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}`,
            borderRadius: "12px",
            padding: "1.2rem 1.5rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: VISIONOS_COLORS.TEXT_SECONDARY, fontWeight: "700" }}>
            TOTAL CONCOURSE HVAC LOAD
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "900", color: VISIONOS_COLORS.LPU_GOLD, marginTop: "0.4rem" }}>
            {totalPowerKw.toFixed(1)} <span style={{ fontSize: "1.1rem", color: VISIONOS_COLORS.TEXT_PRIMARY }}>kW</span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
            border: `1px solid ${VISIONOS_COLORS.NORMAL_GREEN}`,
            borderRadius: "12px",
            padding: "1.2rem 1.5rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: VISIONOS_COLORS.TEXT_SECONDARY, fontWeight: "700" }}>
            ACTIVE THROTTLED AHUS (50% CFM)
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "900", color: VISIONOS_COLORS.NORMAL_GREEN, marginTop: "0.4rem" }}>
            {throttledAhusCount} <span style={{ fontSize: "1.1rem", color: VISIONOS_COLORS.TEXT_PRIMARY }}>of {ahus.length} units</span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
            border: `1px solid ${VISIONOS_COLORS.AR_CHEVRON_CYAN}`,
            borderRadius: "12px",
            padding: "1.2rem 1.5rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: VISIONOS_COLORS.TEXT_SECONDARY, fontWeight: "700" }}>
            EST. CARBON FOOTPRINT REDUCTION
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "900", color: VISIONOS_COLORS.AR_CHEVRON_CYAN, marginTop: "0.4rem" }}>
            {estimatedHourlyCarbonReductionKg.toFixed(1)} <span style={{ fontSize: "1.1rem", color: VISIONOS_COLORS.TEXT_PRIMARY }}>kg CO₂ / hr</span>
          </div>
        </div>
      </div>

      {/* BACnet AHU Table */}
      <div
        style={{
          backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
          border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}`,
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "rgba(128, 0, 0, 0.3)", borderBottom: `1px solid ${VISIONOS_COLORS.LPU_GOLD}` }}>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>BACNET UNIT & VLAN</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>CONCOURSE ZONE</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>OCCUPANCY & DURATION</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>AIRFLOW & TEMP</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>THROTTLE MODE (`CFM`)</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>COMMAND AUDIT TRAIL</th>
            </tr>
          </thead>
          <tbody>
            {ahus.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", transition: "background 0.2s" }}>
                <td style={{ padding: "1.2rem 1.4rem" }}>
                  <div style={{ fontWeight: "900", color: VISIONOS_COLORS.TEXT_PRIMARY }}>{item.ahuCode}</div>
                  <div style={{ fontSize: "0.78rem", color: VISIONOS_COLORS.TEXT_SECONDARY }}>VLAN {item.vlanId} (`bacstack`)</div>
                </td>
                <td style={{ padding: "1.2rem 1.4rem" }}>
                  <div style={{ fontWeight: "700", color: VISIONOS_COLORS.TEXT_PRIMARY }}>{item.sectorName}</div>
                  <div style={{ fontSize: "0.78rem", color: VISIONOS_COLORS.AR_CHEVRON_CYAN, fontFamily: "monospace" }}>{item.zoneId}</div>
                </td>
                <td style={{ padding: "1.2rem 1.4rem" }}>
                  <div style={{ fontWeight: "800", color: item.currentOccupancy === 0 ? VISIONOS_COLORS.NORMAL_GREEN : VISIONOS_COLORS.TEXT_PRIMARY }}>
                    {item.currentOccupancy.toLocaleString()} attendees
                  </div>
                  <div style={{ fontSize: "0.78rem", color: VISIONOS_COLORS.TEXT_SECONDARY }}>
                    Zero-Occ Duration: {item.zeroOccupancyDurationMinutes}m
                  </div>
                </td>
                <td style={{ padding: "1.2rem 1.4rem" }}>
                  <div style={{ fontWeight: "900", color: item.airflowPercentage === 50 ? VISIONOS_COLORS.NORMAL_GREEN : VISIONOS_COLORS.TEXT_PRIMARY }}>
                    {item.airflowPercentage}% Supply CFM
                  </div>
                  <div style={{ fontSize: "0.78rem", color: VISIONOS_COLORS.TEXT_SECONDARY }}>
                    {item.supplyAirTempCelsius}°C • {item.powerConsumptionKw} kW
                  </div>
                </td>
                <td style={{ padding: "1.2rem 1.4rem" }}>
                  <select
                    aria-label="Change manual override mode"
                    value={item.mode}
                    onChange={(e) => handleManualOverrideMode(item.id, e.target.value as IBacnetAhuItem["mode"])}
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      color: getModeBadgeColor(item.mode),
                      border: `1px solid ${getModeBadgeColor(item.mode)}`,
                      padding: "0.4rem 0.7rem",
                      borderRadius: "6px",
                      fontWeight: "800",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    <option value="NORMAL_100_CFM">NORMAL (100% CFM)</option>
                    <option value="THROTTLED_50_CFM">THROTTLED (50% CFM)</option>
                    <option value="EMERGENCY_PURGE_100_CFM">EMERGENCY PURGE (100% CFM)</option>
                  </select>
                </td>
                <td style={{ padding: "1.2rem 1.4rem", maxWidth: "300px", fontSize: "0.85rem", color: VISIONOS_COLORS.TEXT_PRIMARY, lineHeight: "1.4" }}>
                  {item.lastCommandedBy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
