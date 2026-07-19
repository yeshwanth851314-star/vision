# 01_PRD: VisionOS Product Requirements Document

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Product Requirements Document (PRD) |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead Product Architect, Principal UX Designer |
| **Purpose** | To establish the definitive, implementation-ready functional requirements, user access roles, prioritization matrix, and acceptance criteria across all eight operational pillars of the VisionOS platform. |
| **Scope** | Covers all feature specifications for Fan Mobile App (`apps/mobile`), Volunteer/Staff Mobile App (`apps/mobile`), Organizer 3D Command Center Dashboard (`apps/web`), and automated background AI agent dispatches (`packages/ai-router`). |
| **Assumptions** | 1. Venue capacity is 85,000 physical seats with 120,000 peak connected mobile devices.<br>2. Users access the system via iOS/Android smartphones or desktop web browsers (Chrome/Safari/Edge).<br>3. Multilingual assistance requires sub-200ms translation response across 40+ languages via Gemini 1.5. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `02_TRD.md` — Technical Requirements Document<br>• `05_User_Personas.md` — User Access Profiles<br>• `14_AI_Architecture.md` — AI & LLM Orchestration<br>• `32_Acceptance_Checklists.md` — Acceptance Checklists |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead Product Architect | Initial production release of the VisionOS PRD. Establishes functional requirement traceability (`FR-001` to `FR-080`). |

---

## 1. Product Summary & Strategic Objectives

VisionOS (`AI Operating System for Smart Stadiums`) transforms high-density tournament venues from reactive physical structures into predictive, autonomous environments. By unifying real-time edge computer vision, dynamic RAG-grounded AI reasoning, and bi-directional WebSocket push notifications, VisionOS guarantees:
1. **Zero Bottlenecks:** No concourse corridor or turnstile gate exceeds $3.5\text{ persons/m}^2$ crowd density for $>3$ consecutive minutes before automated rerouting and volunteer dispatch occur.
2. **Universal Accessibility:** 100% step-free, sensory-safe navigation routes guaranteed for every registered attendee with accessibility needs.
3. **Sub-Second Operational Action:** Any high-severity security incident or emergency detected by CCTV edge nodes alerts the Organizer Common Operating Picture (COP) within $<100\text{ms}$.

---

## 2. User Roles & Access Control Matrix

The platform strictly segregates capabilities into four distinct Role-Based Access Control (`RBAC`) tiers, enforced via OAuth2/JWT claims (`22_Security_Model.md`):

| Role ID | Role Title | Target Interface | Core Capabilities & Permissions |
| :--- | :--- | :--- | :--- |
| **ROLE_FAN** | General Attendee / Fan | Mobile App (`iOS / Android`) | • Digital ticket scanning & turnstile entry.<br>• Indoor/Outdoor AR dynamic navigation.<br>• Real-time multilingual voice/text AI chat concierge.<br>• Mobile food/beverage ordering & seat delivery tracking.<br>• Emergency evacuation route viewing. |
| **ROLE_VOLUNTEER** | Stadium Volunteer / Field Staff | Mobile App (`iOS / Android - Staff Mode`) | • All `ROLE_FAN` capabilities.<br>• Receive real-time task dispatch assignments (e.g., "Clear Gate C bottleneck").<br>• Report physical incidents (medical, maintenance, security) with GPS/beacon location.<br>• View local zone crowd density heatmaps. |
| **ROLE_ORGANIZER** | Venue Director / Command Staff | Web Dashboard (`Next.js 3D COP`) | • View unified 3D digital twin of entire stadium with real-time CV heatmaps.<br>• Override AI route generation and manually lock/unlock gates.<br>• Broadcast instant multi-zone audio/visual emergency alerts.<br>• Audit live volunteer dispatch queues and HVAC/lighting sustainability metrics. |
| **ROLE_RESPONDER** | First Responder (Police / Fire / Medical) | Web Dashboard & Emergency Mobile View | • Dedicated CAD (Computer-Aided Dispatch) emergency view.<br>• Real-time weapon detection bounding box feeds from edge CV nodes.<br>• Automated clearance route mapping (`Green Corridors`) from ingress gates to incident coordinates. |

