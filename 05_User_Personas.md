# 05_User_Personas: VisionOS User Access Profiles & Persona Matrix

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise User Personas & Role-Based Access Control (RBAC) Profiles |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead Product Architect, Principal UX Designer |
| **Purpose** | To define specific, empirically grounded user personas across all four RBAC tiers (`ROLE_FAN`, `ROLE_VOLUNTEER`, `ROLE_ORGANIZER`, `ROLE_RESPONDER`), mapping their hardware environments, cognitive stress levels, goals, and precise system permissions. |
| **Scope** | Enforced across user authentication claims (`22_Security_Model.md`), mobile UI feature toggles (`apps/mobile`), and web command center views (`apps/web`). |
| **Assumptions** | 1. Users exhibit wide variation in tech literacy, ranging from first-time smartphone users to senior DevOps command center operators.<br>2. Device constraints vary from budget Android handsets running on 3G fallback to high-end Apple iPad Pros / multi-monitor desktop workstations. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `04_UX_Research.md` — Field Study Findings<br>• `22_Security_Model.md` — Security & RBAC Claims |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead Product Architect | Initial production release of the 4 primary VisionOS Personas (`Mateo`, `Sarah`, `Marcus`, `Elena`). |

---

## 1. Persona & Role Matrix Overview

Every interface and API endpoint in VisionOS is tailored to serve one of four distinct archetypes. To prevent ambiguity, each persona maps directly to a strict JWT role claim (`22_Security_Model.md`):

```mermaid
graph TD
  subgraph UserTiers [VisionOS Role-Based Access Control Tiers]
    Fan[`ROLE_FAN`<br>General Attendee]
    Volunteer[`ROLE_VOLUNTEER`<br>Field Staff & Stewards]
    Organizer[`ROLE_ORGANIZER`<br>Venue Command Directors]
    Responder[`ROLE_RESPONDER`<br>Police / Fire / Paramedics]
  end

  subgraph TargetDevices [Primary Hardware Interface]
    MobileApp[React Native Mobile App (`iOS / Android`)]
    WebDashboard[Next.js 3D Command Center (`Desktop WebGL`)]
    CADInterface[Emergency CAD Mobile / Web Overlay]
  end

  Fan -->|Consumer Mode| MobileApp
  Volunteer -->|Staff Mode (`JWT Scope`)| MobileApp
  Organizer -->|Full Administration| WebDashboard
  Responder -->|Priority Green Corridor| CADInterface
```

| Persona Name | Primary Role ID | Target Hardware / Device | Cognitive Stress Level | Primary Operational Goal | System Permission Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mateo Silva** | `ROLE_FAN` | iPhone 14 / Samsung Galaxy A54 | **High (Pre-Match / Ingress)** | Enter stadium without delay, find assigned seat, purchase concessions, and navigate step-free routes. | Read-Only: Zone wait times, personal ticket, AR navigation, public concessions catalog. Write: Personal chat queries, concession orders. |
| **Sarah Jenkins** | `ROLE_VOLUNTEER` | Motorola Edge / iPad Mini (Field Issued) | **Moderate to High (Crowd Management)** | Resolve attendee bottlenecks, execute automated dispatch orders, and bridge language gaps. | Read-Only: Local sector crowd heatmaps, volunteer rosters. Write: Incident reports, dispatch acknowledgments, multilingual PTT translation. |
| **Marcus Vance** | `ROLE_ORGANIZER` | Triple-Monitor 4K Desktop Workstation (`Chrome`) | **Constant High (Continuous Event Monitoring)** | Maintain 100% venue safety, prevent crowd crush hazards, optimize HVAC sustainability, and audit all logs. | Full Admin (`*`): 3D COP manipulation, gate turnstile overrides, emergency broadcast triggers, BMS automation controls. |
| **Capt. Elena Rostova** | `ROLE_RESPONDER` | Ruggedized Panasonic Toughbook / iPhone 15 Pro | **Extreme (Active Incident Execution)** | Reach medical or security incidents in $<3\text{ minutes}$ via cleared Green Corridors. | Read-Only: Real-time CV weapon/incident bounding boxes, live CCTV feeds, cleared evacuation corridors. Write: Responder arrival check-ins, CAD status. |

---

## 2. Detailed Persona Specifications

### 2.1 Persona 1: Mateo Silva — The International Fan (`ROLE_FAN`)
* **Demographics & Background:** Age 34, software consultant from Buenos Aires, Argentina. Attending the World Cup match with his 68-year-old father who requires ADA wheelchair accommodations. Speaks fluent Spanish and intermediate English.
* **Hardware & Connectivity:** iPhone 14 Pro (`iOS 17`). Roaming international e-SIM (`limited high-speed data`). Relies heavily on stadium Wi-Fi 6E.
* **Cognitive Load & Behavioral Context:** Highly excited but anxious about missing kickoff due to long turnstile lines (`FR-CRD-001`). Extremely protective of his father and terrified of getting stuck in a dense, claustrophobic concourse tunnel with a wheelchair (`04_UX_Research.md`).
* **Core Goals:**
  1. Download and cache tickets & wheelchair navigation routes offline (`MMKV`) before entering the stadium perimeter.
  2. Follow step-free AR floor chevrons (`#00F0FF`) straight to Sector 112 without hitting stairs or elevators with $>10\text{ min}$ wait times.
  3. Use voice AI translation (`Gemini`) to order low-sodium Halal food from a local English-speaking concession vendor.
