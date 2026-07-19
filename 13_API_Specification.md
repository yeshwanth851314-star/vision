# 13_API_Specification: VisionOS REST & WebSocket Interface Contracts

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise REST & WebSocket API Specification (`OpenAPI 3.1 & AsyncAPI 2.6`) |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead API Architect, Cloud Systems Architect |
| **Purpose** | To define the exhaustive, implementation-ready HTTP REST endpoints, WebSocket streaming channels, Zod validation schemas, rate-limiting headers, and error structures for the VisionOS API Gateway (`apps/api-gateway`). |
| **Scope** | Enforced across `apps/api-gateway` (`Fastify 5 + Socket.io`), client mobile consumers (`apps/mobile`), and web command dashboards (`apps/web`). |
| **Assumptions** | 1. All REST endpoints require TLS 1.3 encryption and OAuth2 Bearer JWT authorization headers.<br>2. Rate-limiting is enforced via Redis Enterprise sliding window (`100 req/min for Fans`, `1,000 req/min for Staff`). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `11_Backend_Schema.md` — Relational Cloud SQL Schema<br>• `22_Security_Model.md` — RBAC Authorization Claims |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead API Architect | Initial production release covering 5 primary REST endpoints and 2 WebSocket channels with complete Zod schemas. |

---

## 1. Unified Error Handling & Rate Limiting Contracts

### 1.1 Standard JSON Error Response (`VisionOSError`)
When an endpoint fails (`Status 4xx / 5xx`), it must never return plaintext HTML or stack traces. It must emit the unified JSON structure (`29_Coding_Standards.md`):

```json
{
  "error": {
    "code": "CROWD_DENSITY_EXCEEDED_SAFETY_LIMIT",
    "message": "Concourse Ring 1 (Zone B4) registers 3.4 persons/m²; manual turnstile unlock is blocked by automated safety interlock.",
    "status": 403,
    "timestampUtc": "2026-07-13T18:45:12.104Z",
    "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "details": {
      "targetZoneId": "CONCOURSE_B4_EAST",
      "currentDensity": 3.4,
      "maxAllowedDensity": 3.0
    }
  }
}
```

### 1.2 Rate-Limiting & SLA Headers
Every HTTP response returns strict sliding-window headers (`Redis Enterprise API Gateway`):
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 94
X-RateLimit-Reset: 1784054760
X-Trace-Id: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

---

## 2. Zod Validation Schemas (`@visionos/shared/src/schemas/api.ts`)

To enforce contract parity between `apps/mobile`, `apps/web`, and `apps/api-gateway`, payload validation uses shared `Zod` schemas:

```ts
import { z } from 'zod';

export const CheckInRequestSchema = z.object({
  ticketBarcodeHash: z.string().length(64, 'Must be exact SHA-256 hash'),
  deviceBleAnchorId: z.string().min(4).max(64),
  requiresWheelchairAccess: z.boolean().default(false),
  clientAppVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must follow SemVer v1.0.0'),
});

export const RouteRequestSchema = z.object({
  sourceNodeId: z.string().uuid(),
  destinationNodeId: z.string().uuid(),
  requiresWheelchairAccess: z.boolean().default(false),
  preferQuietRoute: z.boolean().default(false),
});

export const DispatchAckSchema = z.object({
  dispatchId: z.string().uuid(),
  status: z.enum(['ACKNOWLEDGED', 'EN_ROUTE', 'RESOLVED']),
  notes: z.string().max(500).optional(),
});

export const EmergencyTriggerSchema = z.object({
  emergencyType: z.enum(['FIRE', 'WEAPON_DETECTED', 'CROWD_CRUSH_HAZARD', 'STRUCTURAL_COMPROMISE']),
  targetSectorId: z.string().uuid(),
  evacuationTargetSafeGate: z.string().min(2).max(16),
  justificationNotes: z.string().min(10).max(1000),
});
```

---

## 3. Core REST API Endpoints (`HTTP / JSON`)