---

## 3. Comprehensive Functional Requirements Specification

Every requirement below must be implemented without modification or guessing (`30_Antigravity_Rules.md`). Traceability targets map directly to database schemas (`11_Backend_Schema.md`, `12_Firestore_Schema.md`), APIs (`13_API_Specification.md`), or UI components (`10_Component_Library.md`).

### 3.1 Pillar 1: Navigation & Wayfinding (`FR-NAV`)

| Req ID | Requirement Title | Detailed Functional Specification | Priority | Traceability Target |
| :--- | :--- | :--- | :--- | :--- |
| **FR-NAV-001** | Indoor Positioning Localization | The mobile app must calculate the user's real-time indoor location within $\pm 1.5\text{m}$ accuracy using a combination of BLE beacon trilateration (spaced at 10m intervals), Wi-Fi Round Trip Time (RTT), and smartphone inertial measurement sensors (IMU). | **P0 (Critical)** | `07_App_Flow.md` (`NavigationState`)<br>`12_Firestore_Schema.md` (`beacons`) |
| **FR-NAV-002** | Dynamic Graph Pathfinding | The routing engine must compute pathfinding routes using an adapted `A*` algorithm where edge weights ($W_{edge}$) represent real-time concourse traversal times derived dynamically from Computer Vision crowd density metrics ($D_{crowd}$). If a corridor crosses $>2.5\text{ persons/m}^2$, the edge weight doubles automatically. | **P0 (Critical)** | `13_API_Specification.md` (`POST /api/v1/navigation/route`)<br>`11_Backend_Schema.md` (`stadium_routing_edges`) |
| **FR-NAV-003** | Augmented Reality (AR) Overlay | The mobile app must render an AR camera view displaying 3D directional chevrons (`#00F0FF` primary cyan token) pinned directly onto the physical concourse floor, indicating the exact step-by-step path to the selected seat, gate, or restroom. | **P1 (High)** | `10_Component_Library.md` (`ARNavigationOverlay`)<br>`03_UI_UX_Design_System.md` (`Tokens`) |
| **FR-NAV-004** | Off-Route Recalculation | If the user deviates $>5\text{m}$ from the active calculated route for $>3$ seconds, the application must automatically recalculate and push a new path within $<100\text{ms}$ without requiring manual user intervention. | **P0 (Critical)** | `21_State_Management.md` (`useNavigationStore`) |

---

### 3.2 Pillar 2: Crowd & Queue Management (`FR-CRD`)

| Req ID | Requirement Title | Detailed Functional Specification | Priority | Traceability Target |
| :--- | :--- | :--- | :--- | :--- |
| **FR-CRD-001** | Edge Queue Depth Ingestion | The backend must ingest compressed `CrowdAlertPayload` events (`19_Event_Architecture.md`) broadcast by edge CV nodes every 1,000ms via Google Cloud Pub/Sub, updating real-time queue depth (`personCount`) and density ($\text{persons/m}^2$) per zone. | **P0 (Critical)** | `17_Computer_Vision_Pipeline.md`<br>`12_Firestore_Schema.md` (`zones`) |
| **FR-CRD-002** | Automated Digital Signage Throttling | When a gate or concourse zone crosses $D_{crowd} \ge 3.0\text{ persons/m}^2$ (`WARNING` state), the system must automatically dispatch BACnet/Modbus commands (`19_Event_Architecture.md`) to digital overhead signs directing approaching fans to alternate entry gates. | **P0 (Critical)** | `19_Event_Architecture.md` (`stadium.bms.commands`) |
| **FR-CRD-003** | Concession & Restroom Wait Time Prediction | The system must calculate and display real-time estimated wait times in minutes ($T_{wait} = \frac{\text{Queue Depth}}{\text{Historical Throughput Rate}}$) across all mobile app vendor cards and venue digital signs, updating every 30 seconds via `onSnapshot` Firestore listeners. | **P1 (High)** | `10_Component_Library.md` (`VendorCard`)<br>`12_Firestore_Schema.md` (`vendors`) |
| **FR-CRD-004** | Turnstile Ingress/Egress Locking | In the event of a critical localized crowd crush ($D_{crowd} \ge 3.8\text{ persons/m}^2$), the AI system must recommend an emergency turnstile lock/reverse command to the Organizer COP dashboard, requiring single-click human authorization (`ROLE_ORGANIZER`) to execute. | **P0 (Critical)** | `13_API_Specification.md` (`POST /api/v1/cop/gates/override`) |

