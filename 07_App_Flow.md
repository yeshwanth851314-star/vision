# 07_App_Flow: VisionOS Application State Machine & Flow Specifications

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Application State Machine & Flow Specifications (`StateDiagram-v2`) |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead Systems Architect, Principal UX Designer |
| **Purpose** | To establish definitive, deterministic finite state machine (`FSM`) models and transition rules governing indoor wayfinding (`NavigationState`), mobile concessions (`OrderingState`), and high-priority critical overrides (`EmergencyState`). |
| **Scope** | Enforces UI state transitions across `apps/mobile` (`Fan & Volunteer App`) and `apps/web` (`Organizer COP Dashboard`), integrated with local `Zustand` (`21_State_Management.md`) and real-time WebSocket events (`20_WebSocket_Flow.md`). |
| **Assumptions** | 1. Network uplinks inside stadium tunnels are volatile; state machines must transition deterministically using local MMKV cache without blocking on cloud confirmation.<br>2. Emergency state overrides ($P_0$) must immediately preempt and cancel any active background transactions (concessions checkout, chat generation). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `06_Information_Architecture.md` — Structural Sitemap<br>• `21_State_Management.md` — Zustand & MMKV Stores |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead Systems Architect | Initial release of VisionOS deterministic state machines (`NavigationState`, `OrderingState`, `EmergencyState`). |

---

## 1. Wayfinding State Machine (`NavigationState` FSM)

The wayfinding state machine handles indoor positioning (`FR-NAV-001`), dynamic graph pathfinding (`FR-NAV-002`), off-route recalculation (`FR-NAV-004`), and ADA step-free constraints (`FR-ACC-001`).

```mermaid
stateDiagram-v2
  [*] --> IDLE: User Opens Navigation Tab
  
  IDLE --> INGESTING_BEACONS: BLE Beacon / Wi-Fi RTT Detected
  INGESTING_BEACONS --> CALCULATING_ROUTE: User Selects Target Destination (`Sector B4`)
  
  state CALCULATING_ROUTE {
    [*] --> LoadLocalGraph: Read `stadium_graph.json` from MMKV
    LoadLocalGraph --> FilterADAEdges: If `requiresWheelchairAccess == true`
    FilterADAEdges --> ApplyCrowdWeights: Check Real-time $D_{crowd}$ from Firestore
    ApplyCrowdWeights --> ExecuteAStar: Run A* Pathfinding Algorithm
  }
  
  CALCULATING_ROUTE --> ACTIVE_GUIDANCE: Route Computed ($T_{calc} < 50\text{ms}$)
  
  state ACTIVE_GUIDANCE {
    [*] --> RenderAROverlay: Project `#00F0FF` Floor Chevrons
    RenderAROverlay --> CheckPositionDelta: Ingest BLE RTT every 100ms
    CheckPositionDelta --> RenderAROverlay: Position Delta $\le 5.0\text{m}$ (On Route)
  }
  
  ACTIVE_GUIDANCE --> OFF_ROUTE_RECALCULATING: Position Delta $> 5.0\text{m}$ for $> 3\text{ seconds}$ (`FR-NAV-004`)
  OFF_ROUTE_RECALCULATING --> CALCULATING_ROUTE: Trigger Instant A* Reroute ($<100\text{ms}$)
  
  ACTIVE_GUIDANCE --> SENSORY_OVERLOAD_WARNING: Approaching Zone with $> 95\text{ dB}$ or Strobe (`FR-ACC-002`)
  SENSORY_OVERLOAD_WARNING --> ACTIVE_GUIDANCE: User Accepts Alternate Quiet Route
  
  ACTIVE_GUIDANCE --> DESTINATION_REACHED: Distance to Target Coordinate $< 2.0\text{m}$
  DESTINATION_REACHED --> IDLE: Auto-Dismiss AR Overlay
