# 28_Task_Breakdown: VisionOS Granular Engineering Backlog (`Jira / Linear`)

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Granular Task Breakdown, Jira / Linear Backlog, Story Points (`Fibonacci`), & Gherkin Acceptance Criteria |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Engineering Manager, Lead Product Architect |
| **Purpose** | To provide exact, actionable Jira/Linear ticket definitions across all 7 engineering pods, including Fibonacci story points ($1, 2, 3, 5, 8$), assigned technical owners, and testable Gherkin acceptance criteria (`Given/When/Then`). |
| **Scope** | Enforced across sprint planning for Sprints 1 through 6 (`27_Sprint_Plan.md`). |
| **Assumptions** | 1. No task exceeding **8 story points** may enter a sprint backlog; tasks $>8\text{ points}$ must be split into component-level subtasks.<br>2. Every ticket must explicitly reference its corresponding PRD requirement ID (`FR-xxx-xxx`) to ensure $100\%$ traceability (`01_PRD.md`). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `27_Sprint_Plan.md` — 12-Week Roadmap<br>• `29_Coding_Standards.md` — Branching & Commit Governance |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Engineering Manager | Initial release detailing backlog tickets `VIS-101` through `VIS-704` with complete Gherkin specs. |

---

## 1. Pod 1: Frontend & COP Backlog (`apps/web`)

### Ticket `VIS-101`: Implement 60 FPS 3D Digital Twin WebGL Canvas (`FR-COP-001`)
* **Sprint Assigned:** Sprint 4
* **Story Points:** 8
* **Assigned Role:** Lead Frontend Architect (`Pod 1`)
* **PRD Traceability:** `FR-COP-001`, `03_UI_UX_Design_System.md`
* **Description:** Build `Stadium3DCanvas.tsx` inside `apps/web/src/components/cop/` using Three.js / React Three Fiber. The canvas must ingest `activeZonePolygons` and color concourse sectors `#FF1E1E` ($D_{crowd} \ge 3.5$), `#FFAB00` ($2.1 \le D_{crowd} \le 3.4$), or `#00E676` ($D_{crowd} \le 2.0$).
* **Gherkin Acceptance Criteria:**
```gherkin
Given Commander Marcus Vance is logged into the 3D COP (`/cop/dashboard`)
When a concourse zone telemetry update arrives via WebSocket setting `densityPerSqM = 3.6` for `CONCOURSE_B4_EAST`
Then the 3D polygon corresponding to Gate B4 Ring 1 must transition to `#FF1E1E` (`CRITICAL`) within < 50ms
And the WebGL frame rate (`FPS counter`) must not drop below 58 FPS on a standard M3 MacBook Pro
```

---

### Ticket `VIS-102`: Build Emergency Evacuation Lockout Banner Component (`FR-EMR-002`)
* **Sprint Assigned:** Sprint 2
* **Story Points:** 3
* **Assigned Role:** Senior UX Engineer (`Pod 1`)
* **PRD Traceability:** `FR-EMR-002`, `10_Component_Library.md`
* **Description:** Create `EmergencyEvacBanner.tsx` supporting maximum contrast `#FF1E1E` background, `role="alert"`, `aria-live="assertive"`, and explicit ADA step-free routing instructions (`GATE W2`).
* **Gherkin Acceptance Criteria:**
```gherkin
Given a user is browsing concessions on `apps/web` or `apps/mobile`
When the Socket.io gateway emits an `EMERGENCY_OVERRIDE` event with `targetSafeGateNumber = "GATE_W2"`
Then the `EmergencyEvacBanner` must immediately mount at `zIndex: 99999` and cover 100% of the viewport
And all underlying interactive buttons (cart, concessions, chat) must be disabled and aria-hidden
```

---

## 2. Pod 2: Mobile & AR Navigation Backlog (`apps/mobile`)

