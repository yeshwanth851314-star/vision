/* eslint-disable */
/**
 * @visionos/web/app/incidents/page.tsx
 * Commander COP Field Dispatches & Incident Control Panel (`FR-COP-002`, `VIS-102`).
 * Source of Truth: 03_UI_UX_Design_System.md & 15_Agent_Specifications.md
 */

"use client";

import React, { useState } from "react";
import { VISIONOS_COLORS } from "@visionos/shared";
import { useTelemetryStore } from "../../../stores/useTelemetryStore";

interface IDispatchItem {
  id: string;
  ticketCode: string;
  category: "CROWD_CONTROL" | "MEDICAL_ASSIST" | "SECURITY_BREACH" | "VIP_ESCORT" | "FACILITY_MAINTAIN";
  priority: "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW";
  zoneId: string;
  sectorName: string;
  assignedVolunteerName: string;
  assignedVolunteerRole: string;
  status: "ASSIGNED" | "EN_ROUTE" | "ON_SCENE" | "RESOLVED";
  createdAtUtc: string;
  notes: string;
}

const INITIAL_DISPATCHES: IDispatchItem[] = [
  {
    id: "dsp_842",
    ticketCode: "VOL-842",
    category: "CROWD_CONTROL",
    priority: "P0_CRITICAL",
    zoneId: "CONCOURSE_B4_EAST",
    sectorName: "Gate B4 East Concourse",
    assignedVolunteerName: "Sarah Jenkins",
    assignedVolunteerRole: "ROLE_VOLUNTEER (Steward Team Lead)",
    status: "ON_SCENE",
    createdAtUtc: new Date(Date.now() - 1000 * 60 * 6).toLocaleTimeString(),
    notes: "Density surge > 3.6 p/m². Directing overflow toward Gate W2 ADA corridor via flashing chevron override.",
  },
  {
    id: "dsp_819",
    ticketCode: "VOL-819",
    category: "FACILITY_MAINTAIN",
    priority: "P1_HIGH",
    zoneId: "CONCOURSE_W2_ADA",
    sectorName: "Gate W2 Step-Free Corridor",
    assignedVolunteerName: "Carlos Rivera",
    assignedVolunteerRole: "ROLE_VOLUNTEER (Rapid Response)",
    status: "RESOLVED",
    createdAtUtc: new Date(Date.now() - 1000 * 60 * 18).toLocaleTimeString(),
    notes: "Spill cleanup finalized near Elevator #3. Floor surface anti-slip checked.",
  },
  {
    id: "dsp_795",
    ticketCode: "VOL-795",
    category: "VIP_ESCORT",
    priority: "P2_MEDIUM",
    zoneId: "VIP_SUITE_GOLD",
    sectorName: "VIP Gold Lounge & Suites",
    assignedVolunteerName: "Amina Patel",
    assignedVolunteerRole: "ROLE_VOLUNTEER (Hospitality)",
    status: "EN_ROUTE",
    createdAtUtc: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString(),
    notes: "Escorting FIFA Executive Delegation from private turnstile to Level 3 Presidential Box.",
  },
];