### 3.1 `POST /api/v1/auth/checkin` (Perimeter Geofence Check-In)
Executes ECDSA ticket verification and delivers the $1.2\text{ MB}$ local routing graph (`stadium_graph.json`) to fan mobile devices upon crossing the $500\text{m}$ exterior perimeter (`08_User_Journeys.md`).

* **Authorization:** `Bearer <OAuth2_JWT>` (`ROLE_FAN`, `ROLE_VOLUNTEER`)
* **Request Body:** Validated via `CheckInRequestSchema`
```json
{
  "ticketBarcodeHash": "a8f5f167f44f4964e6c998dee827110c",
  "deviceBleAnchorId": "BEACON_ANCHOR_GATE_B4_01",
  "requiresWheelchairAccess": true,
  "clientAppVersion": "1.0.0"
}
```
* **Response Body (`200 OK`):**
```json
{
  "checkInStatus": "VERIFIED_ACTIVE",
  "assignedSectorCode": "SECTOR_112",
  "seatPortalCode": "PORTAL_B4_LEVEL_1",
  "offlineGraphPayloadUrl": "https://storage.googleapis.com/visionos-cdn/stadium_graph_v1.json",
  "offlineTicketToken": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtYXRlby...",
  "serverTimeUtc": "2026-07-13T17:30:00.000Z"
}
```

---

### 3.2 `POST /api/v1/navigation/route` (Dynamic $A^*$ Graph Pathfinding)
Computes point-to-point wayfinding routes weighted by real-time concourse crowd density ($D_{crowd}$) and accessibility flags (`FR-NAV-002`, `FR-ACC-001`).

* **Authorization:** `Bearer <OAuth2_JWT>` (`ROLE_FAN`, `ROLE_VOLUNTEER`, `ROLE_ORGANIZER`, `ROLE_RESPONDER`)
* **Request Body:** Validated via `RouteRequestSchema`
```json
{
  "sourceNodeId": "550e8400-e29b-41d4-a716-446655440000",
  "destinationNodeId": "660e8400-e29b-41d4-a716-446655440000",
  "requiresWheelchairAccess": true,
  "preferQuietRoute": false
}
```
* **Response Body (`200 OK`):**
```json
{
  "routeId": "route_990e8400_20260713_1745",
  "totalDistanceMeters": 142.5,
  "estimatedSeconds": 195,
  "isAdaCompliant": true,
  "steps": [
    {
      "stepIndex": 0,
      "instruction": "Proceed straight along Concourse Ring 1 toward Elevator #3",
      "distanceMeters": 45.0,
      "targetAngleDegrees": 0,
      "isAdaCompliant": true
    },
    {
      "stepIndex": 1,
      "instruction": "Take Elevator #3 to Level 2 (Bypasses stairs and concourse congestion)",
      "distanceMeters": 12.0,
      "targetAngleDegrees": 90,
      "isAdaCompliant": true
    }
  ]
}
```

---

### 3.3 `POST /api/v1/dispatches/ack` (Volunteer Task Acknowledgment)
Allows Sarah Jenkins (`ROLE_VOLUNTEER`) to acknowledge, transition, and resolve task tickets assigned by the `DispatchAgent` (`FR-COP-002`).

* **Authorization:** `Bearer <OAuth2_JWT>` (`ROLE_VOLUNTEER`, `ROLE_ORGANIZER`)
* **Request Body:** Validated via `DispatchAckSchema`
```json
{
  "dispatchId": "770e8400-e29b-41d4-a716-446655440000",
  "status": "ACKNOWLEDGED",
  "notes": "Arrived at Gate B4; redirecting pedestrian flow to Gate C."
}
```
* **Response Body (`200 OK`):**
```json
{
  "dispatchId": "770e8400-e29b-41d4-a716-446655440000",
  "updatedStatus": "ACKNOWLEDGED",
  "acknowledgedAtUtc": "2026-07-13T18:42:10.000Z"
}
```

---

### 3.4 `POST /api/v1/cop/emergency/trigger` (Global Emergency Evacuation Override)
Executes a stadium-wide `CRITICAL_EMERGENCY` state override (`FR-EMR-001`), locking out fan mobile features and broadcasting Green Corridor clearance orders (`FR-EMR-003`).