### Ticket `VIS-201`: Implement AR Camera Navigation Overlay with Pulsing Chevrons (`FR-NAV-003`)
* **Sprint Assigned:** Sprint 5
* **Story Points:** 8
* **Assigned Role:** Senior Mobile Engineer (`Pod 2`)
* **PRD Traceability:** `FR-NAV-003`, `10_Component_Library.md`
* **Description:** Implement `ARNavigationOverlay.tsx` utilizing `expo-camera` and `react-native-reanimated`. Render `#00F0FF` directional chevrons matching the pitch/yaw angle of `activeSteps[currentStepIndex].targetAngleDegrees`.
* **Gherkin Acceptance Criteria:**
```gherkin
Given fan Mateo Vance is walking in Concourse Ring 1 with `ARNavigationOverlay` active
When his calculated step distance decreases from 45m to 12m and target angle shifts to 90 degrees
Then the on-screen `#00F0FF` chevron must rotate smoothly 90 degrees to the right via spring animation
And if Mateo deviates > 5 meters off-route, the HUD must flash `#FF1E1E` with text "OFF ROUTE DETECTED"
```

---

### Ticket `VIS-202`: Implement Offline MMKV Wayfinding Graph Traversal Engine (`FR-NAV-001`)
* **Sprint Assigned:** Sprint 3
* **Story Points:** 5
* **Assigned Role:** Senior Mobile Engineer (`Pod 2`)
* **PRD Traceability:** `FR-NAV-001`, `21_State_Management.md`
* **Description:** Build `useNavigationStore.ts` to execute local $A^*$ pathfinding against `stadium_graph.json` stored in `react-native-mmkv` when `NetInfo.isConnected == false`.
* **Gherkin Acceptance Criteria:**
```gherkin
Given a fan's iPhone enters an underground stadium elevator shaft where cellular signal drops (`0 Mbps`)
When the fan requests directions from `NODE_GATE_B4_ENTRY` to `NODE_SEAT_112_ROW_12`
Then `useNavigationStore` must compute the path locally against MMKV storage in < 30ms
And the resulting path must accurately reflect ADA step-free requirements without throwing network errors
```

---

## 3. Pod 3: Backend & Database Backlog (`apps/api-gateway`)

### Ticket `VIS-301`: Deploy Cloud SQL PostGIS DDLs & Row-Level Security Policies (`FR-SEC-003`)
* **Sprint Assigned:** Sprint 1
* **Story Points:** 5
* **Assigned Role:** Lead Database Architect (`Pod 3`)
* **PRD Traceability:** `FR-SEC-003`, `11_Backend_Schema.md`
* **Description:** Execute SQL migrations for `stadium_sectors`, `stadium_zones`, `volunteer_dispatches`, and `audit_logs`. Enable PostGIS `GIST` indexes and PostgreSQL Row-Level Security (`RLS`).
* **Gherkin Acceptance Criteria:**
```gherkin
Given `volunteer_dispatches` table has RLS policies enabled
When volunteer Sarah Jenkins (`sub: usr_sarah_01`) queries `SELECT * FROM volunteer_dispatches`
Then PostgreSQL must return only rows where `volunteer_id` matches her profile ID
And any attempt to `UPDATE` or `DELETE` rows inside `audit_logs` must throw SQL permission error `42501`
```

---

### Ticket `VIS-302`: Build Socket.io v4 JWT Auth & Redis Room Gateway (`FR-EMR-001`)
* **Sprint Assigned:** Sprint 2
* **Story Points:** 8
* **Assigned Role:** Lead API Architect (`Pod 3`)
* **PRD Traceability:** `FR-EMR-001`, `20_WebSocket_Flow.md`
* **Description:** Implement `apps/api-gateway/src/websocket/server.ts` utilizing `@socket.io/redis-adapter`. Verify OAuth2 JWT signatures on handshake and auto-join sockets to `sector:{code}` and `global:stadium` rooms.
* **Gherkin Acceptance Criteria:**
```gherkin
Given 120,000 simulated k6 WebSocket connections active across `apps/api-gateway` cluster
When `broadcastEmergencyOverride()` is triggered by Commander Vance via `POST /api/v1/cop/emergency/trigger`
Then 99% of connected client sockets must receive the `EMERGENCY_OVERRIDE` event in < 50ms (`P99 SLA`)
```

---

## 4. Pod 4: AI & RAG Router Backlog (`packages/ai-router`)

### Ticket `VIS-401`: Implement Three-Tier LLM Router & Vertex AI Function Calling (`FR-LAN-003`)
* **Sprint Assigned:** Sprint 3
* **Story Points:** 8
* **Assigned Role:** AI Systems Architect (`Pod 4`)
* **PRD Traceability:** `FR-LAN-003`, `14_AI_Architecture.md`
* **Description:** Build `packages/ai-router` integrating ScaNN L1 cache, Gemini 1.5 Flash (`gemini-1.5-flash-002`), and function tools (`get_zone_crowd_density`, `compute_accessible_route`).
* **Gherkin Acceptance Criteria:**
```gherkin
Given a Japanese fan submits PTT audio string "ゲート4はどこですか？" ("Where is Gate 4?")
When `packages/ai-router` receives the request over WebSocket
Then the system must execute `compute_accessible_route()` tool against local graph and stream natural Japanese translation
And total Time-To-First-Token (`TTFT`) must remain < 180ms without any hallucinated gate numbers
```

---

### Ticket `VIS-402`: Build LangGraph `CrowdAgent` with Automatic BMS Signage Throttling (`FR-CRD-002`)
* **Sprint Assigned:** Sprint 4
* **Story Points:** 5
* **Assigned Role:** Senior LLM Engineer (`Pod 4`)
* **PRD Traceability:** `FR-CRD-002`, `15_Agent_Specifications.md`
* **Description:** Implement `crowdAgentGraph` (`LangGraph`) listening to `stadium.cv.crowd_surge` Pub/Sub topic. If $D_{crowd} \ge 2.1$, publish `SET_SIGNAGE_MODE` command to `stadium.bms.commands`.
* **Gherkin Acceptance Criteria:**
```gherkin
Given `CrowdAgent` is ingesting $1\text{ Hz}$ telemetry from Jetson nodes monitoring Concourse Ring 1
When `currentDensityPerSqM` crosses `2.2 p/m²` for `CONCOURSE_B4_EAST`
Then `CrowdAgent` must automatically publish `stadium.bms.commands` payload setting signage mode to `ALTERNATE_ROUTING` within < 1.0 second
```

---

## 5. Pod 5, Pod 6 & Pod 7 Backlog (`Edge CV, BMS & DevOps`)

| Ticket ID | Pod Assigned | Sprint | Story Points | Task Title & PRD Traceability | Exact Gherkin Acceptance Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`VIS-501`** | **Pod 5 (`Edge CV`)** | Sprint 2 | 8 | DeepStream 7.0 Pipeline & YOLOv9 ONNX (`FR-CRD-001`, `17_Computer_Vision_Pipeline.md`) | `Given 8 simultaneous 1080p@30FPS RTSP camera feeds entering Jetson AGX Orin, When DeepStream 7.0 runs YOLOv9 inference, Then GPU utilization remains < 45% with frame latency < 15ms.` |
| **`VIS-502`** | **Pod 5 (`Edge CV`)** | Sprint 2 | 5 | CUDA Real-Time Face Blurring Plugin (`FR-SEC-004`, `17_Computer_Vision_Pipeline.md`) | `Given facial bounding boxes detected by secondary GIE, When frame leaves NVMM buffer for storage or RTSP out, Then all faces are blurred with 31x31 Gaussian kernel; if CUDA fails, socket terminates instantly.` |
| **`VIS-601`** | **Pod 6 (`BMS Mesh`)** | Sprint 5 | 5 | BACnet/IP HVAC Airflow Throttler Bridge (`FR-SUS-001`, `19_Event_Architecture.md`) | `Given zero concourse occupancy for >= 15 minutes, When SustainabilityAgent emits BMS command, Then apps/bms-gateway executes BACnet WriteProperty reducing supply airflow to 50% cleanly over VLAN 104.` |
| **`VIS-701`** | **Pod 7 (`DevOps`)** | Sprint 1 | 5 | Multi-Region Active-Active Terraform HCL (`25_Deployment.md`) | `Given main.tf executed via terraform apply, When us-central1 and us-east4 Cloud Run clusters boot, Then Anycast Load Balancer routes traffic to nearest edge within < 20ms latency.` |
| **`VIS-702`** | **Pod 7 (`DevOps`)** | Sprint 6 | 8 | k6 120,000 Concurrent Sockets Stress Script (`23_Testing_Strategy.md`) | `Given 120,000 simulated WebSocket VUs hitting Cloud Run API Gateway cluster, When 1 Hz concourse density bursts are emitted, Then P95 handshake and push latency remains < 50ms with 0 pod crashes.` |
