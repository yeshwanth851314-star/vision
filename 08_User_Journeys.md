# 08_User_Journeys: VisionOS End-to-End Operational Workflows

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS End-to-End Operational User Journeys & Sequence Workflows |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead UX Architect, Lead Systems Architect |
| **Purpose** | To map step-by-step, cross-functional operational workflows across the fan mobile app, volunteer staff interface, AI router, edge computer vision pipeline, and 3D Command Operating Picture (COP) during real-world stadium events. |
| **Scope** | Covers multi-actor interactions across three critical workflows: Pre-Match Turnstile Ingress, Dynamic Concourse Rerouting (`ADA Wayfinding`), and Critical Emergency Evacuation / Green Corridor Synchronization. |
| **Assumptions** | 1. User journeys must remain fully functional during localized cellular network dropouts via MMKV local state synchronization (`07_App_Flow.md`).<br>2. Multi-actor dispatch orders require deterministic acknowledgment timeouts ($\le 15\text{ seconds}$) before automated re-dispatch occurs (`15_Agent_Specifications.md`). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `05_User_Personas.md` — User Role Profiles (`Mateo`, `Sarah`, `Marcus`, `Elena`)<br>• `20_WebSocket_Flow.md` — Real-Time Push Mesh |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead UX Architect | Initial production release detailing 3 primary cross-functional user journeys (`Ingress`, `ADA Reroute`, `Emergency Evacuation`). |

---

## 1. Journey 1: Pre-Match Perimeter Ingress & Turnstile Check-in (`ROLE_FAN` $\rightarrow$ `API Gateway` $\rightarrow$ `Turnstile`)

This journey traces Mateo Silva (`ROLE_FAN`) approaching Gate B4 45 minutes prior to kickoff during peak ingress velocity (`FR-CRD-001`).

```mermaid
sequenceDiagram
  autonumber
  actor Mateo as Mateo (`ROLE_FAN`)
  participant App as Mobile App (`apps/mobile`)
  participant MMKV as Local Store (`MMKV`)
  participant Gate as Turnstile NFC Scanner (`Gate B4`)
  participant API as API Gateway (`apps/api-gateway`)
  participant COP as 3D COP Dashboard (`Marcus - ROLE_ORGANIZER`)

  Note over Mateo, MMKV: Phase 1: Perimeter Geofence Check-in ($T-60\text{ min}$)
  Mateo->>App: Crosses 500m Stadium Perimeter Geofence
  App->>API: `GET /api/v1/tickets/sync` (Bearer JWT)
  API-->>App: Return Encrypted Passbook JWT + `stadium_graph.json` ($1.2\text{ MB}$)
  App->>MMKV: Synchronous Write (`active_ticket`, `stadium_graph`)
  App-->>Mateo: Haptic Pulse (`40ms`) + Notification (`Ticket Ready for Offline Turnstile Entry`)

  Note over Mateo, Gate: Phase 2: High-Density Turnstile Approach ($T-45\text{ min}$)
  Mateo->>Gate: Presents Smartphone NFC / Dynamic QR Code to Scanner
  Gate->>MMKV: Local Cryptographic Verification (`ECDSA P-256 Public Key Check`)
  Note over Gate, MMKV: Zero Cloud Dependency — Verification executes in $< 5\text{ms}$ (`FR-CRD-001`)
  Gate-->>Mateo: Turnstile Unlocks + Green LED (`#00E676`)
  Gate->>API: Asynchronous Event Push (`stadium.gate.ingress`, Gate B4, Count +1)
  API->>COP: WebSocket Broadcast (`WSS`) — Update Total Occupancy HUD (`81,421 / 85,000`)