```

### 1.1 `NavigationState` Transition Guard Matrix
| Current State | Event Trigger | Guard Condition / Validation | Next State | Side Effects & State Store Mutations (`useNavigationStore`) |
| :--- | :--- | :--- | :--- | :--- |
| `IDLE` | `SELECT_DESTINATION` | `beaconCount >= 3` && `targetId != null` | `CALCULATING_ROUTE` | Set `activeRoute = null`, `isCalculating = true`. |
| `ACTIVE_GUIDANCE` | `TELEMETRY_UPDATE` | `distanceFromRouteEdge(currentPos) > 5.0m` | `OFF_ROUTE_RECALCULATING` | Emit haptic double-tap (`80ms`). Set `isOffRoute = true`. |
| `ACTIVE_GUIDANCE` | `SENSORY_ALERT` | `zone.decibels > 95.0` || `user.prefersQuiet == true` | `SENSORY_OVERLOAD_WARNING` | Mount `SensoryAlertSnackbar` (`z-index: 9999`). Pause AR vector arrows. |
| `OFF_ROUTE_RECALCULATING` | `RECALC_SUCCESS` | `newRoute.edges.length > 0` | `ACTIVE_GUIDANCE` | Replace `activeRoute` in MMKV. Set `isOffRoute = false`. |

---

## 2. Mobile Concessions State Machine (`OrderingState` FSM)

To prevent double-charging or abandoned carts during sudden stadium cellular dropouts (`04_UX_Research.md`), the concessions ordering flow utilizes an optimistic offline-to-online transaction state machine (`FR-CRD-003`).

```mermaid
stateDiagram-v2
  [*] --> BROWSING_VENDOR: User Selects Concession Card
  
  BROWSING_VENDOR --> ADDING_ITEMS: Tap `[+ Add Item]`
  ADDING_ITEMS --> CART_UPDATED: Validate Stock via Local MMKV Cache
  CART_UPDATED --> BROWSING_VENDOR: Continue Shopping
  
  CART_UPDATED --> INITIATING_CHECKOUT: Tap `[Proceed to Checkout]`
  
  state INITIATING_CHECKOUT {
    [*] --> CheckConnectivity: Test `NetInfo.isConnected`
    CheckConnectivity --> OnlineCheckout: Network Active (`5G / Wi-Fi`)
    CheckConnectivity --> OfflineQueueMode: Network Saturated / Severed
  }
  
  OnlineCheckout --> PAYMENT_PROCESSING: Dispatch `POST /api/v1/orders` via API Gateway
  OfflineQueueMode --> MUTATION_QUEUED: Append Order to Local `offline_mutations` Queue
  
  PAYMENT_PROCESSING --> ORDER_CONFIRMED: Stripe / NFC Payment Success (`201 Created`)
  PAYMENT_PROCESSING --> PAYMENT_FAILED: Payment Rejected or API Timeout (`500/402`)
  PAYMENT_FAILED --> INITIATING_CHECKOUT: Prompt User to Retry or Switch Payment Method
  
  MUTATION_QUEUED --> ORDER_CONFIRMED: Background Sync Replays Order Upon Network Uplink Restoration
  
  ORDER_CONFIRMED --> ACTIVE_PREPARATION: Vendor Kitchen Acknowledges Order (`onSnapshot`)
  ACTIVE_PREPARATION --> READY_FOR_PICKUP: Order Ready at Express Bay 4 (`FR-CRD-003`)
  READY_FOR_PICKUP --> [*]: NFC QR Scan at Pickup Locker / Seat Delivery Completed
