# 09_Wireframes: VisionOS Structural ASCII & Mermaid Screen Layouts

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Structural Screen Wireframes & Layout Specifications |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Principal UX Designer, Lead Frontend Architect |
| **Purpose** | To provide exact structural layouts, component boundaries, touch target dimensions ($48\text{px}$ minimum), and ergonomic thumb-zone placements across all core mobile (`React Native`) and web (`Next.js 3D COP`) screens. |
| **Scope** | Covers wireframes for 6 foundational UI surfaces: Fan Home Dashboard, AR Indoor Navigation View, Concessions Express Checkout, Volunteer Dispatch Screen, Organizer 3D COP Canvas, and Emergency Evacuation Lockout. |
| **Assumptions** | 1. Mobile wireframes target standard viewport dimensions ($390\times 844\text{px}$, iPhone 14 Pro / Android baseline).<br>2. Web COP wireframes target high-density dual/triple monitor 4K viewports ($1920\times 1080\text{px}$ per screen baseline). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `03_UI_UX_Design_System.md` — Design Tokens & Spacing Matrix<br>• `06_Information_Architecture.md` — Structural Sitemap<br>• `10_Component_Library.md` — Atomic UI Component Contracts |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Principal UX Designer | Initial release of structural ASCII wireframes and exact layout annotations across all 6 core surfaces. |

---

## 1. Mobile Screen Wireframes (`apps/mobile` — $390\times 844\text{px}$)

### 1.1 Screen 1: Fan Home Dashboard (`app/(tabs)/index.tsx`)
The primary check-in interface displaying the dynamic, cryptographically signed ticket QR code (`FR-CRD-001`), match countdown, and quick-action navigation cards.

```
+-------------------------------------------------------+
|  [Logo] VisionOS                18:45 UTC  [VIP Gold] | <- Header (H: 56px)
+-------------------------------------------------------+
|  MATCH DAY: ARGENTINA vs BRAZIL                       | <- Match Banner (`Outfit`)
|  Kickoff in: 00h 45m 12s  |  Gate B4 (Normal Flow)    |
+-------------------------------------------------------+
|                                                       |
|   +-----------------------------------------------+   |
|   |  TICKET PASSBOOK — SECTOR 112, ROW 8, SEAT 4  |   |
|   |                                               |   |
|   |            [ DYNAMIC QR CODE SCANNER ]        |   | <- Dynamic QR (H: 220px)
|   |            ECDSA Verified • Offline Ready     |   |    Updates every 30s
|   |                                               |   |
|   |  [ ADA Wheelchair Step-Free Route Active ]    |   | <- ADA Badge (`#00F0FF`)
|   +-----------------------------------------------+   |
|                                                       |
|  QUICK ACTIONS (Ergonomic Thumb-Zone < 60% Height)    |
|  +-----------------------+  +-----------------------+ |
|  | [Navigate to Seat]    |  | [Order Concessions]   | | <- Primary Cards (H: 80px)
|  | ~12 min walk (A*)     |  | Express Bay 4         | |    Touch: >48x48px
|  +-----------------------+  +-----------------------+ |
+-------------------------------------------------------+
|  [Emergency SOS FAB]      [AIChatSheet Pull-Tab]     | <- Floating Overlays
+-------------------------------------------------------+
|  [ Home ]      [ Navigation ]     [ Concessions ]     | <- Bottom Nav (H: 64px)
+-------------------------------------------------------+
```

### 1.2 Screen 2: AR Indoor Wayfinding View (`app/(tabs)/navigation.tsx`)
When the user switches to navigation mode, the screen renders a live camera feed overlaid with 3D directional vectors (`#00F0FF`) and a bottom summary sheet (`FR-NAV-003`).