```

### 1.1 Journey 1 Execution Step Table
| Step # | Actor / Component | Action Taken & Trigger | Expected System Response & Latency Budget | Traceability Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | `Mateo` (`ROLE_FAN`) | Crosses exterior geofence boundary ($500\text{m}$ outside venue). | `apps/mobile` wakes up via background geolocation trigger and requests latest ticket payload from API Gateway. | `FR-NAV-001` (`Indoor/Outdoor Localization`) |
| **1.2** | `apps/mobile` | Downloads `stadium_graph.json` and ticket claims. | Writes directly to local `MMKV` synchronous storage. App is now $100\%$ resilient to interior cellular dropouts. | `02_TRD.md` (`Offline Autonomy SLA`) |
| **1.3** | `Turnstile Gate` | Scans Mateo's dynamic QR code at Gate B4 turnstile. | Local gate controller validates ECDSA cryptographic signature in $<5\text{ms}$. Turnstile barrier rotates open. | `FR-CRD-001` (`Edge Queue Ingestion`) |
| **1.4** | `API Gateway` | Ingests asynchronous `stadium.gate.ingress` Pub/Sub event from gate controller. | Increments Firestore document `stadium/metrics/occupancy`. Emits WebSocket update (`WSS`) to Commander Vance's 3D COP canvas within $<25\text{ms}$. | `20_WebSocket_Flow.md` (`Real-Time Push`) |

---

## 2. Journey 2: High-Density Concourse Rerouting & ADA Wayfinding (`ROLE_FAN` $\leftrightarrow$ `Edge CV` $\leftrightarrow$ `DispatchAgent`)

While navigating to Sector 112 with his wheelchair-bound father (`FR-ACC-001`), Mateo encounters a severe bottleneck (`Crowd Density > 3.2 persons/m²`) inside Concourse Ring Level 1.

```mermaid
sequenceDiagram
  autonumber
  actor Mateo as Mateo & Father (`ROLE_FAN`)
  participant App as Mobile App (`apps/mobile`)
  participant Edge as NVIDIA Jetson CV (`Node 04`)
  participant Router as AI Dispatch Engine (`CrowdAgent`)
  participant Sarah as Sarah (`ROLE_VOLUNTEER`)
  participant COP as 3D COP Canvas (`Marcus`)

  Note over Edge, Router: Phase 1: Real-Time Crowd Surge Ingestion
  Edge->>Edge: RTSP Camera #104 Ingests Concourse Ring 1 Frame
  Edge->>Edge: YOLOv9 / DeepStream calculates $D_{crowd} = 3.4\text{ persons/m}^2$ (`WARNING`)
  Edge->>Router: Pub/Sub Event (`stadium.cv.crowd_surge`, Zone B4, Density: 3.4)
  Router->>COP: Update 3D Canvas Polygon to Amber (`#FFAB00`) + Alert Toast

  Note over Router, Sarah: Phase 2: Autonomous Rerouting & Volunteer Dispatch (`FR-COP-002`)
  Router->>App: Push WebSocket Event (`stadium:zone:congested`, Zone B4)
  App->>App: Local $A^*$ Recalculates Route inside `MMKV` (`FR-NAV-002` + `FR-ACC-001`)
  Note over App: New Route selects ADA Elevator #3 (Bypasses Concourse Ring 1)
  App-->>Mateo: Double-Pulse Haptic (`80ms`) + AR Overlay Shifts Chevrons to Elevator #3 (`#00F0FF`)

  Router->>Sarah: Push FCM Task Ticket (`[Clear Corridor B4 Surge - 80m away]`)
  Sarah->>Router: Single-Tap Acknowledgment (`POST /api/v1/dispatches/ack`)
  Sarah->>Mateo: Arrives at Concourse Ring 1 and directs remaining fans to Gate C stairs
