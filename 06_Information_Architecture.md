# 06_Information_Architecture: VisionOS Structural Sitemap & Navigation Hierarchies

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Information Architecture (IA) & Structural Navigation Hierarchies |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead UX Architect, Lead Product Architect |
| **Purpose** | To define the exhaustive, multi-tier sitemap, file-system routing hierarchy (`Next.js 15 App Router` & `Expo Router v3`), tab organization, and modal navigation trees across all VisionOS applications. |
| **Scope** | Enforces routing structures for `apps/mobile` (`Fan & Volunteer App`), `apps/web` (`Organizer 3D COP Dashboard`), and CAD Emergency response overlays. |
| **Assumptions** | 1. Mobile navigation must require no more than two taps from any screen to reach the primary emergency evacuation route or AI chat concierge (`Ergonomic Thumb-Zone Rule`).<br>2. Web dashboard views must maintain persistent 3D WebGL context while switching between analytical telemetry drawers. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `03_UI_UX_Design_System.md` — Design Tokens & Bottom Sheets<br>• `05_User_Personas.md` — Role-Based Access Profiles |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead UX Architect | Initial production release of VisionOS Information Architecture across mobile (`Expo`) and web (`Next.js`). |

---

## 1. Information Architecture Philosophy & Core Principles

The Information Architecture (`IA`) of VisionOS is organized around **Progressive Disclosure** and **Context-Sensitive Surface Allocation**. Under high-stress stadium conditions (`04_UX_Research.md`), complex multi-level hamburger menus cause cognitive paralysis. 

Therefore, VisionOS strictly enforces:
1. **Shallow Depth Hierarchy:** No screen inside `apps/mobile` may be nested deeper than 3 levels ($H_0 \rightarrow H_1 \rightarrow H_2$).
2. **Persistent Bottom-Sheet Concierge:** The AI Chat Concierge (`AIChatSheet`) and Emergency Evacuation Banner (`EmergencyEvacBanner`) reside at the root application layout level ($H_0$), allowing them to be invoked instantly from any child screen.
3. **Role-Driven Route Guards:** File routing uses strict middleware guards (`_layout.tsx` in Expo, `middleware.ts` in Next.js) to dynamically inject or strip navigation tabs based on the active JWT role claim (`ROLE_FAN`, `ROLE_VOLUNTEER`, `ROLE_ORGANIZER`).

---

## 2. Mobile Application Structural Sitemap (`apps/mobile` — Expo Router)

```mermaid
graph TD
  Root[`app/_layout.tsx` <br> Root Auth & Emergency Guard (`H0`)]
  
  subgraph PublicTabs [Bottom Navigation Bar (`H1`)]
    HomeTab[`/(tabs)/index.tsx` <br> Home & Digital Ticket QR]
    NavTab[`/(tabs)/navigation.tsx` <br> AR Indoor Concourse Map]
    OrderTab[`/(tabs)/ordering.tsx` <br> Concessions & Express Pickup]
    StaffTab[`/(tabs)/staff.tsx` <br> Volunteer Dispatch Queue (`ROLE_VOLUNTEER` Only)]
  end

  subgraph GlobalModals [Persistent Root Overlays (`H0/H1`)]
    AIChat[`/modals/ai-chat.tsx` <br> Multilingual Voice Concierge Sheet]
    EmergencySheet[`/modals/emergency.tsx` <br> Evacuation & Rerouting Override]
    ReportModal[`/modals/report-hazard.tsx` <br> Two-Tap Hazard BLE Report]
  end

  subgraph ChildScreens [Deep Link & Detail Screens (`H2`)]
    TicketDetail[`/ticket/transfer.tsx` <br> NFC & Passbook Transfer]
    VendorDetail[`/ordering/vendor/[id].tsx` <br> Live Wait Times & Menu Item Select]
    TaskDetail[`/staff/task/[id].tsx` <br> Actionable Dispatch Execution Card]
  end

  Root --> HomeTab
  Root --> NavTab
  Root --> OrderTab
  Root --> StaffTab

  Root -.->|Bottom Pill Swipe| AIChat
  Root -.->|Critical Push| EmergencySheet
  StaffTab -.->|FAB Tap| ReportModal

  HomeTab --> TicketDetail
  OrderTab --> VendorDetail
  StaffTab --> TaskDetail
```

