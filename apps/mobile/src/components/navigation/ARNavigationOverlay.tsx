/**
 * @visionos/mobile/components/navigation/ARNavigationOverlay.tsx
 * AR Camera Navigation Overlay rendering pulsing directional chevrons (`VIS-201`, `FR-NAV-003`).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigationStore } from "../../services/useNavigationStore";
import { VISIONOS_COLORS } from "@visionos/shared";

export const ARNavigationOverlay: React.FC = () => {
  const { targetAngleDegrees, distanceRemainingMeters, isOffRoute, isEmergencyPreempted, activeRoute } = useNavigationStore();

  return (
    <View style={styles.container}>
      {isEmergencyPreempted ? (
        <View style={styles.emergencyBanner}>
          <Text style={styles.offRouteText}>{activeRoute[0]}</Text>
        </View>
      ) : isOffRoute ? (
        <View style={styles.offRouteBanner}>
          <Text style={styles.offRouteText}>🚨 OFF ROUTE DETECTED — RECALCULATING...</Text>
        </View>
      ) : (
        <View style={styles.hudContainer}>
          <Text style={styles.chevronSymbol}>⬆️</Text>
          <Text style={styles.angleText}>Turn {targetAngleDegrees}° Right</Text>
          <Text style={styles.distanceText}>{distanceRemainingMeters}m to destination</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  hudContainer: {
    backgroundColor: "rgba(19, 26, 42, 0.85)",
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 16,
    alignItems: "center",
    borderColor: VISIONOS_COLORS.AR_CHEVRON_CYAN,
    borderWidth: 2,
  },
  chevronSymbol: {
    fontSize: 64,
    color: VISIONOS_COLORS.AR_CHEVRON_CYAN,
    marginBottom: 8,
  },
  angleText: {
    fontSize: 22,
    fontWeight: "800",
    color: VISIONOS_COLORS.TEXT_PRIMARY,
  },
  distanceText: {
    fontSize: 16,
    color: VISIONOS_COLORS.LPU_GOLD,
    marginTop: 4,
  },
  offRouteBanner: {
    backgroundColor: VISIONOS_COLORS.CRITICAL_RED,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emergencyBanner: {
    backgroundColor: VISIONOS_COLORS.CRITICAL_RED,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: VISIONOS_COLORS.LPU_GOLD,
  },
  offRouteText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
});