```

### 2.1 Journey 2 Execution Step Table
| Step # | Actor / Component | Action Taken & Trigger | Expected System Response & Latency Budget | Traceability Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | `NVIDIA Jetson` (`Node 04`) | Analyzes RTSP IP camera feed covering Concourse Ring Level 1 (`17_Computer_Vision_Pipeline.md`). | Computes bounding box density ($D_{crowd} = 3.4\text{ persons/m}^2$). Emits `CrowdAlertPayload` over Pub/Sub within $<65\text{ms}$. | `FR-CRD-001` (`Edge Queue Ingestion`) |
| **2.2** | `CrowdAgent` (`packages/ai-router`) | Ingests `CrowdAlertPayload` and identifies target concourse graph edges crossing warning thresholds. | Doubles edge traversal weights ($W_{edge} \times 2$) inside Firestore routing graph. Emits WebSocket broadcast to all active mobile clients inside Zone B4. | `FR-NAV-002` (`Dynamic Pathfinding`) |
| **2.3** | `apps/mobile` (`Mateo`) | Receives WebSocket congestion alert while `NavigationState == ACTIVE_GUIDANCE`. | Recalculates $A^*$ route locally against `stadium_graph.json`, strictly filtering out stairs (`requiresWheelchairAccess == true`). | `FR-ACC-001` (`Step-Free Route Guarantee`) |
| **2.4** | `apps/mobile` (`Sarah`) | Receives automated task dispatch alert (`[Clear Corridor B4 Surge - 80m away]`) on staff tab. | Sarah taps `[Acknowledge]`. App renders AR guidance guiding her directly to the bottleneck center to assist pedestrian flow. | `FR-COP-002` (`Volunteer Dispatch Engine`) |

---

## 3. Journey 3: Critical Emergency Evacuation & Green Corridor Synchronization (`Edge CV` $\rightarrow$ `Marcus` $\rightarrow$ `Elena`)

During the second half ($T+65\text{ minutes}$), an edge CV camera inside Concourse Zone E4 detects an active structural fire / heavy smoke plume (`Confidence: 0.94`).

```mermaid
sequenceDiagram
  autonumber
  participant Edge as NVIDIA Jetson CV (`Node 12`)
  participant COP as 3D COP Dashboard (`Marcus - ROLE_ORGANIZER`)
  participant API as API Gateway (`apps/api-gateway`)
  participant Sarah as Sarah & Stewards (`ROLE_VOLUNTEER`)
  participant Elena as Capt. Elena (`ROLE_RESPONDER`)
  participant Mateo as Mateo & Fans (`ROLE_FAN`)

  Note over Edge, COP: Phase 1: Sub-Second Threat Escalation (`FR-EMR-001`)
  Edge->>Edge: DeepStream detects fire plume bounding box (`Confidence: 0.94`)
  Edge->>API: High-Priority MQTT/Pub/Sub Event (`stadium.cv.incident`, Type: `FIRE`, Zone: E4)
  API->>COP: WebSocket Push (`CRITICAL_EMERGENCY`) — Override 3D Canvas with Red Strobe Banner (`<100ms`)
  COP-->>Marcus: Audio Siren + Live Video Snapshot Modal (`Zone E4 Concourse`)

  Note over Marcus, Elena: Phase 2: Emergency Evacuation & Green Corridor Broadcast (`FR-EMR-002`, `FR-EMR-003`)
  Marcus->>COP: Clicks `[CONFIRM EMERGENCY EVACUATION — SECTOR EAST]`
  COP->>API: `POST /api/v1/cop/emergency/trigger` (JWT `ROLE_ORGANIZER`)
  API->>Sarah: Priority Push: `CLEAR GREEN CORRIDOR 4 — PARAMEDICS EN ROUTE`
  Sarah->>Sarah: Clears $4\text{m}$-wide path along Concourse Ring 1 ($60\text{s}$ ahead of responders)

  API->>Elena: CAD Overlay Update: `Green Corridor 4 Cleared — Proceed to Zone E4`
  Elena->>Edge: Medical Squad sprints through unobstructed Green Corridor to incident coordinates

  API->>Mateo: Broadcast `EMERGENCY_OVERRIDE` WebSocket Payload to all fan devices
  Mateo->>Mateo: Mobile App transitions to `EmergencyState` FSM (`07_App_Flow.md`)
  Note over Mateo: Screen locks to high-contrast `#FF1E1E` banner displaying arrows to Gate W2 (Step-Free)
  Mateo->>Mateo: Continuous $1\text{ Hz}$ SOS Haptic Pulse (`200ms on / 100ms off`) until exterior geofence reached
```

### 3.1 Journey 3 Execution Step Table
| Step # | Actor / Component | Action Taken & Trigger | Expected System Response & Latency Budget | Traceability Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | `NVIDIA Jetson` (`Node 12`) | DeepStream vision model detects fire/smoke inside Zone E4 (`Confidence > 0.85`). | Instantly pushes `stadium.cv.incident` payload over dedicated fiber uplink. Total inference-to-push latency $<80\text{ms}$. | `FR-EMR-001` (`Incident Detection`) |
| **3.2** | `3D COP Canvas` (`Marcus`) | Ingests `CRITICAL_EMERGENCY` WebSocket event. | 3D WebGL camera auto-zooms to Zone E4 (`FR-COP-001`). Displays flashing red perimeter border (`#FF1E1E`) and live RTSP video snapshot verification modal. | `03_UI_UX_Design_System.md` (`Emergency UI`) |
| **3.3** | `Commander Marcus` | Clicks `[CONFIRM EMERGENCY EVACUATION]` inside COP dashboard. | API Gateway executes global state override across all microservices and Firestore listeners. | `22_Security_Model.md` (`Admin Overrides`) |
| **3.4** | `Capt. Elena` (`ROLE_RESPONDER`) | CAD tactical overlay receives `Green Corridor 4 Active` routing instruction. | Elena's medical squad enters Gate E4 exterior entrance and traverses the pre-cleared $4\text{m}$ corridor directly to the target casualty zone without crowd friction. | `FR-EMR-003` (`Green Corridor Sync`) |
| **3.5** | `apps/mobile` (`Mateo`) | Client FSM transitions synchronously from `ACTIVE_GUIDANCE` to `CRITICAL_EMERGENCY` state. | Strips navigation tabs (`opacity: 0.2`). Renders $72\text{px}$ white evacuation arrow pointing away from Zone E4 toward exterior Gate W2 (guaranteed step-free). | `FR-EMR-002` (`Dynamic Evac Rerouting`) |
