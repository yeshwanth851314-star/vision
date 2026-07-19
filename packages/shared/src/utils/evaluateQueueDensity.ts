/**
 * @visionos/shared/utils/evaluateQueueDensity.ts
 * Evaluates crowd density per square meter and returns status classification + color token.
 */

import { CROWD_DENSITY_THRESHOLDS, VISIONOS_COLORS } from "../constants";

export interface IDensityEvaluation {
  status: "NORMAL" | "WARNING" | "CRITICAL";
  color: string;
  isActionRequired: boolean;
}

export function evaluateQueueDensity(densityPerSqM: number): IDensityEvaluation {
  if (densityPerSqM >= CROWD_DENSITY_THRESHOLDS.CRITICAL_MIN) {
    return {
      status: "CRITICAL",
      color: VISIONOS_COLORS.CRITICAL_RED,
      isActionRequired: true,
    };
  }
  if (densityPerSqM > CROWD_DENSITY_THRESHOLDS.NORMAL_MAX) {
    return {
      status: "WARNING",
      color: VISIONOS_COLORS.WARNING_AMBER,
      isActionRequired: false,
    };
  }
  return {
    status: "NORMAL",
    color: VISIONOS_COLORS.NORMAL_GREEN,
    isActionRequired: false,
  };
}