### 2.1 File System Routing Architecture (`apps/mobile/app/`)
Enforces the exact folder topology required by `Expo Router v3` (`29_Coding_Standards.md`):

```
apps/mobile/app/
├── _layout.tsx                     # Root Layout (Provides MMKV Store, Auth Guard, WebSocket Mesh & Emergency Context)
├── +not-found.tsx                  # 404 / Offline Disconnection Fallback Screen
├── (auth)/                         # Unauthenticated / Guest Check-in Route Group
│   ├── login.tsx                   # Biometric / e-Ticket Perimeter Authentication
│   └── onboarding.tsx              # ADA Profile & Language Preference Selection (`FR-ACC-001`)
├── (tabs)/                         # Primary Bottom Navigation Bar (`48px x 48px` Touch Target Rule)
│   ├── _layout.tsx                 # Tab Configuration & Role-Based Tab Hider (`ROLE_VOLUNTEER` Guard)
│   ├── index.tsx                   # [Tab 1] Home Dashboard: Dynamic Ticket QR, Countdown & Weather HUD
│   ├── navigation.tsx              # [Tab 2] Wayfinding: 3D Concourse Map & AR Camera View Switcher
│   ├── ordering.tsx                # [Tab 3] Concessions: Real-Time Wait Time Cards & Mobile Cart
│   └── staff.tsx                   # [Tab 4] Staff Tasks: Active Volunteer Dispatch Queue (`Protected Scope`)
├── ordering/
│   └── vendor/
│       └── [id].tsx                # [H2] Vendor Menu & Seat Delivery Checkout Flow
├── staff/
│   └── task/
│       └── [id].tsx                # [H2] Task Dispatch Details & GPS/BLE Route Guidance
└── modals/                         # High-Priority Root Modals & Bottom Sheets
    ├── ai-chat.tsx                 # [Modal] Gemini 1.5 Flash Multilingual PTT Chat Concierge (`FR-LAN-001`)
    ├── emergency.tsx               # [Modal] High-Contrast Evacuation Override (`FR-EMR-002`)
    └── report-hazard.tsx           # [Modal] Two-Tap Concourse Incident Report (`FR-COP-002`)
```

---

## 3. Web Command Center Structural Sitemap (`apps/web` — Next.js 15 App Router)

The `Next.js 15 App Router` structure for Commander Marcus Vance (`ROLE_ORGANIZER`) utilizes **Parallel Routes (`@slot`) and Intercepting Routes** to maintain a single page application (`SPA`) feel where the 3D WebGL stadium canvas (`Stadium3DCanvas`) never unmounts or reloads when navigating between analytical drawers.

```mermaid
graph TD
  WebRoot[`src/app/layout.tsx` <br> Next.js Root Layout (`H0`)]
  Dashboard[`src/app/(cop)/page.tsx` <br> Central 3D Digital Twin Canvas (`H1`)]

  subgraph ParallelDrawers [Next.js Parallel Route Slots (`@drawer`)]
    CrowdDrawer[`@drawer/crowd/page.tsx` <br> Real-Time Concourse Density & Heatmap Controls]
    GateDrawer[`@drawer/gates/page.tsx` <br> Turnstile Velocity & Emergency Lock Overrides]
    DispatchDrawer[`@drawer/dispatches/page.tsx` <br> Live Volunteer Task Queue & GPS Map]
    SustainabilityDrawer[`@drawer/sustainability/page.tsx` <br> HVAC Throttling & Carbon Telemetry HUD]
    PlaybackDrawer[`@drawer/playback/page.tsx` <br> Second-by-Second Historical Audit Playback]
  end

  WebRoot --> Dashboard
  Dashboard --> CrowdDrawer
  Dashboard --> GateDrawer
  Dashboard --> DispatchDrawer
  Dashboard --> SustainabilityDrawer
  Dashboard --> PlaybackDrawer
```