* **Friction & Pain Points (Legacy Systems):**
  * Top-of-screen text navigation ("Proceed north 500ft then turn right") is useless when pushing a wheelchair through a moving crowd of 10,000 people.
  * Sudden network dropouts at the turnstile gate cause his ticket QR code app to spin indefinitely.
* **Direct VisionOS Feature Mapping:**
  * `FR-NAV-003` (`ARNavigationOverlay`): Step-free AR floor chevrons projected on his camera screen.
  * `FR-ACC-001` (`Step-Free Route Guarantee`): Graph pathfinder strictly filters out all stairs and escalators.
  * `FR-LAN-001` (`Multilingual AI Concierge`): Instant Spanish-to-English text/voice queries answered in $<200\text{ms}$.

---

### 2.2 Persona 2: Sarah Jenkins — The Field Volunteer (`ROLE_VOLUNTEER`)
* **Demographics & Background:** Age 22, local university sports management student volunteering as a Sector B Concourse Steward. Has completed a 4-hour basic safety training course but has no prior military or police training.
* **Hardware & Connectivity:** Stadium-issued ruggedized Motorola Edge (`Android 14`). Connected via private stadium 5G cellular network (`high reliability`).
* **Cognitive Load & Behavioral Context:** Eager to help, but easily overwhelmed when dozens of frustrated, non-English-speaking fans surround her simultaneously asking for directions or medical aid during halftime (`04_UX_Research.md`).
* **Core Goals:**
  1. Receive clear, unambiguous, single-action task dispatch alerts (`DispatchAgent`) showing her exact GPS path to an active incident or bottleneck (`FR-COP-002`).
  2. Use Push-to-Talk (`PTT`) speech translation to instantly communicate with Japanese, Arabic, and Portuguese fans without typing on her screen while wearing field gloves (`FR-LAN-002`).
  3. Quickly report a physical hazard (e.g., spilled soda on concourse stairs) to maintenance in two taps with automatic BLE beacon location tagging.
* **Friction & Pain Points (Legacy Systems):**
  * Static walkie-talkie radios (`UHF/VHF`) are completely garbled and unintelligible when concourse crowd noise exceeds $100\text{ dB}$.
  * Multi-page web reporting forms require typing complex incident descriptions while standing in a moving crowd.
* **Direct VisionOS Feature Mapping:**
  * `FR-COP-002` (`Autonomous Volunteer Dispatch`): Receives actionable task tickets (`[Clear Gate B4 Surge - 80m away]`) with one-tap acknowledgment.
  * `FR-LAN-002` (`Speech-to-Speech Translation`): Dual-channel audio translation bridging language gaps in $<800\text{ms}$.
  * `10_Component_Library.md` (`QuickReportModal`): Two-tap hazard reporting with automatic BLE anchor location injection.

---

### 2.3 Persona 3: Commander Marcus Vance — The Venue Director (`ROLE_ORGANIZER`)
* **Demographics & Background:** Age 51, retired municipal police captain with 20+ years managing major sporting venue security. Operates out of the Central Command Center (`COP`) overlooking the pitch.
* **Hardware & Connectivity:** Dedicated triple-monitor workstation running `Next.js 15 Command Center` on Google Chrome via redundant 10GbE fiber LAN.
* **Cognitive Load & Behavioral Context:** Calm under pressure, but constantly monitoring dozens of competing priorities: turnstile ingress rates, crowd density heatmaps, VIP motorcade arrivals, and HVAC sustainability targets (`00_Project_Vision.md`). Requires zero-latency, high-signal data visualization without visual clutter (`03_UI_UX_Design_System.md`).
* **Core Goals:**
  1. Monitor real-time crowd density across all 85,000 seats and 120,000 m² of concourse space on a single 60 FPS 3D digital twin canvas (`FR-COP-001`).
  2. Instantly identify and preemptively disperse concourse surges before they reach the critical $3.5\text{ persons/m}^2$ crush threshold (`FR-CRD-002`).
  3. Execute single-click gate turnstile lock/reverse overrides and initiate stadium-wide evacuation routing (`FR-EMR-002`) during verified critical emergencies.
* **Friction & Pain Points (Legacy Systems):**
  * Toggle-fatigue across 8 disjointed legacy software screens (CCTV client, ticketing dashboard, BMS HVAC console, CAD police dispatch).
  * Lack of predictive intelligence: legacy systems only alert after a crush or fight has already occurred.
