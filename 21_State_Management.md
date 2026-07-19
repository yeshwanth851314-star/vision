# 21_State_Management: VisionOS Client Store & Offline Sync Engine

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Client State Management Architecture, Zustand Stores, MMKV Persistence, & Offline Mutation Queue |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead Frontend Architect, Principal Software Engineer |
| **Purpose** | To establish the exact client-side state topology (`Zustand 5`), synchronous local storage engine (`react-native-mmkv`), offline graph routing execution (`stadium_graph.json`), and network resilience mutation queues for `apps/mobile` and `apps/web`. |
| **Scope** | Enforced across `@visionos/shared/stores`, `apps/mobile/stores/`, and `apps/web/src/stores/`. |
| **Assumptions** | 1. `react-native-mmkv` is used for all synchronous local storage ($30\times\text{ faster than AsyncStorage}$) to prevent UI frame drops during $60\text{ FPS AR navigation}$.<br>2. When cellular connectivity drops below $3\text{ Mbps}$ inside concourse tunnels (`NetInfo.isConnected == false`), all offline user actions are queued locally in MMKV and replayed upon network restoration. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `07_App_Flow.md` — Finite State Machines<br>• `20_WebSocket_Flow.md` — WebSocket Event Mesh |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead Frontend Architect | Initial production release detailing `Zustand 5` stores, MMKV persistence, and offline `NetInfo` mutation queues. |

---

## 1. Client State Architecture & Storage Partitioning

Client state is strictly partitioned into three distinct storage tiers based on volatility and network dependency:

```mermaid
graph TD
  subgraph ClientStateEngine [VisionOS Client State (`apps/mobile`)]
    UIStore[`useUIStore` (`Zustand In-Memory`)]
    NavStore[`useNavigationStore` (`Zustand` + MMKV Persistence)]
    MutationQueue[`useOfflineQueueStore` (`Zustand` + MMKV Execution Buffer)]
  end

  subgraph PersistentStorage [`react-native-mmkv` (`Synchronous C++ JSI Engine`)]
    MMKVGraph[`mmkv.getString('offline_stadium_graph_v1')` <br> ($1.2\text{ MB}$ Local Wayfinding Graph)]
    MMKVQueue[`mmkv.getString('offline_mutation_queue')` <br> (Pending Hazard & Order Payloads)]
    MMKVAuth[`mmkv.getString('oauth_bearer_token')` <br> (Encrypted JWT Token)]
  end

  subgraph NetworkInterface [`@react-native-community/netinfo`]
    NetChecker[`Network State Listener` <br> Detects Online vs Offline Transitions]
  end

  NavStore <--> MMKVGraph
  MutationQueue <--> MMKVQueue
  UIStore <--> MMKVAuth

  NetChecker -- `isConnected == false` --> MutationQueue
  NetChecker -- `isConnected == true` --> SyncEngine[`Replay Pending Queue to API Gateway (`REST / WSS`)`]
  MutationQueue --> SyncEngine
```

---

## 2. Offline Graph Routing & Sync Execution

To guarantee $100\%$ availability of indoor AR navigation (`FR-NAV-001`) even during complete cellular blackout (`0 Mbps`), `apps/mobile` executes a two-phase sync engine:

1. **Phase 1: Pre-Match Perimeter Ingest (`POST /api/v1/auth/checkin`):** Upon crossing the exterior stadium geofence ($500\text{m}$), the app downloads the immutable $1.2\text{ MB}$ structural graph (`stadium_graph.json`) and writes it synchronously to MMKV using `mmkv.set('offline_stadium_graph_v1', JSON.stringify(graphPayload))`.
2. **Phase 2: Local $A^*$ Traversal Engine:** When `NetInfo.isConnected == false`, `useNavigationStore` detaches from live WebSocket density streams (`stadium:zone:update`) and computes routes exclusively against the local MMKV graph, using baseline traversal times (`stadium_routing_edges.baseline_traversal_seconds`).

---

## 3. Offline Mutation Queue (`NetInfo` Resilience)

If a volunteer (`Sarah Jenkins`) submits a 2-tap hazard report (`QuickReportModal`) or acknowledges a dispatch ticket (`POST /api/v1/dispatches/ack`) while inside an elevator shaft with no connectivity, the request is not dropped. It is intercepted by `useOfflineQueueStore`:

```json
[
  {
    "queueId": "queue_item_881029_1842",
    "endpoint": "/api/v1/dispatches/ack",
    "method": "POST",
    "headers": { "Authorization": "Bearer eyJhbG..." },
    "bodyJson": { "dispatchId": "770e8400...", "status": "ACKNOWLEDGED", "notes": "Elevator #3 clean up" },
    "createdAtUtc": "2026-07-13T18:42:10.000Z",
    "retryCount": 0
  }
]
```
When `NetInfo` fires `isConnected == true`, the sync engine drains this array sequentially via exponential backoff ($1\text{s}, 2\text{s}, 4\text{s}$) until `retryCount >= 5` (`19_Event_Architecture.md`).

---

## 4. Production Zustand Store Implementation (`apps/mobile/stores/useNavigationStore.ts`)

```ts
import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { RouteStep } from '../components/navigation/ARNavigationOverlay.types';

export const storage = new MMKV({ id: 'visionos_client_storage' });

export interface NavigationState {
  readonly activeSteps: readonly RouteStep[];
  readonly currentStepIndex: number;
  readonly isOfflineModeActive: boolean;
  readonly isEmergencyPreempted: boolean;
  
  // Actions
  readonly setActiveRoute: (steps: readonly RouteStep[]) => void;
  readonly advanceStepIndex: () => void;
  readonly setOfflineMode: (isOffline: boolean) => void;
  readonly triggerEmergencyPreemption: (targetSafeGate: string) => void;
  readonly resetNavigation: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  activeSteps: [],
  currentStepIndex: 0,
  isOfflineModeActive: false,
  isEmergencyPreempted: false,

  setActiveRoute: (steps) => {
    set({ activeSteps: steps, currentStepIndex: 0, isEmergencyPreempted: false });
    // Persist latest active route to MMKV for immediate recovery upon app restart
    storage.set('cached_active_route_steps', JSON.stringify(steps));
  },

  advanceStepIndex: () => {
    const { currentStepIndex, activeSteps } = get();
    if (currentStepIndex < activeSteps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    }
  },

  setOfflineMode: (isOffline) => {
    set({ isOfflineModeActive: isOffline });
  },

  /**
   * Preempts normal navigation immediately upon receiving 'EMERGENCY_OVERRIDE' WebSocket event (`FR-EMR-002`).
   */
  triggerEmergencyPreemption: (targetSafeGate) => {
    const emergencyRoute: RouteStep[] = [
      {
        stepId: 'emergency_evac_step_01',
        instruction: `EMERGENCY EVACUATION ORDER IN EFFECT. PROCEED IMMEDIATELY TO GATE ${targetSafeGate}.`,
        distanceMeters: 0,
        targetAngleDegrees: 0,
        isAdaCompliant: true,
      },
    ];
    set({ activeSteps: emergencyRoute, currentStepIndex: 0, isEmergencyPreempted: true });
  },

  resetNavigation: () => {
    set({ activeSteps: [], currentStepIndex: 0, isEmergencyPreempted: false });
    storage.delete('cached_active_route_steps');
  },
}));
```