### 3.1 File System Routing Architecture (`apps/web/src/app/`)
```
apps/web/src/app/
├── layout.tsx                      # Root HTML layout, ThemeProvider (`Quantum Glass`), and OpenTelemetry Provider
├── middleware.ts                   # Edge Auth Guard enforcing `ROLE_ORGANIZER` JWT claims before SSR execution
├── (auth)/
│   └── login/page.tsx              # Command Center MFA & Hardware Token Check-in
└── (cop)/                          # Main Command Operating Picture (COP) Route Group
    ├── layout.tsx                  # 3D Canvas Persistent Container (`Three.js / Mapbox GL`) + Left Sidebar Navigation
    ├── page.tsx                    # Default View: Stadium 3D Overview & Total Occupancy HUD
    └── @drawer/                    # Next.js Parallel Route Drawer Slot (Right Panel `400px` Fixed Width)
        ├── default.tsx             # Fallback Empty Drawer State
        ├── crowd/page.tsx          # Concourse Zone Analytics ($D_{crowd}$ Metrics & Warning Throttles)
        ├── gates/page.tsx          # Turnstile Gate Controller (`POST /api/v1/cop/gates/override`)
        ├── dispatches/page.tsx     # Active Volunteer Dispatch Ticket Tracker (`DispatchAgent` Live Feed)
        ├── sustainability/page.tsx # BMS Zero-Occupancy HVAC Automation & Carbon Savings HUD (`FR-SUS-001`)
        └── playback/page.tsx       # Historical Forensics Time-Slider (`audit_logs` Replay Engine)
```

---

## 4. Navigation Flow Rules & Cognitive Guardrails

To prevent disorientation across all applications, the IA enforces strict UI/UX guardrails:

| Guardrail Name | Target Application | Architectural Enforcement Rule | Justification & Research Traceability |
| :--- | :--- | :--- | :--- |
| **Two-Tap Emergency Access** | `apps/mobile` (`Fan & Staff`) | The `Emergency SOS` floating action button (`FAB`) must be mounted at `z-index: 9999` on every `(tabs)` screen. Tap 1 opens `modals/emergency.tsx`; Tap 2 confirms check-in or calls first responders. | Enforces $<3\text{ second}$ emergency initiation during high-stress crowd surges (`04_UX_Research.md`). |
| **Persistent Canvas State** | `apps/web` (`Organizer COP`) | Navigating between `@drawer/crowd` and `@drawer/gates` must **never** cause the `Three.js` WebGL canvas inside `(cop)/layout.tsx` to unmount, reload, or lose camera orientation angles. | Prevents Commander Vance from losing visual tracking of an active concourse fight or bottleneck during view switching (`05_User_Personas.md`). |
| **Dynamic Tab Stripping** | `apps/mobile` (`Fan & Staff`) | If the JWT auth claim lacks `ROLE_VOLUNTEER`, `app/(tabs)/_layout.tsx` must dynamically strip `staff.tsx` from the tab bar array, expanding the remaining three tabs to $33.3\%$ width each. | Prevents general fans from attempting to access staff dispatch queues or seeing confusing internal terminology. |
| **Stateful Back-Stack Reset** | Both (`apps/mobile` & `apps/web`) | Upon receiving an `EMERGENCY_OVERRIDE` WebSocket payload (`20_WebSocket_Flow.md`), all active modal stacks, deep-linked menus, and ordering carts must immediately reset to $H_0$, locking the UI directly into `EmergencyEvacBanner`. | Eliminates modal trap disorientation when attendees must evacuate immediately (`FR-EMR-002`). |