```
+-------------------------------------------------------+
|  [< Back]   ACTIVE GUIDANCE: SECTOR 112    [Sound: ON]| <- Header (H: 56px)
+-------------------------------------------------------+
|                                                       |
|     /===========================================\     |
|    /                                             \    |
|   |      [ LIVE CAMERA / AR CONCOURSE VIEW ]      |   |
|   |                                               |   |
|   |                  /\                           |   |
|   |                 /  \                          |   | <- AR Chevron Vectors
|   |                /    \   [#00F0FF Cyan]        |   |    Pinned to Concourse Floor
|   |               /      \                        |   |
|   |              /        \                       |   |
|   |             /__________\                      |   |
|    \                                             /    |
|     \===========================================/     |
|                                                       |
+-------------------------------------------------------+
|  +-----------------------------------------------+    |
|  |  [=== Pull Grabber ===]  (Gorhom Sheet - 35%) |    | <- Bottom Navigation Sheet
|  |  NEXT TURN: In 40 meters, take Elevator #3    |    |    `--color-bg-surface`
|  |  [ADA Step-Free Verified] • Est. Time: 3m 15s |    |
|  |  +-----------------------------------------+  |    |
|  |  | [Reroute via Quiet Zone (<85 dB)]       |  |    | <- Sensory Alert Reroute
|  |  +-----------------------------------------+  |    |    (`FR-ACC-002`)
|  +-----------------------------------------------+    |
+-------------------------------------------------------+
|  [ Home ]      [ Navigation (Active) ]  [ Ordering ]  |
+-------------------------------------------------------+
```

### 1.3 Screen 3: Volunteer Task Dispatch Card (`app/staff/task/[id].tsx`)
The high-signal task execution interface used by Sarah Jenkins (`ROLE_VOLUNTEER`) while clearing concourse bottlenecks (`FR-COP-002`).

