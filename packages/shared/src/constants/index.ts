/**
 * @visionos/shared/constants
 * Universal design tokens, thresholds, status codes, and constants for VisionOS.
 * Source of Truth: 03_UI_UX_Design_System.md & 29_Coding_Standards.md
 */

export const CROWD_DENSITY_THRESHOLDS = {
  NORMAL_MAX: 2.0,       // <= 2.0 p/m^2 (#00E676)
  WARNING_MAX: 3.4,      // 2.1 to 3.4 p/m^2 (#FFAB00)
  CRITICAL_MIN: 3.5,     // >= 3.5 p/m^2 (#FF1E1E)
} as const;

export const VISIONOS_COLORS = {
  // Premium Deep Space Brand Palette & High Contrast Alerts
  LPU_MAROON: "#0A0E1A",
  LPU_GOLD: "#D4AF37",
  CRITICAL_RED: "#FF1E1E",
  WARNING_AMBER: "#FFAB00",
  NORMAL_GREEN: "#00E676",
  AR_CHEVRON_CYAN: "#00F0FF",
  BACKGROUND_DARK: "#0B0F19",
  SURFACE_DARK: "#131A2A",
  TEXT_PRIMARY: "#FFFFFF",
  TEXT_SECONDARY: "#94A3B8",
} as const;

export const TELEMETRY_CONSTANTS = {
  WEBSOCKET_HEARTBEAT_MS: 5000,
  EDGE_CV_RTSP_FPS: 30,
  EDGE_CV_EMIT_HZ: 1,
  LATENCY_SLA_MS: 50,
  STADIUM_GATES_TOTAL: 24,
  MAX_CONCURRENT_SOCKETS: 120000,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;
