/**
 * @visionos/mobile/app/index.tsx
 * Dual-Persona Mobile Experience (`Fan Mateo Vance` & `Volunteer Sarah Jenkins`).
 * Covers: Dynamic ECDSA QR Ticket (`FR-SEC-001`), Offline AR Wayfinding (`FR-NAV-001`), Multilingual PTT Concierge (`FR-LAN-001`), and Field Dispatch Response (`FR-COP-002`).
 * Source of Truth: 05_User_Personas.md & 33_Demo_Guide.md
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { ARNavigationOverlay } from "../components/navigation/ARNavigationOverlay";
import { useNavigationStore } from "../services/useNavigationStore";
import { VISIONOS_COLORS } from "@visionos/shared";

interface IVolunteerTicket {
  id: string;
  code: string;
  priority: "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM";
  category: string;
  zone: string;
  instructions: string;
  status: "ASSIGNED" | "EN_ROUTE" | "ON_SCENE" | "RESOLVED";
}

export default function MobileHomeScreen() {
  // Persona State ('ROLE_FAN' Mateo vs 'ROLE_VOLUNTEER' Sarah)
  const [activePersona, setActivePersona] = useState<"FAN" | "VOLUNTEER">("FAN");

  // Fan Persona State
  const [showAR, setShowAR] = useState<boolean>(false);
  const [isADA, setIsADA] = useState<boolean>(false);
  const [checkinStatus, setCheckinStatus] = useState<"READY" | "SCANNING" | "CHECKED_IN">("READY");
  const [aiQueryResponse, setAiQueryResponse] = useState<string | null>(null);
  const [isPttRecording, setIsPttRecording] = useState<boolean>(false);

  // Volunteer Persona State
  const [volunteerTickets, setVolunteerTickets] = useState<IVolunteerTicket[]>([
    {
      id: "t_842",
      code: "VOL-842",
      priority: "P0_CRITICAL",
      category: "CROWD_SURGE_DIVERSION",
      zone: "CONCOURSE_B4_EAST",
      instructions: "Density > 3.6 p/m². Deploy digital chevron override. Direct attendees to Gate W2 step-free elevator.",
      status: "ASSIGNED",
    },
    {
      id: "t_819",
      code: "VOL-819",
      priority: "P1_HIGH",
      category: "HAZARD_CLEANUP",
      zone: "CONCOURSE_W2_ADA",
      instructions: "Soda spill reported near Elevator #3 entrance. Verify floor traction and clear obstruction.",
      status: "RESOLVED",
    },
  ]);

  const calculateOfflineRoute = useNavigationStore((state) => state.calculateOfflineRoute);
  const activeRoute = useNavigationStore((state) => state.activeRoute);

  // Fan Actions
  const handleTurnstileCheckin = () => {
    setCheckinStatus("SCANNING");
    setTimeout(() => {
      setCheckinStatus("CHECKED_IN");
    }, 600);
  };

  const handleADAWayfinding = (adaMode: boolean) => {
    setIsADA(adaMode);
    calculateOfflineRoute("NODE_GATE_B4_ENTRY", "NODE_SEAT_112_ROW_12", adaMode);
  };

  const triggerPttVoiceQuery = () => {
    setIsPttRecording(true);
    setTimeout(() => {
      setIsPttRecording(false);
      setAiQueryResponse(
        "🎙️ Gemini 1.5 Flash (TTFT 154ms) | Audio Translation: 'Ascensor #3 está a 40 metros a la izquierda. Ruta sin escalones confirmada en el mapa MMKV offline.'"
      );
    }, 900);
  };

  // Volunteer Actions
  const handleUpdateTicketStatus = (id: string, nextStatus: IVolunteerTicket["status"]) => {
    setVolunteerTickets(
      volunteerTickets.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* Top Persona Switcher Bar (`Demo Guide Walkthrough`) */}
      <View style={styles.personaBar}>
        <TouchableOpacity
          style={[styles.personaTab, activePersona === "FAN" && styles.personaTabActive]}
          onPress={() => setActivePersona("FAN")}
        >
          <Text style={[styles.personaText, activePersona === "FAN" && styles.personaTextActive]}>
            🏟️ Fan App: Mateo Vance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.personaTab, activePersona === "VOLUNTEER" && styles.personaTabActive]}
          onPress={() => setActivePersona("VOLUNTEER")}
        >
          <Text style={[styles.personaText, activePersona === "VOLUNTEER" && styles.personaTextActive]}>
            🚨 Steward: Sarah Jenkins
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
        {activePersona === "FAN" ? (
          /* ==============================================================
             FAN PERSONA VIEW (`Mateo Vance — ROLE_FAN`)
             ============================================================== */
          <View>
            <Text style={styles.title}>Gate B4 Concourse Hub</Text>
            <Text style={styles.subtitle}>International Fan Match-Day Experience (`Rioplatense Spanish`)</Text>

            {/* Dynamic ECDSA QR Pass Card (`FR-SEC-001`) */}
            <View style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.cardHeader}>Dynamic Ticket & Access Ledger</Text>
                <Text style={styles.timerBadge}>🔄 TOTP 24s</Text>
              </View>
              <Text style={styles.ticketDetails}>Sec 112 • Row 12 • Seat 4 (Gold VIP)</Text>
              <View style={styles.statusRow}>
                <Text style={styles.cardStatus}>
                  {checkinStatus === "CHECKED_IN"
                    ? "🟢 TURNSTILE UNLOCKED (ECDSA Verified)"
                    : checkinStatus === "SCANNING"
                    ? "🟡 SCANNING BARCODE HASH..."
                    : "🔵 READY FOR CHECK-IN (ECDSA Pass)"}
                </Text>
              </View>
              {checkinStatus === "READY" && (
                <TouchableOpacity style={styles.checkinButton} onPress={handleTurnstileCheckin}>
                  <Text style={styles.checkinButtonText}>📲 Simulate NFC / QR Turnstile Check-in</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Wayfinding & ADA Route Selector (`FR-NAV-001`) */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Offline MMKV Wayfinding Engine (`stadium_graph.json`)</Text>
              <Text style={styles.routeText}>Active Graph Path: {activeRoute.join(" ➔ ")}</Text>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleButton, !isADA && styles.toggleButtonActive]}
                  onPress={() => handleADAWayfinding(false)}
                >
                  <Text style={[styles.toggleText, !isADA && styles.toggleTextActive]}>🚶 Standard Route</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, isADA && styles.toggleButtonActive]}
                  onPress={() => handleADAWayfinding(true)}
                >
                  <Text style={[styles.toggleText, isADA && styles.toggleTextActive]}>♿ Step-Free ADA ($1:12$ Slope)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* AR Directional HUD Trigger (`FR-NAV-003`) */}
            <TouchableOpacity style={styles.button} onPress={() => setShowAR(!showAR)}>
              <Text style={styles.buttonText}>
                {showAR ? "❌ Close AR Directional HUD" : "🧭 Launch AR Chevrons Overlay (`#00F0FF` Pulsing)"}
              </Text>
            </TouchableOpacity>

            {showAR && (
              <View style={styles.arViewport}>
                <ARNavigationOverlay />
              </View>
            )}

            {/* Push-To-Talk Multilingual AI Concierge (`FR-LAN-001`) */}
            <View style={[styles.card, { marginTop: 20 }]}>
              <Text style={styles.cardHeader}>Three-Tier AI Wayfinding Concierge (`Gemini 1.5 Flash`)</Text>
              <TouchableOpacity
                style={[styles.pttButton, isPttRecording && { backgroundColor: VISIONOS_COLORS.CRITICAL_RED }]}
                onPress={triggerPttVoiceQuery}
              >
                <Text style={styles.pttButtonText}>
                  {isPttRecording
                    ? "🔴 [RECORDING SPANISH AUDIO... RELEASE TO SEND]"
                    : "🎙️ Push-To-Talk: ¿Dónde está el ascensor más cercano?"}
                </Text>
              </TouchableOpacity>
              {aiQueryResponse && (
                <View style={styles.aiBox}>
                  <Text style={styles.aiText}>{aiQueryResponse}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* ==============================================================
             VOLUNTEER PERSONA VIEW (`Sarah Jenkins — ROLE_VOLUNTEER`)
             ============================================================== */
          <View>
            <Text style={styles.title}>Steward Operations Hub</Text>
            <Text style={styles.subtitle}>Lead Steward Sarah Jenkins (`Concourse Sector B4`)</Text>

            <View style={styles.volunteerMetricsCard}>
              <Text style={styles.cardHeader}>FirstNet Band 14 Priority Status</Text>
              <Text style={{ color: VISIONOS_COLORS.NORMAL_GREEN, fontWeight: "900", fontSize: 16 }}>
                🟢 FirstNet Priority Locked (`700 MHz Spectrum • 0% Packet Loss`)
              </Text>
              <Text style={{ color: VISIONOS_COLORS.TEXT_SECONDARY, fontSize: 12, marginTop: 4 }}>
                WebSocket connection to `apps/api-gateway` synced via 1 Hz heartbeat.
              </Text>
            </View>

            <Text style={[styles.cardHeader, { marginTop: 16, marginBottom: 8 }]}>
              Active Field Dispatch Assignments (`DispatchAgent`)
            </Text>

            {volunteerTickets.map((t) => (
              <View
                key={t.id}
                style={[
                  styles.ticketCard,
                  t.priority === "P0_CRITICAL" && { borderColor: VISIONOS_COLORS.CRITICAL_RED, borderWidth: 2 },
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.ticketCode}>{t.code}</Text>
                  <Text
                    style={[
                      styles.priorityBadge,
                      t.priority === "P0_CRITICAL" ? { color: VISIONOS_COLORS.CRITICAL_RED } : { color: VISIONOS_COLORS.WARNING_AMBER },
                    ]}
                  >
                    {t.priority}
                  </Text>
                </View>

                <Text style={styles.ticketCategory}>
                  {t.category} • <Text style={{ color: VISIONOS_COLORS.AR_CHEVRON_CYAN }}>{t.zone}</Text>
                </Text>
                <Text style={styles.ticketInstructions}>{t.instructions}</Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <Text style={{ color: VISIONOS_COLORS.LPU_GOLD, fontWeight: "800", fontSize: 13 }}>
                    Status: {t.status}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {t.status === "ASSIGNED" && (
                      <TouchableOpacity
                        style={[styles.statusActionButton, { backgroundColor: VISIONOS_COLORS.WARNING_AMBER }]}
                        onPress={() => handleUpdateTicketStatus(t.id, "EN_ROUTE")}
                      >
                        <Text style={styles.statusActionText}>🚀 Accept & En Route</Text>
                      </TouchableOpacity>
                    )}
                    {t.status === "EN_ROUTE" && (
                      <TouchableOpacity
                        style={[styles.statusActionButton, { backgroundColor: VISIONOS_COLORS.AR_CHEVRON_CYAN }]}
                        onPress={() => handleUpdateTicketStatus(t.id, "ON_SCENE")}
                      >
                        <Text style={styles.statusActionText}>📍 Arrived On Scene</Text>
                      </TouchableOpacity>
                    )}
                    {t.status === "ON_SCENE" && (
                      <TouchableOpacity
                        style={[styles.statusActionButton, { backgroundColor: VISIONOS_COLORS.NORMAL_GREEN }]}
                        onPress={() => handleUpdateTicketStatus(t.id, "RESOLVED")}
                      >
                        <Text style={[styles.statusActionText, { color: "#000" }]}>✅ Resolve Hazard</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: VISIONOS_COLORS.BACKGROUND_DARK,
  },
  personaBar: {
    flexDirection: "row",
    backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
    borderBottomWidth: 2,
    borderBottomColor: VISIONOS_COLORS.LPU_GOLD,
  },
  personaTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  personaTabActive: {
    backgroundColor: VISIONOS_COLORS.LPU_MAROON,
  },
  personaText: {
    color: VISIONOS_COLORS.TEXT_SECONDARY,
    fontWeight: "700",
    fontSize: 14,
  },
  personaTextActive: {
    color: VISIONOS_COLORS.LPU_GOLD,
    fontWeight: "900",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: VISIONOS_COLORS.TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    color: VISIONOS_COLORS.LPU_GOLD,
    marginBottom: 20,
  },
  card: {
    backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
    padding: 18,
    borderRadius: 14,
    borderColor: VISIONOS_COLORS.LPU_GOLD,
    borderWidth: 1,
    marginBottom: 18,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: VISIONOS_COLORS.TEXT_SECONDARY,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  timerBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: VISIONOS_COLORS.NORMAL_GREEN,
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ticketDetails: {
    fontSize: 19,
    fontWeight: "900",
    color: VISIONOS_COLORS.TEXT_PRIMARY,
    marginBottom: 10,
  },
  statusRow: {
    marginBottom: 12,
  },
  cardStatus: {
    fontSize: 14,
    fontWeight: "800",
    color: VISIONOS_COLORS.NORMAL_GREEN,
  },
  checkinButton: {
    backgroundColor: VISIONOS_COLORS.AR_CHEVRON_CYAN,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  checkinButtonText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 14,
  },
  routeText: {
    fontSize: 13,
    color: VISIONOS_COLORS.TEXT_PRIMARY,
    marginVertical: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: VISIONOS_COLORS.TEXT_SECONDARY,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: VISIONOS_COLORS.LPU_GOLD,
    borderColor: VISIONOS_COLORS.LPU_GOLD,
  },
  toggleText: {
    color: VISIONOS_COLORS.TEXT_SECONDARY,
    fontWeight: "700",
    fontSize: 12,
  },
  toggleTextActive: {
    color: "#000000",
    fontWeight: "900",
  },
  button: {
    backgroundColor: VISIONOS_COLORS.LPU_MAROON,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderColor: VISIONOS_COLORS.LPU_GOLD,
    borderWidth: 2,
  },
  buttonText: {
    color: VISIONOS_COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "800",
  },
  arViewport: {
    height: 300,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#111827",
    overflow: "hidden",
  },
  pttButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VISIONOS_COLORS.AR_CHEVRON_CYAN,
    marginTop: 8,
    alignItems: "center",
  },
  pttButtonText: {
    color: VISIONOS_COLORS.AR_CHEVRON_CYAN,
    fontWeight: "800",
    fontSize: 13,
  },
  aiBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: VISIONOS_COLORS.AR_CHEVRON_CYAN,
  },
  aiText: {
    color: VISIONOS_COLORS.TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: "600",
  },
  volunteerMetricsCard: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderColor: VISIONOS_COLORS.NORMAL_GREEN,
    borderWidth: 1,
  },
  ticketCard: {
    backgroundColor: VISIONOS_COLORS.SURFACE_DARK,
    padding: 16,
    borderRadius: 12,
    borderColor: VISIONOS_COLORS.LPU_GOLD,
    borderWidth: 1,
    marginBottom: 14,
  },
  ticketCode: {
    fontSize: 18,
    fontWeight: "900",
    color: VISIONOS_COLORS.TEXT_PRIMARY,
  },
  priorityBadge: {
    fontSize: 14,
    fontWeight: "900",
  },
  ticketCategory: {
    fontSize: 13,
    fontWeight: "700",
    color: VISIONOS_COLORS.TEXT_SECONDARY,
    marginVertical: 4,
  },
  ticketInstructions: {
    fontSize: 13,
    color: VISIONOS_COLORS.TEXT_PRIMARY,
    lineHeight: 18,
    marginTop: 4,
  },
  statusActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  statusActionText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 12,
  },
});