```
+-------------------------------------------------------+
|  [< Back]   DISPATCH TICKET #1042        [PTT Audio]  | <- Header (`#FFAB00` Border)
+-------------------------------------------------------+
|  URGENT TASK: CLEAR GATE B4 CONCOURSE SURGE           | <- Task Title (`Outfit`)
|  Priority: P1 HIGH  |  Assigned: 18:42 UTC            |
+-------------------------------------------------------+
|                                                       |
|   +-----------------------------------------------+   |
|   |  LOCATION: Concourse Ring Level 1, Near Col 18|   |
|   |  CURRENT DENSITY: 3.4 persons/m² (WARNING)    |   | <- Real-Time Telemetry HUD
|   |  DISTANCE FROM YOU: 80 meters (~1m 15s walk)  |   |
|   +-----------------------------------------------+   |
|                                                       |
|   INSTRUCTIONS FROM COMMAND CENTER (`Marcus`):        |
|   "Redirect approaching pedestrian traffic toward     |
|    Gate C stairs to relieve Level 1 bottleneck."      |
|                                                       |
|   +-----------------------------------------------+   |
|   | [Open Turn-by-Turn Guidance to Task Zone]     |   | <- Secondary Action (H: 52px)
|   +-----------------------------------------------+   |
|                                                       |
|   +-----------------------------------------------+   |
|   | [ ACKNOWLEDGE & START TASK ] (48x48px Target) |   | <- Primary Action (H: 64px)
|   +-----------------------------------------------+   |    `--color-primary`
+-------------------------------------------------------+
|  [Staff Queue]    [Active Task]    [Hazard Report]    |
+-------------------------------------------------------+
```

---

## 2. Web Command Center Wireframe (`apps/web` — $1920\times 1080\text{px}$)

### 2.1 Screen 4: Organizer 3D COP Dashboard (`app/(cop)/page.tsx`)
The unified spatial command interface for Commander Marcus Vance (`ROLE_ORGANIZER`), utilizing Next.js Parallel Routes (`@drawer`) to keep the central 3D digital twin canvas active ($65\%$ width) while viewing real-time telemetry drawers ($35\%$ width).

```
+-------------------------------------------------------------------------------------------------------+
| [Logo] VisionOS 3D COP | STADIUM STATUS: NOMINAL | Occupancy: 81,420/85,000 | [EMERGENCY EVAC OVERRIDE]| <- Header (H: 64px)
+-------------------------------------------------------------------------------------------------------+
| [Sidebar] |                                                  | [Next.js @drawer/crowd Parallel Slot]  |
| W: 240px  |  3D DIGITAL TWIN STADIUM CANVAS (WebGL 60 FPS)   | Width: 400px Fixed (`.visionos-glass`) |
|           |                                                  |                                        |
| (*) 3D    |         /===============================\        | ZONE ANALYTICS: CONCOURSE RING LEVEL 1 |
|     View  |        /   [#00E676] Green: Normal       \       | +------------------------------------+ |
|           |       /    [#FFAB00] Amber: Warning (3.4) \      | | Active Queue Depth: 420 persons  | |
| ( ) Gates |      |     [#FF1E1E] Red: Critical (3.8)   |     | | Flow Velocity: 1,140/min         | |
|           |      |                                     |     | | Density: 3.4 p/m² (WARNING)      | |
| ( ) Staff |       \                                   /      | +------------------------------------+ |
|           |        \_________________________________/       |                                        |
| ( ) BMS   |                                                  | AUTOMATED BMS COMMANDS (`FR-CRD-002`): |
|     HVAC  |  [Camera Controls: Rotate | Zoom | Tier Slice]   | [x] Digital Signage Throttling Active  |
|           |                                                  | [ ] Turnstile Ingress Lock (Manual)    |
| ( ) Audit |  +--------------------------------------------+  |                                        |
|     Logs  |  | LIVE CCTV/RTSP SNAPSHOT VERIFICATION FEED  |  | +------------------------------------+ |
|           |  | Camera #104 — Concourse Ring 1 (YOLOv9 Box)|  | | [DISPATCH VOLUNTEER TO ZONE]       | |
|           |  +--------------------------------------------+  | +------------------------------------+ |
+-------------------------------------------------------------------------------------------------------+
| [Footer Telemetry] Total kWh Saved: 1,420 | Active Beacons: 1,500/1,500 | Latency p99: 18ms | UTC 18:45|
+-------------------------------------------------------------------------------------------------------+
```

---

## 3. High-Priority Emergency Lockout Wireframe (`EmergencyEvacBanner`)

### 3.1 Screen 5: Emergency Evacuation Override (`app/modals/emergency.tsx`)
When `EmergencyState == CRITICAL_EMERGENCY`, all client apps instantly override standard views to render this maximum-contrast, zero-blur red and white evacuation screen (`FR-EMR-002`).

```
+=======================================================================================================+
|  [ ! ] CRITICAL EMERGENCY EVACUATION ORDER IN EFFECT — DO NOT REMAIN IN SEATING TIERS [ ! ]          | <- Solid Red (`#FF1E1E`)
+=======================================================================================================+
|                                                                                                       |
|                                     /=======================\                                         |
|                                    /                         \                                        |
|                                   /            /\             \                                       |
|                                  |            /  \             |                                      |
|                                  |           /    \            | <- 120px High-Contrast White Arrow   |
|                                  |          /______\           |    Directing to Closest Safe Gate    |
|                                  |            |  |             |                                      |
|                                  |            |  |             |                                      |
|                                   \           |__|            /                                       |
|                                    \_________________________/                                        |
|                                                                                                       |
|   PRIMARY EVACUATION INSTRUCTION:                                                                     |
|   PROCEED IMMEDIATELY TO EXTERIOR GATE E4                                                             |
|   • ADA STEP-FREE ROUTE VERIFIED CLEAR (`FR-ACC-001`)                                                 |
|   • GREEN CORRIDOR 4 CLEAR OF PEDESTRIANS AND FIRST RESPONDERS EN ROUTE                               |
|                                                                                                       |
|   [ HAPTIC PULSE ACTIVE: 1 HZ CONTINUOUS SOS VIBRATION ]                                              |
|                                                                                                       |
+=======================================================================================================+
|   [ I AM IN A SAFE ZONE OUTSIDE THE STADIUM PERIMETER ] (Requires 2-Second Hold to Acknowledge)      |
+=======================================================================================================+
```
