/**
 * @visionos/mobile/services/useNavigationStore.ts
 * Offline Wayfinding Graph Traversal Engine (`VIS-202`, `FR-NAV-001`).
 */

import { create } from "zustand";

export interface INavigationState {
  currentStepIndex: number;
  targetAngleDegrees: number;
  distanceRemainingMeters: number;
  isOffRoute: boolean;
  isEmergencyPreempted: boolean;
  activeRoute: string[];
  calculateOfflineRoute: (fromNode: string, toNode: string, isADA?: boolean) => void;
  updateTelemetry: (distance: number, angle: number, offRoute?: boolean) => void;
  triggerEmergencyPreemption: (safeGate: string) => void;
  clearEmergencyPreemption: () => void;
}

export const useNavigationStore = create<INavigationState>((set) => ({
  currentStepIndex: 0,
  targetAngleDegrees: 90,
  distanceRemainingMeters: 45,
  isOffRoute: false,
  isEmergencyPreempted: false,
  activeRoute: ["NODE_GATE_B4_ENTRY", "ESCALATOR_CENTRAL_A", "NODE_SEAT_112_ROW_12"],
  calculateOfflineRoute: (fromNode, toNode, isADA = false) => {
    // Simulated offline A* traversal against MMKV cached graph (`stadium_graph.json`)
    const path = [fromNode, isADA ? "ELEVATOR_WEST_1" : "ESCALATOR_CENTRAL_A", toNode];
    set({ activeRoute: path, currentStepIndex: 0, isOffRoute: false, isEmergencyPreempted: false, distanceRemainingMeters: 50 });
  },
  updateTelemetry: (distance, angle, offRoute = false) =>
    set({
      distanceRemainingMeters: distance,
      targetAngleDegrees: angle,
      isOffRoute: offRoute,
    }),
  triggerEmergencyPreemption: (safeGate) =>
    set({
      activeRoute: [`EMERGENCY: PROCEED IMMEDIATELY TO ${safeGate}`, "FOLLOW STAFF AND DIGITAL SIGNAGE"],
      currentStepIndex: 0,
      distanceRemainingMeters: 0,
      targetAngleDegrees: 0,
      isOffRoute: false,
      isEmergencyPreempted: true,
    }),
  clearEmergencyPreemption: () => set({ isEmergencyPreempted: false }),
}));
