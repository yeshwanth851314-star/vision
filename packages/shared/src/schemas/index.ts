/**
 * @visionos/shared/schemas
 * Runtime Zod validation schemas for VisionOS across Web, Mobile, Edge CV, API Gateway, and AI Router.
 * Naming convention: PascalCase + Schema suffix (`29_Coding_Standards.md`).
 */

import { z } from "zod";

export const ZoneTelemetrySchema = z.object({
  zoneId: z.string().min(1),
  sectorName: z.string().min(1),
  densityPerSqM: z.number().min(0),
  headcount: z.number().int().min(0),
  averageFlowVelocityMps: z.number().min(0),
  status: z.enum(["NORMAL", "WARNING", "CRITICAL"]),
  timestamp: z.number().int().positive(),
});

export const CrowdAlertPayloadSchema = z.object({
  alertId: z.string().uuid(),
  zoneId: z.string().min(1),
  severity: z.enum(["NORMAL", "WARNING", "CRITICAL", "EMERGENCY_OVERRIDE"]),
  densityDetected: z.number().min(0),
  recommendedGate: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.number().int().positive(),
});

export const GateObserverSchema = z.object({
  gateId: z.string().min(1),
  gateNumber: z.string().min(1),
  isOpen: z.boolean(),
  isLockedOut: z.boolean(),
  throughputPerMinute: z.number().int().min(0),
  queueTimeMinutes: z.number().min(0),
});

export const UserLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["COMMANDER", "VOLUNTEER", "FAN", "ADMIN"]),
});

export const VolunteerDispatchSchema = z.object({
  dispatchId: z.string().uuid(),
  volunteerId: z.string().min(1),
  zoneId: z.string().min(1),
  taskType: z.enum(["MEDICAL", "CROWD_CONTROL", "ADA_ASSIST", "SECURITY", "CONCESSION_QUEUE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["ASSIGNED", "ACKNOWLEDGED", "EN_ROUTE", "RESOLVED"]),
  assignedTimestamp: z.number().int().positive(),
});

export const RTSPStreamConfigSchema = z.object({
  cameraId: z.string().min(1),
  rtspUri: z.string().url(),
  targetFps: z.number().int().positive().default(30),
  enableTensorRT: z.boolean().default(true),
  enableGaussianBlur: z.boolean().default(true),
});

export const BMSCommandSchema = z.object({
  commandId: z.string().uuid(),
  targetDeviceNumber: z.string().min(1),
  protocol: z.enum(["BACNET", "MODBUS"]),
  property: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
  timestamp: z.number().int().positive(),
});

/** HTTP contracts from 13_API_Specification.md. */
export const CheckInRequestSchema = z.object({
  ticketBarcodeHash: z.string().min(8).max(128),
  deviceBleAnchorId: z.string().min(4).max(64).optional(),
  entryGateCode: z.string().min(2).max(32).optional(),
  requiresWheelchairAccess: z.boolean().default(false),
  clientAppVersion: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0"),
});

export const RouteRequestSchema = z.object({
  sourceNodeId: z.string().min(1),
  destinationNodeId: z.string().min(1),
  requiresWheelchairAccess: z.boolean().default(false),
  preferQuietRoute: z.boolean().default(false),
});

export const DispatchAckSchema = z.object({
  dispatchId: z.string().min(1),
  status: z.enum(["ACKNOWLEDGED", "EN_ROUTE", "RESOLVED"]),
  notes: z.string().max(500).optional(),
});

export const EmergencyTriggerSchema = z.object({
  emergencyType: z.enum(["FIRE", "WEAPON_DETECTED", "CROWD_CRUSH_HAZARD", "STRUCTURAL_COMPROMISE"]),
  targetSectorId: z.string().min(1),
  evacuationTargetSafeGate: z.string().min(2).max(16),
  justificationNotes: z.string().min(10).max(1000),
});