---

### 3.3 Pillar 3: Accessibility & Inclusion (`FR-ACC`)

| Req ID | Requirement Title | Detailed Functional Specification | Priority | Traceability Target |
| :--- | :--- | :--- | :--- | :--- |
| **FR-ACC-001** | Step-Free Route Guarantee | If a user profile has `requiresWheelchairAccess: true`, the navigation routing engine (`FR-NAV-002`) must strictly filter out all graph edges containing stairs or escalators, utilizing only elevator nodes and ADA-compliant ramps ($\le 1:12$ incline). | **P0 (Critical)** | `11_Backend_Schema.md` (`stadium_routing_edges.is_ada_compliant`) |
| **FR-ACC-002** | Sensory Overload Zone Warnings | The application must continuously monitor real-time acoustic sensor telemetry (decibels dB) and lighting schedules. If a user approaches a zone with $>95\text{ dB}$ noise or active strobe lighting, the app must trigger high-priority haptic vibrations and visual snackbars recommending an alternate quiet route. | **P1 (High)** | `10_Component_Library.md` (`SensoryAlertSnackbar`)<br>`12_Firestore_Schema.md` (`telemetry`) |
| **FR-ACC-003** | Assistive Screen Reader & High-Contrast Compatibility | All mobile and web UI components must achieve 100% compliance with **WCAG 2.2 Level AAA** standards, including minimum $7:1$ color contrast ratios (`03_UI_UX_Design_System.md`), explicit `aria-label` tags on all interactive widgets, and dynamic font scaling up to $200\%$ without clipping. | **P0 (Critical)** | `03_UI_UX_Design_System.md` (`Accessibility Tokens`)<br>`23_Testing_Strategy.md` (`axe-core`) |

---

### 3.4 Pillar 4: Transportation & Parking Orchestration (`FR-TRN`)

| Req ID | Requirement Title | Detailed Functional Specification | Priority | Traceability Target |
| :--- | :--- | :--- | :--- | :--- |
| **FR-TRN-001** | Staggered Egress Notifications | At match conclusion ($T+90\text{ minutes}$), the system must dynamically stagger departure notifications sent to fan mobile devices by tier and seating sector based on real-time transit platform density and parking exit velocity, smoothing egress volume over a 45-minute window. | **P1 (High)** | `15_Agent_Specifications.md` (`CrowdAgent`)<br>`19_Event_Architecture.md` (`stadium.egress.stagger`) |
| **FR-TRN-002** | Geofenced Rideshare Dispatch | The system must integrate with rideshare partner APIs (`Uber / Lyft / Local Taxi`) via webhook events. When a fan requests a rideshare within the stadium geofence, the app must direct them to a specific designated pickup bay (`Bay 1–24`) based on live traffic congestion at parking exits. | **P2 (Medium)** | `13_API_Specification.md` (`GET /api/v1/transport/rideshare-bay`) |

---

### 3.5 Pillar 5: Sustainability & Energy Optimization (`FR-SUS`)

| Req ID | Requirement Title | Detailed Functional Specification | Priority | Traceability Target |
| :--- | :--- | :--- | :--- | :--- |
| **FR-SUS-001** | Autonomous Zero-Occupancy HVAC Throttling | The backend must continuously cross-reference concourse zone occupancy (`personCount`) from CV edge sensors. If a concourse sector or luxury VIP suite registers zero occupancy (`0 persons`) for $\ge 15\text{ consecutive minutes}$, the system must dispatch a BACnet command reducing HVAC airflow by $50\%$ and dimming LED lighting to $20\%$. | **P1 (High)** | `19_Event_Architecture.md` (`stadium.bms.commands`)<br>`11_Backend_Schema.md` (`stadium_zones`) |
| **FR-SUS-002** | Real-Time Carbon & Power Telemetry Dashboard | The Organizer COP (`apps/web`) must display live real-time metrics summarizing cumulative kilowatt-hours ($\text{kWh}$) saved, water usage anomalies detected via IoT flow meters, and carbon offset tonnage ($\text{CO}_2\text{e}$) achieved during the event lifecycle. | **P2 (Medium)** | `10_Component_Library.md` (`SustainabilityMetricsWidget`)<br>`12_Firestore_Schema.md` (`analytics`) |