export default function IncidentsPage() {
  const [dispatches, setDispatches] = useState<IDispatchItem[]>(INITIAL_DISPATCHES);
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isSimulatingDispatch, setIsSimulatingDispatch] = useState<boolean>(false);

  const handleCreateAutonomousDispatch = () => {
    setIsSimulatingDispatch(true);
    setTimeout(() => {
      const newDispatch: IDispatchItem = {
        id: `dsp_${Math.floor(100 + Math.random() * 900)}`,
        ticketCode: `VOL-${Math.floor(850 + Math.random() * 150)}`,
        category: "CROWD_CONTROL",
        priority: "P0_CRITICAL",
        zoneId: "CONCOURSE_B4_WEST",
        sectorName: "Gate B4 West Concourse",
        assignedVolunteerName: "David Kim",
        assignedVolunteerRole: "ROLE_VOLUNTEER (Steward Sector 4)",
        status: "ASSIGNED",
        createdAtUtc: new Date().toLocaleTimeString(),
        notes: "Autonomous DispatchAgent assignment: Edge CV detected localized bottleneck velocity drop (0.4 m/s).",
      };
      setDispatches([newDispatch, ...dispatches]);
      setIsSimulatingDispatch(false);
    }, 600);
  };

  const handleStatusChange = (id: string, newStatus: IDispatchItem["status"]) => {
    setDispatches(
      dispatches.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const filteredDispatches = dispatches.filter((item) => {
    if (filterPriority !== "ALL" && item.priority !== filterPriority) return false;
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
    return true;
  });

  const getPriorityColor = (priority: IDispatchItem["priority"]) => {
    switch (priority) {
      case "P0_CRITICAL":
        return VISIONOS_COLORS.CRITICAL_RED;
      case "P1_HIGH":
        return VISIONOS_COLORS.WARNING_AMBER;
      default:
        return VISIONOS_COLORS.AR_CHEVRON_CYAN;
    }
  };

  const getStatusColor = (status: IDispatchItem["status"]) => {
    switch (status) {
      case "RESOLVED":
        return VISIONOS_COLORS.NORMAL_GREEN;
      case "ON_SCENE":
        return VISIONOS_COLORS.AR_CHEVRON_CYAN;
      case "EN_ROUTE":
        return VISIONOS_COLORS.WARNING_AMBER;
      default:
        return VISIONOS_COLORS.TEXT_SECONDARY;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.8rem" }}>
      {/* Top Action & Filter Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", margin: 0, color: VISIONOS_COLORS.TEXT_PRIMARY, fontWeight: "900" }}>
            Field Volunteer Dispatches & Hazard Management (`FR-COP-002`)
          </h2>
          <p style={{ margin: "0.3rem 0 0", color: VISIONOS_COLORS.TEXT_SECONDARY, fontSize: "0.9rem" }}>
            Live ticket orchestration across 80 concourse zones driven by LangGraph <strong style={{ color: VISIONOS_COLORS.LPU_GOLD }}>DispatchAgent</strong>.
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div>
            <label
              htmlFor="filter-priority-select"
              style={{ fontSize: "0.8rem", color: VISIONOS_COLORS.TEXT_SECONDARY, display: "block", marginBottom: "0.3rem" }}
            >
              Filter Priority:
            </label>
            <select
              id="filter-priority-select"
              aria-label="Filter incidents by priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{
                backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
                color: VISIONOS_COLORS.TEXT_PRIMARY,
                border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}`,
                padding: "0.5rem 0.8rem",
                borderRadius: "6px",
                fontWeight: "600",
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="P0_CRITICAL">P0 Critical Only</option>
              <option value="P1_HIGH">P1 High Only</option>
              <option value="P2_MEDIUM">P2 Medium Only</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-status-select"
              style={{ fontSize: "0.8rem", color: VISIONOS_COLORS.TEXT_SECONDARY, display: "block", marginBottom: "0.3rem" }}
            >
              Filter Status:
            </label>
            <select
              id="filter-status-select"
              aria-label="Filter incidents by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
                color: VISIONOS_COLORS.TEXT_PRIMARY,
                border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}`,
                padding: "0.5rem 0.8rem",
                borderRadius: "6px",
                fontWeight: "600",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="ON_SCENE">On Scene</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <button
            onClick={handleCreateAutonomousDispatch}
            disabled={isSimulatingDispatch}
            className="transition-all duration-200 hover:border-white active:scale-95 active:shadow-[0_0_25px_rgba(212,175,55,0.55)]"
            style={{
              backgroundColor: VISIONOS_COLORS.LPU_MAROON,
              color: VISIONOS_COLORS.LPU_GOLD,
              border: `2px solid ${VISIONOS_COLORS.LPU_GOLD}`,
              padding: "0.6rem 1.4rem",
              borderRadius: "8px",
              fontWeight: "800",
              cursor: isSimulatingDispatch ? "not-allowed" : "pointer",
              boxShadow: "0 4px 15px rgba(212, 175, 55, 0.2)",
            }}
          >
            {isSimulatingDispatch ? "⚡ DispatchAgent Triaging..." : "🚨 + Trigger Autonomous Dispatch"}
          </button>
        </div>
      </div>

      {/* Dispatches Table */}
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
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>TICKET ID</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>SECTOR & ZONE</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>CATEGORY & PRIORITY</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>ASSIGNED VOLUNTEER</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>STATUS & ACTION</th>
              <th style={{ padding: "1.1rem 1.4rem", color: VISIONOS_COLORS.LPU_GOLD, fontSize: "0.85rem", fontWeight: "800" }}>AUTONOMOUS SWARM NOTES</th>
            </tr>
          </thead>
          <tbody>
            {filteredDispatches.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: VISIONOS_COLORS.TEXT_SECONDARY }}>
                  No active dispatches matching the current filters. Concourse operations nominal.
                </td>
              </tr>
            ) : (
              filteredDispatches.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", transition: "background 0.2s" }}>
                  <td style={{ padding: "1.2rem 1.4rem" }}>
                    <div style={{ fontWeight: "900", color: VISIONOS_COLORS.TEXT_PRIMARY }}>{item.ticketCode}</div>
                    <div style={{ fontSize: "0.75rem", color: VISIONOS_COLORS.TEXT_SECONDARY }}>{item.createdAtUtc}</div>
                  </td>
                  <td style={{ padding: "1.2rem 1.4rem" }}>
                    <div style={{ fontWeight: "700", color: VISIONOS_COLORS.TEXT_PRIMARY }}>{item.sectorName}</div>
                    <div style={{ fontSize: "0.78rem", color: VISIONOS_COLORS.AR_CHEVRON_CYAN, fontFamily: "monospace" }}>{item.zoneId}</div>
                  </td>
                  <td style={{ padding: "1.2rem 1.4rem" }}>
                    <div style={{ fontWeight: "800", color: getPriorityColor(item.priority), display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: getPriorityColor(item.priority) }}></span>
                      {item.priority}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: VISIONOS_COLORS.TEXT_SECONDARY }}>{item.category}</div>
                  </td>
                  <td style={{ padding: "1.2rem 1.4rem" }}>
                    <div style={{ fontWeight: "700", color: VISIONOS_COLORS.TEXT_PRIMARY }}>{item.assignedVolunteerName}</div>
                    <div style={{ fontSize: "0.78rem", color: VISIONOS_COLORS.TEXT_SECONDARY }}>{item.assignedVolunteerRole}</div>
                  </td>
                  <td style={{ padding: "1.2rem 1.4rem" }}>
                    <select
                      aria-label="Change ticket status"
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as IDispatchItem["status"])}
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        color: getStatusColor(item.status),
                        border: `1px solid ${getStatusColor(item.status)}`,
                        padding: "0.4rem 0.7rem",
                        borderRadius: "6px",
                        fontWeight: "800",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="EN_ROUTE">EN ROUTE</option>
                      <option value="ON_SCENE">ON SCENE</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </td>
                  <td style={{ padding: "1.2rem 1.4rem", maxWidth: "320px", fontSize: "0.85rem", color: VISIONOS_COLORS.TEXT_PRIMARY, lineHeight: "1.4" }}>
                    {item.notes}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
