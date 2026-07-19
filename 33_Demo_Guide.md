# 33_Demo_Guide: VisionOS Live Demonstration & Walkthrough Script

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Live Demonstration Walkthrough, Synthetic Crowd Surge Injection Scripts, & Fallback Protocols |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead Product Architect, Principal UX Designer |
| **Purpose** | To provide an exhaustive, minute-by-minute execution script for demonstrating VisionOS to FIFA Executive Delegates, Venue Operating Directors, and Municipal Safety Boards. |
| **Scope** | Covers live execution across `apps/mobile` (`Fan & Volunteer App`), `apps/web` (`3D Digital Twin COP`), and terminal synthetic data injection (`curl`). |
| **Assumptions** | 1. The demo runs on live Google Cloud Run staging infrastructure (`us-central1`) connected to real Jetson AGX Orin test benches.<br>2. To guarantee flawless timing during executive presentations, all synthetic crowd surge payloads are pre-loaded via `curl` terminal scripts. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `08_User_Journeys.md` — End-to-End Workflows<br>• `13_API_Specification.md` — REST & WebSocket Payloads<br>• `15_Agent_Specifications.md` — Autonomous Swarm |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead Product Architect | Initial release of 15-minute 3-persona demo script and terminal injection curls. |

---

## 1. Demo Environment Setup & Hardware Check

Before inviting stakeholders into the presentation briefing suite, verify that all 3 display screens are mounted and mirroring live staging instances:

* **Screen 1 (Left 4K Monitor):** iPhone 16 Pro mirroring `apps/mobile` running fan persona `Mateo Vance` (`ROLE_FAN`).
* **Screen 2 (Center 8K Video Wall):** MacBook Pro M3 Max driving `apps/web` (`/cop/dashboard`) running Commander persona `Marcus Vance` (`ROLE_ORGANIZER`).
* **Screen 3 (Right iPad Pro):** iPad Pro mirroring `apps/mobile` running volunteer steward persona `Sarah Jenkins` (`ROLE_VOLUNTEER`).

---

## 2. Minute-by-Minute Walkthrough Script (`15-Minute Timeline`)

### Phase 1: Fan AR Navigation & Multilingual AI Concierge (`00:00 - 05:00`)
* **Speaker Script (Lead Architect):** *"Good afternoon, delegates. We begin with Mateo Vance, an international fan arriving at Gate B4 for the World Cup quarter-final. As Mateo crosses the 500-meter exterior perimeter, his phone automatically verifies his dynamic ECDSA ticket and downloads the 1.2 MB offline wayfinding graph."*
* **Action on Screen 1 (iPhone):** Tap `[Check In at Gate B4]`. Show the rotating $30\text{-second}$ cryptographic QR barcode (`FR-SEC-002`). Then tap `[Launch AR Navigation]`.
* **Visual Result:** The camera view opens. `#00F0FF` pulsing directional chevrons appear projected onto the physical concourse floor plane (`FR-NAV-003`).
* **Speaker Script:** *"Mateo needs wheelchair step-free access and speaks native Rioplatense Spanish. Watch our Three-Tier AI Router resolve his voice query in under 180 milliseconds."*
* **Action on Screen 1:** Hold the `[HOLD TO SPEAK]` button inside `AIChatSheet.tsx` (`10_Component_Library.md`) and speak in Spanish: *"¿Dónde está la parrilla halal y el ascensor más cercano?"* ("Where is the halal grill and nearest elevator?").
* **Visual Result:** The Gemini 1.5 Flash concierge instantly streams a natural Argentine Spanish audio response (`FR-LAN-001`) while executing `compute_accessible_route()` to update the AR chevrons toward Elevator #3.

---

