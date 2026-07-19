/**
 * @visionos/shared/utils/math.ts
 * Geometric and bounding box math utilities for edge computer vision tracking.
 */

import type { IBoundingBox } from "../types";

export function computeIoU(boxA: IBoundingBox, boxB: IBoundingBox): number {
  const xA = Math.max(boxA.xMin, boxB.xMin);
  const yA = Math.max(boxA.yMin, boxB.yMin);
  const xB = Math.min(boxA.xMax, boxB.xMax);
  const yB = Math.min(boxA.yMax, boxB.yMax);

  const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  if (intersectionArea === 0) return 0;

  const boxAArea = (boxA.xMax - boxA.xMin) * (boxA.yMax - boxA.yMin);
  const boxBArea = (boxB.xMax - boxB.xMin) * (boxB.yMax - boxB.yMin);

  const unionArea = boxAArea + boxBArea - intersectionArea;
  return intersectionArea / unionArea;
}