* **Authorization:** `Bearer <OAuth2_JWT>` (`ROLE_ORGANIZER` ONLY — Enforced via Fastify RBAC hook)
* **Request Body:** Validated via `EmergencyTriggerSchema`
```json
{
  "emergencyType": "FIRE",
  "targetSectorId": "880e8400-e29b-41d4-a716-446655440000",
  "evacuationTargetSafeGate": "GATE_W2",
  "justificationNotes": "Confirmed fire plume in Sector East Level 2 via CCTV Camera #104."
}
```
* **Response Body (`201 Created`):**
```json
{
  "overrideId": "override_FIRE_20260713_1845",
  "globalStateStatus": "CRITICAL_EMERGENCY",
  "dispatchedGreenCorridors": ["CORRIDOR_W2_ENTRY_PATH"],
  "affectedDeviceCountEstimate": 118420,
  "broadcastTimestampUtc": "2026-07-13T18:45:00.000Z"
}
```

---

## 4. Real-Time WebSocket Interface Channels (`AsyncAPI / Socket.io v4`)

The API Gateway exposes two primary persistent WebSocket channels (`apps/api-gateway/src/websocket/`) over TLS port `443`:

### 4.1 Channel 1: `WSS /api/v1/realtime/mesh` (Telemetry & State Gateway)
Handles bidirectional broadcast of concourse queue updates (`stadium:zone:update`), digital signage commands, and critical emergency overrides (`EMERGENCY_OVERRIDE`).

* **Connection Handshake:** `wss://api.visionos.ai/api/v1/realtime/mesh?token=<Bearer_JWT>&bleAnchor=BEACON_B4`
* **Inbound Server-Sent Event (`stadium:zone:update`):** Broadcast to mobile apps whenever Concourse Zone $D_{crowd}$ changes ($\ge 1\text{ Hz}$).
```json
{
  "event": "stadium:zone:update",
  "payload": {
    "zoneId": "CONCOURSE_B4_EAST",
    "density": 3.4,
    "status": "WARNING",
    "timestampUtc": "2026-07-13T18:45:12.104Z"
  }
}
```
* **Inbound Server-Sent Event (`EMERGENCY_OVERRIDE`):** High-priority interrupt overriding `NavigationState` and `OrderingState` inside mobile/web FSMs (`07_App_Flow.md`).
```json
{
  "event": "EMERGENCY_OVERRIDE",
  "payload": {
    "overrideId": "override_FIRE_20260713_1845",
    "emergencyType": "FIRE",
    "targetSectorId": "SECTOR_EAST_L2",
    "evacuationTargetSafeGate": "GATE_W2",
    "isStepFreeVerified": true,
    "instructions": "EVACUATE IMMEDIATELY TOWARD GATE W2. DO NOT USE ELEVATORS OR STAIRS NEAR SECTOR EAST."
  }
}
```

---

### 4.2 Channel 2: `WSS /api/v1/ai/speech-translate` (Gemini 1.5 Flash PTT Stream)
Provides dual-channel, low-latency ($<800\text{ms}$) speech-to-speech translation for volunteer staff (`FR-LAN-002`).

* **Outbound Client Frame (Binary PCM / Opus Audio Buffer):**
```json
{
  "action": "STREAM_AUDIO_FRAME",
  "sessionRef": "ptt_session_1042",
  "sourceLanguageCode": "auto-detect",
  "targetLanguageCode": "es-AR",
  "audioBase64Chunk": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAf..."
}
```
* **Inbound Server Frame (Synthesized Audio & Translated Transcript):**
```json
{
  "event": "TRANSLATED_AUDIO_READY",
  "payload": {
    "sessionRef": "ptt_session_1042",
    "detectedSourceLanguage": "ja-JP",
    "transcriptSourceText": "ゲート4はどこですか？",
    "transcriptTranslatedText": "¿Dónde está la Puerta 4?",
    "audioBase64Output": "T2dnUwACAAAAAAAAAABkb2dkAAAA...",
    "processingRoundTripMs": 684
  }
}
```