### Phase 2: Autonomous Swarm Hazard Dispatch & Volunteer Response (`05:00 - 10:00`)
* **Speaker Script:** *"Now, let's look at operational self-healing. A soda spill occurs near Elevator #3, creating a slip hazard and crowd bottleneck. Watch how our edge computer vision and LangGraph swarm allocate the task autonomously without human intervention."*
* **Action on Terminal (Lead DevOps Engineer):** Execute synthetic incident injection via `curl`:
```bash
curl -X POST https://api-staging.visionos.ai/api/v1/pubsub/inject \
  -H "Authorization: Bearer $ORGANIZER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "stadium.cv.incident",
    "payload": {
      "incidentId": "inc_demo_spill_01",
      "zoneId": "CONCOURSE_B4_EAST",
      "category": "SPILL",
      "priorityLevel": "P1_HIGH",
      "timestampUtc": "2026-07-13T18:45:12.000Z"
    }
  }'
```
* **Visual Result on Screen 3 (iPad Volunteer App):** Within $48\text{ milliseconds}$, volunteer Sarah Jenkins' screen flashes with a high-priority P1 task card (`15_Agent_Specifications.md`).
* **Action on Screen 3:** Sarah taps `[ACKNOWLEDGE TASK]` and then `[MARK RESOLVED]`.
* **Visual Result on Screen 2 (Center 3D COP):** The yellow warning pin on the 3D WebGL stadium canvas automatically clears back to green (`#00E676`).

---

### Phase 3: Crowd Crush Prevention & Global Emergency Override (`10:00 - 15:00`)
* **Speaker Script:** *"Finally, we demonstrate our highest-severity safety capability: real-time crowd crush prevention and instantaneous emergency preemption across 120,000 devices."*
* **Action on Terminal:** Execute synthetic crowd surge injection ($D_{crowd} = 3.6\text{ p/m}^2$) via `curl`:
```bash
curl -X POST https://api-staging.visionos.ai/api/v1/pubsub/inject \
  -H "Authorization: Bearer $ORGANIZER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "stadium.cv.crowd_surge",
    "payload": {
      "eventId": "surge_demo_099",
      "zoneId": "CONCOURSE_B4_EAST",
      "densityPerSqM": 3.6,
      "timestampUtc": "2026-07-13T18:50:00.000Z"
    }
  }'
```
* **Visual Result on Screen 2 (3D COP):** The Concourse B4 East polygon on Commander Vance's 8K screen turns flashing red (`#FF1E1E`). A critical recommendation banner appears: `[AUTOMATED SAFETY RECOMMENDATION: LOCK GATE B4 TURNSTILES & THROTTLE INGRESS]`.
* **Action on Screen 2:** Commander Vance clicks `[AUTHORIZE LOCK & TRIGGER EMERGENCY EVACUATION TOWARD GATE W2]`.
* **Visual Result on Screen 1 (iPhone) & Screen 3 (iPad):** Within **$42\text{ milliseconds}$** (`20_WebSocket_Flow.md`), both mobile screens lock out all standard tabs (`07_App_Flow.md`). The maximum-contrast `EmergencyEvacBanner.tsx` mounts, displaying huge red/white text: **"⚠️ CRITICAL EMERGENCY — PROCEED IMMEDIATELY TO GATE W2."**

---

## 3. Contingency & Fallback Protocols (`Live Presentation Insurance`)

| Potential Failure Mode | Root Cause Identification | Instant Speaker Fallback Script & Action |
| :--- | :--- | :--- |
| **Wi-Fi Router Spectrum Interference** | Stadium briefing room experiences local Wi-Fi drop due to media broadcasting equipment. | *"As you can see, local Wi-Fi just experienced a drop. Notice on Screen 1 how Mateo's iPhone seamlessly transitions to our offline `NetInfo` MMKV wayfinding graph with zero frame loss or interruption."* (`21_State_Management.md`). |
| **Vertex AI LLM Inference Spike ($> 500\text{ms}$)** | Google Cloud public preview endpoint experiences momentary request queue throttling. | *"Notice how the AI Concierge circuit breaker (`14_AI_Architecture.md`) tripped after 500ms, immediately returning the sub-15ms ScaNN L1 semantic cached answer to maintain instant response velocity."* |