---

### 3.6 Pillar 6: Multilingual AI Concierge (`FR-LAN`)

| Req ID | Requirement Title | Detailed Functional Specification | Priority | Traceability Target |
| :--- | :--- | :--- | :--- | :--- |
| **FR-LAN-001** | 40+ Language Conversational AI Router | The mobile application must provide a chat interface (`AIChatSheet`) connected via WebSockets (`20_WebSocket_Flow.md`) to the Vertex AI / Gemini 1.5 Pro & Flash AI Router (`14_AI_Architecture.md`), supporting instant query resolution across 40+ global dialects with $<200\text{ms}$ Time-To-First-Token (TTFT). | **P0 (Critical)** | `14_AI_Architecture.md` (`AIRouter`)<br>`10_Component_Library.md` (`AIChatSheet`) |
| **FR-LAN-002** | Real-Time Speech-to-Speech Translation | The application must allow volunteer and medical staff (`ROLE_VOLUNTEER`, `ROLE_RESPONDER`) to hold a dual-channel audio conversation with an international attendee, capturing audio via device microphone, streaming to Vertex AI speech-to-text, translating via Gemini 1.5 Flash, and synthesizing text-to-speech in the target language within $<800\text{ms}$ total round-trip latency. | **P1 (High)** | `13_API_Specification.md` (`WSS /api/v1/ai/speech-translate`) |
| **FR-LAN-003** | RAG-Grounded Operational Context | All AI query responses must be strictly grounded (`18_RAG_Architecture.md`) using high-dimensional embeddings (`text-embedding-004`) over verified venue SOPs, food/beverage menus, seating diagrams, and live Firestore wait times, preventing hallucinations regarding venue facilities. | **P0 (Critical)** | `18_RAG_Architecture.md`<br>`16_Prompt_Library.md` (`RAG_CONCIERGE_SYSTEM_PROMPT`) |

---

### 3.7 Pillar 7: Operational Intelligence & COP Command Center (`FR-COP`)

| Req ID | Requirement Title | Detailed Functional Specification | Priority | Traceability Target |
| :--- | :--- | :--- | :--- | :--- |
| **FR-COP-001** | 3D Digital Twin Stadium Canvas | The web command center (`apps/web`) must render an interactive, 60 FPS 3D digital twin of the stadium (`WebGL / Three.js / Mapbox GL`), allowing `ROLE_ORGANIZER` users to rotate, zoom, and slice physical seating tiers, visualizing live crowd density heatmaps overlaid directly onto concourse floor geometries. | **P0 (Critical)** | `10_Component_Library.md` (`Stadium3DCanvas`)<br>`03_UI_UX_Design_System.md` (`Dashboard Rules`) |
| **FR-COP-002** | Autonomous Volunteer Dispatch Engine | When a localized incident (spill, medical emergency, gate queue surge) is detected via CV or submitted via mobile app, the `DispatchAgent` (`15_Agent_Specifications.md`) must automatically select the nearest qualified, on-duty volunteer within $100\text{m}$ based on real-time GPS/BLE coordinates and push an actionable dispatch ticket via high-priority FCM notification within $<50\text{ms}$. | **P0 (Critical)** | `15_Agent_Specifications.md` (`DispatchAgent`)<br>`12_Firestore_Schema.md` (`dispatches`) |
| **FR-COP-003** | Full Operational Playback & Audit Trail | Every system state change, AI decision override, volunteer dispatch acknowledgment, and gate turnstile command must be immutably recorded in PostgreSQL audit logs (`11_Backend_Schema.md`) with precise UTC timestamps, allowing command staff to execute a second-by-second historical playback slider inside the 3D COP canvas after the event. | **P1 (High)** | `11_Backend_Schema.md` (`audit_logs`)<br>`13_API_Specification.md` (`GET /api/v1/cop/playback`) |

