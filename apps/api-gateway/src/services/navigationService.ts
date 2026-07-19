import crypto from "node:crypto";

export interface NavigationRoute {
  routeId: string;
  totalDistanceMeters: number;
  estimatedSeconds: number;
  isAdaCompliant: boolean;
  steps: Array<{ stepIndex: number; instruction: string; distanceMeters: number; targetAngleDegrees: number; isAdaCompliant: boolean }>;
}

/** Lightweight, deterministic routing fallback until the documented PostGIS graph is provisioned. */
export function calculateRoute(input: { sourceNodeId: string; destinationNodeId: string; requiresWheelchairAccess: boolean; preferQuietRoute: boolean }): NavigationRoute {
  const via = input.requiresWheelchairAccess ? "Elevator W2 accessible corridor" : input.preferQuietRoute ? "Lower-density concourse ring" : "Central concourse intersection";
  const distance = input.requiresWheelchairAccess ? 142.5 : input.preferQuietRoute ? 158 : 126;
  return {
    routeId: `route_${crypto.randomUUID()}`,
    totalDistanceMeters: distance,
    estimatedSeconds: Math.ceil(distance / 0.73),
    isAdaCompliant: input.requiresWheelchairAccess,
    steps: [
      { stepIndex: 0, instruction: `Proceed from ${input.sourceNodeId} toward ${via}.`, distanceMeters: distance * 0.55, targetAngleDegrees: 0, isAdaCompliant: input.requiresWheelchairAccess },
      { stepIndex: 1, instruction: `Continue to ${input.destinationNodeId}.`, distanceMeters: distance * 0.45, targetAngleDegrees: 90, isAdaCompliant: input.requiresWheelchairAccess },
    ],
  };
}