```

### 2.1 `OrderingState` Transition Guard Matrix
| Current State | Event Trigger | Guard Condition / Validation | Next State | Side Effects & State Store Mutations (`useOrderStore`) |
| :--- | :--- | :--- | :--- | :--- |
| `CART_UPDATED` | `CHECKOUT_CLICK` | `cart.items.length > 0` && `user.ticketId != null` | `INITIATING_CHECKOUT` | Freeze cart edits (`isLocked = true`). Calculate estimated wait time ($T_{wait}$). |
| `INITIATING_CHECKOUT` | `NETWORK_SEVERED` | `NetInfo.isConnected == false` | `MUTATION_QUEUED` | Store payload in SQLite (`sqlite_orders`). Display offline confirmation badge. |
| `PAYMENT_PROCESSING` | `WEBHOOK_SUCCESS` | `response.status == 201` && `order.id != null` | `ORDER_CONFIRMED` | Clear local cart. Subscribe to `/orders/{id}` Firestore document listener. |
| `READY_FOR_PICKUP` | `PICKUP_QR_SCANNED` | `scannedQr == order.pickupCode` | `[*] (COMPLETED)` | Emit high-priority local push notification (`Order Collected`). Archive order. |

---

## 3. Critical Emergency Evacuation State Machine (`EmergencyState` FSM)

When an emergency (`FR-EMR-001`, `FR-EMR-002`) is confirmed via edge CV detection (`17_Computer_Vision_Pipeline.md`) or Organizer override (`ROLE_ORGANIZER`), the `EmergencyState` finite state machine instantly overrides all other active application states (`NavigationState`, `OrderingState`, `AIChatSheet`).

```mermaid
stateDiagram-v2
  [*] --> NORMAL_OPERATIONS: All Systems Nominal
  
  NORMAL_OPERATIONS --> EMERGENCY_PRE_ALERT: Edge CV Detects Weapon / Fire (`Confidence > 0.85`)
  EMERGENCY_PRE_ALERT --> CRITICAL_EMERGENCY: Organizer Confirms or Auto-Escalation Timer Expired ($15\text{s}$)
  
  state CRITICAL_EMERGENCY {
    [*] --> PreemptChildStates: Abort Active Checkout & Chat Streams
    PreemptChildStates --> LockNavigationTabs: Disable Bottom Navigation Bar (`opacity: 0.2`)
    LockNavigationTabs --> MountEvacBanner: Render High-Contrast `#FF1E1E` Header (`H0`)
    MountEvacBanner --> CalculateEscapeRoute: Compute Shortest Step-Free Path to Exterior Gate
    CalculateEscapeRoute --> BroadcastGreenCorridor: Alert Volunteers to Clear $4\text{m}$ Path (`FR-EMR-003`)
  }
  
  CRITICAL_EMERGENCY --> ACTIVE_EVACUATION_GUIDANCE: Display $72\text{px}$ White Directional Arrows
  ACTIVE_EVACUATION_GUIDANCE --> ACTIVE_EVACUATION_GUIDANCE: Continuous $1\text{ Hz}$ Haptic Pulse & Visual Strobe
  
  ACTIVE_EVACUATION_GUIDANCE --> EXTERIOR_SAFE_ZONE: BLE Perimeter Check-in at Exterior Safe Geofence ($>200\text{m}$ Outside)
  EXTERIOR_SAFE_ZONE --> NORMAL_OPERATIONS: Organizer Broadcasts `ALL_CLEAR` Command
```

### 3.1 `EmergencyState` Transition Guard & Preemption Rules
1. **Absolute Preemption:** When `stadium.cv.incident` or `stadium.cop.evacuate` (`19_Event_Architecture.md`) is ingested over WebSockets or background push (`FCM/APNs`), the client FSM executes `PreemptChildStates` synchronously within $<16\text{ms}$ (1 frame at 60 FPS).
2. **State Lockout:** While `EmergencyState == CRITICAL_EMERGENCY`, all touch event handlers inside `app/(tabs)/_layout.tsx` return `false`, blocking users from switching back to ordering food or viewing tickets (`FR-EMR-002`).
3. **Safe-Zone Check-in:** The emergency state only disengages when the user's mobile device crosses the exterior geofence perimeter ($>200\text{m}$ from stadium walls) **OR** when Commander Vance (`ROLE_ORGANIZER`) explicitly executes the `POST /api/v1/cop/emergency/clear` API endpoint (`13_API_Specification.md`).