---

### 3.8 Pillar 8: Real-Time Decision Support & Emergency Response (`FR-EMR`)

| Req ID | Requirement Title | Detailed Functional Specification | Priority | Traceability Target |
| :--- | :--- | :--- | :--- | :--- |
| **FR-EMR-001** | Automated Incident Detection & Escalation | If an edge CV node detects a weapon bounding box (`Confidence > 0.85`), a fire/smoke plume, or a structural compromise (`17_Computer_Vision_Pipeline.md`), the system must immediately trigger a `CRITICAL_EMERGENCY` event, overriding normal COP dashboard views and presenting an audible alarm and live video verification feed to the command officer within $<100\text{ms}$. | **P0 (Critical)** | `19_Event_Architecture.md` (`stadium.cv.incident`)<br>`20_WebSocket_Flow.md` (`EMERGENCY_OVERRIDE`) |
| **FR-EMR-002** | Dynamic Emergency Evacuation Rerouting | Upon confirmation of an active evacuation order (`ROLE_ORGANIZER` override or autonomous critical trigger), all mobile client apps (`ROLE_FAN`, `ROLE_VOLUNTEER`) must immediately switch to `EmergencyEvacBanner` view (`03_UI_UX_Design_System.md`), locking out non-emergency features and providing high-contrast red (`#FF1E1E`) directional arrows directing users away from the incident zone toward the closest safe exterior gate. | **P0 (Critical)** | `07_App_Flow.md` (`EmergencyState`)<br>`10_Component_Library.md` (`EmergencyEvacBanner`) |
| **FR-EMR-003** | First Responder Green Corridor Synchronization | When emergency medical or police teams (`ROLE_RESPONDER`) are dispatched from exterior gates to an interior stadium zone, VisionOS must automatically broadcast concourse alerts ordering volunteers (`ROLE_VOLUNTEER`) to clear a $4\text{m}$-wide path (`Green Corridor`) along the designated responder route $60\text{ seconds}$ prior to their physical arrival. | **P1 (High)** | `15_Agent_Specifications.md` (`CrowdAgent`)<br>`12_Firestore_Schema.md` (`corridors`) |

---

## 4. Feature Prioritization Matrix

```mermaid
quadrantChart
  title VisionOS Functional Feature Prioritization Matrix
  x-axis Low Implementation Complexity --> High Implementation Complexity
  y-axis Low Operational Impact --> High Operational Impact
  quadrant-1 Strategic Bets (Execute Phased)
  quadrant-2 Core Foundations (Immediate P0 Execution)
  quadrant-3 Low Priority / Backlog
  quadrant-4 Tactical Quick Wins (Execute Early)
  
  "BLE/UWB Localization (FR-NAV-001)": [0.4, 0.95]
  "Dynamic Graph A* Routing (FR-NAV-002)": [0.45, 0.92]
  "Edge CV Queue Ingestion (FR-CRD-001)": [0.35, 0.96]
  "Emergency Evac Rerouting (FR-EMR-002)": [0.38, 0.98]
  "WCAG Level AAA Accessibility (FR-ACC-003)": [0.25, 0.90]
  "Gemini Multilingual Chat (FR-LAN-001)": [0.30, 0.88]
  "3D Digital Twin Canvas (FR-COP-001)": [0.75, 0.94]
  "RAG Operational Grounding (FR-LAN-003)": [0.55, 0.89]
  "Speech-to-Speech Translation (FR-LAN-002)": [0.65, 0.82]
  "Autonomous HVAC Throttling (FR-SUS-001)": [0.40, 0.75]
  "Staggered Egress Routing (FR-TRN-001)": [0.50, 0.78]
  "Geofenced Rideshare Bays (FR-TRN-002)": [0.35, 0.60]
  "Carbon Telemetry Dashboard (FR-SUS-002)": [0.28, 0.55]
```