* **Direct VisionOS Feature Mapping:**
  * `FR-COP-001` (`3D Digital Twin Canvas`): Unified spatial visualization displaying CV crowd density polygons overlaid on 3D venue geometry.
  * `15_Agent_Specifications.md` (`CrowdAgent`): Predictive alerts warning Commander Vance $10\text{ minutes}$ *before* a bottleneck crosses critical thresholds based on ingress flow velocity ($V_{flow}$).
  * `FR-EMR-001` (`Automated Incident Override`): Sub-$100\text{ms}$ alert escalation upon edge CV weapon or smoke detection (`17_Computer_Vision_Pipeline.md`).

---

### 2.4 Persona 4: Captain Elena Rostova — First Responder (`ROLE_RESPONDER`)
* **Demographics & Background:** Age 40, Tactical Paramedic Commander and Police Liaison assigned to Stadium Sector West. Leading a 6-person mobile rapid response medical squad.
* **Hardware & Connectivity:** Ruggedized Panasonic Toughbook (Vehicle/Command Post) and iPhone 15 Pro (`iOS 17`) connected via dedicated FirstNet / Emergency Cellular Priority QoS band (`22_Security_Model.md`).
* **Cognitive Load & Behavioral Context:** Extreme cognitive load during active medical or security emergencies. Cannot afford to look at a screen for more than $2\text{ seconds}$ while sprinting through a concourse carrying $40\text{ lbs}$ of trauma gear (`04_UX_Research.md`).
* **Core Goals:**
  1. Receive instantaneous CAD alerts showing the exact spatial coordinate (`Zone B4 - Level 2 - Near Column 18`) of a reported cardiac arrest or security threat (`FR-EMR-001`).
  2. Navigate along an automatically cleared **Green Corridor (`FR-EMR-003`)**, where volunteers have already parted the crowd $60\text{ seconds}$ ahead of her squad.
  3. View real-time bounding box snapshots (`17_Computer_Vision_Pipeline.md`) of an active threat or patient location directly on her mobile lockscreen via high-priority WebSockets (`20_WebSocket_Flow.md`).
* **Friction & Pain Points (Legacy Systems):**
  * Reaching an interior stadium concourse during halftime requires fighting through 15,000 shoulder-to-shoulder fans without any advance corridor clearing.
  * Vague radio descriptions ("We have a medical emergency somewhere near the south hotdog stand") delay triage by $5\text{ to }10\text{ minutes}$.
* **Direct VisionOS Feature Mapping:**
  * `FR-EMR-003` (`Green Corridor Synchronization`): Automated concourse alerts ordering `ROLE_VOLUNTEER` staff to clear a $4\text{m}$ path $60\text{ seconds}$ prior to her squad's physical arrival.
  * `20_WebSocket_Flow.md` (`EMERGENCY_OVERRIDE` push): Instant lockscreen notifications displaying exact BLE anchor coordinates (`Anchor #1042`).

---

## 3. Role-Based Permission Matrix (`RBAC` Claims)

The exact JSON Web Token (`JWT`) permissions enforced across `apps/api-gateway` (`22_Security_Model.md`) map strictly to these four personas:

| API Gateway Endpoint Category | `ROLE_FAN` (`Mateo`) | `ROLE_VOLUNTEER` (`Sarah`) | `ROLE_ORGANIZER` (`Marcus`) | `ROLE_RESPONDER` (`Elena`) |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/zones/heatmaps` | ❌ Denied (`403`) | ✔️ Allowed (Local Sector Only) | ✔️ Allowed (Full Stadium `*`) | ✔️ Allowed (Full Stadium `*`) |
| `GET /api/v1/navigation/route` | ✔️ Allowed (`A*` Route) | ✔️ Allowed (`A*` Route) | ✔️ Allowed (`A*` Route) | ✔️ Allowed (Priority `Green Corridor`) |
| `POST /api/v1/dispatches/ack` | ❌ Denied (`403`) | ✔️ Allowed (Assigned Tickets) | ✔️ Allowed (All Tickets) | ✔️ Allowed (All Tickets) |
| `POST /api/v1/cop/gates/override` | ❌ Denied (`403`) | ❌ Denied (`403`) | ✔️ Allowed (Full Admin `*`) | ❌ Denied (`403`) |
| `POST /api/v1/cop/emergency/trigger` | ❌ Denied (`403`) | ❌ Denied (`403`) | ✔️ Allowed (Full Admin `*`) | ✔️ Allowed (Medical/Threat Trigger) |
| `WSS /api/v1/ai/speech-translate` | ✔️ Allowed (Standard Rate Limit) | ✔️ Allowed (Priority Rate Limit) | ✔️ Allowed (Priority Rate Limit) | ✔️ Allowed (Unlimited Rate Limit) |
