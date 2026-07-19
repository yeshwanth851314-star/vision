/**
 * @visionos/shared/types
 * Inferred TypeScript DTO interfaces derived directly from Zod schemas (`29_Coding_Standards.md`).
 */

import type { z } from "zod";
import type {
  ZoneTelemetrySchema,
  CrowdAlertPayloadSchema,
  GateObserverSchema,
  UserLoginRequestSchema,
  VolunteerDispatchSchema,
  RTSPStreamConfigSchema,
  BMSCommandSchema,
  CheckInRequestSchema,
  RouteRequestSchema,
  DispatchAckSchema,
  EmergencyTriggerSchema,
} from "../schemas";

export type ZoneTelemetryDTO = z.infer<typeof ZoneTelemetrySchema>;
export type CrowdAlertPayload = z.infer<typeof CrowdAlertPayloadSchema>;
export type IGateObserver = z.infer<typeof GateObserverSchema>;
export type UserLoginRequest = z.infer<typeof UserLoginRequestSchema>;
export type VolunteerDispatch = z.infer<typeof VolunteerDispatchSchema>;
export type RTSPStreamConfig = z.infer<typeof RTSPStreamConfigSchema>;
export type BMSCommand = z.infer<typeof BMSCommandSchema>;
export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;
export type RouteRequest = z.infer<typeof RouteRequestSchema>;
export type DispatchAck = z.infer<typeof DispatchAckSchema>;
export type EmergencyTrigger = z.infer<typeof EmergencyTriggerSchema>;

export interface IBoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  confidence: number;
  classId: number;
}

export interface IEdgeFrameMetadata {
  frameNumber: number;
  timestamp: number;
  cameraId: string;
  detections: IBoundingBox[];
  processingLatencyMs: number;
}
