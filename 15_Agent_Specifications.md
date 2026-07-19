# 15_Agent_Specifications: VisionOS Autonomous Agent Swarm & Execution Profiles

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Autonomous Agent Swarm Specifications (`CrowdAgent`, `DispatchAgent`, `SustainabilityAgent`, `NavigationAgent`) |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | AI Systems Architect, Lead Product Architect |
| **Purpose** | To define the exact operational boundaries, triggers, state transition loops (`LangGraph`), function calling scopes, and deterministic fallback rules for the four autonomous background agents inside `packages/ai-router`. |
| **Scope** | Serves as the automated operational nervous system running asynchronously inside Node.js 22 / Cloud Run microservices. |
| **Assumptions** | 1. Agents operate asynchronously, ingesting real-time Pub/Sub events (`19_Event_Architecture.md`) and writing state changes to Firestore (`12_Firestore_Schema.md`).<br>2. High-severity safety actions (turnstile locking, emergency evacuation) cannot be executed autonomously; agents may only **recommend** such actions to `ROLE_ORGANIZER` for single-click human authorization (`FR-CRD-004`). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `14_AI_Architecture.md` — Three-Tier Gemini Router<br>• `19_Event_Architecture.md` — Pub/Sub Event Schemas |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | AI Systems Architect | Initial production release detailing the 4 autonomous background agents and LangGraph execution loops. |

---

## 1. Autonomous Swarm Architecture (`LangGraph` Orchestration)

The four specialized agents inside `packages/ai-router` run as deterministic `LangGraph` finite state machines, continuously evaluating telemetry streams against our safety and operational thresholds:

```mermaid
graph TD
  subgraph EventSources [Ingested Real-Time Telemetry (`19_Event_Architecture.md`)]
    CVPubSub[`stadium.cv.crowd_surge` <br> (NVIDIA Jetson Edge Nodes)]
    BMSPubSub[`stadium.bms.telemetry` <br> (HVAC & Flow Meters)]
    UserPubSub[`stadium.user.checkin` <br> (Turnstiles & BLE Beacons)]
  end

  subgraph SwarmEngine [Autonomous Agent Swarm (`packages/ai-router`)]
    Crowd[`CrowdAgent` <br> Predictive Queue & Signage Throttler]
    Dispatch[`DispatchAgent` <br> Spatial Volunteer Task Allocator]
    Sustainability[`SustainabilityAgent` <br> Zero-Occupancy HVAC Throttler]
    Navigation[`NavigationAgent` <br> Dynamic Graph Weight Adjuster]
  end

  subgraph TargetActions [Deterministic System Mutations]
    Signage[`stadium.bms.commands` <br> Override Concourse Overhead Signs]
    FCM[`stadium.dispatches.create` <br> Push Task Tickets to `ROLE_VOLUNTEER`]
    HVAC[`stadium.bms.commands` <br> Throttle Airflow 50% & Dim LED 20%]
    Graph[`stadium.routing.update` <br> Double Edge Weights $W_{edge} \times 2$]
  end

  CVPubSub --> Crowd
  CVPubSub --> Dispatch
  CVPubSub --> Navigation
  BMSPubSub --> Sustainability
  UserPubSub --> Navigation

  Crowd --> Signage
  Dispatch --> FCM
  Sustainability --> HVAC
  Navigation --> Graph
```

---

## 2. Agent 1: `CrowdAgent` (Predictive Queue & Signage Throttler)

Monitors concourse density ($D_{crowd}$) and ingress/egress velocity ($V_{flow}$) to preemptively prevent crowd crushes before they hit critical limits (`FR-CRD-002`).

### 2.1 Operational Profile & Execution Rules
* **Trigger Event:** Ingests `stadium.cv.crowd_surge` every $1,000\text{ms}$ (`Pub/Sub`).
* **State Evaluation Matrix:**
  * **Level 0 (Normal: $D_{crowd} \le 2.0\text{ p/m}^2$):** No action taken. Maintain baseline overhead signage (`GATE B DIRECT ENTRY`).
  * **Level 1 (Warning: $2.1 \le D_{crowd} \le 3.4\text{ p/m}^2$):** Automatically dispatches Modbus command (`stadium.bms.commands`) to switch overhead digital signs pointing toward approaching concourse corridors: `CONGESTION AHEAD — USE ALTERNATE GATE C`.
  * **Level 2 (Critical: $D_{crowd} \ge 3.5\text{ p/m}^2$):** Emits high-priority alert to Commander Vance's 3D COP (`ROLE_ORGANIZER`), recommending immediate turnstile ingress lock (`FR-CRD-004`).

### 2.2 LangGraph State Transition Implementation (`packages/ai-router/src/agents/crowd.ts`)
```ts
import { StateGraph, END } from '@langchain/langgraph';
import { PubSub } from '@google-cloud/pubsub';
import { Firestore } from '@google-cloud/firestore';

export interface CrowdAgentState {
  readonly zoneId: string;
  readonly currentDensity: number;
  readonly flowVelocityPerMinute: number;
  readonly activeSignageState: 'NORMAL' | 'ALTERNATE_ROUTING' | 'GATE_LOCKED';
}

export const crowdAgentGraph = new StateGraph<CrowdAgentState>({
  channels: {
    zoneId: { value: (x: string, y?: string) => y ?? x, default: () => '' },
    currentDensity: { value: (x: number, y?: number) => y ?? x, default: () => 0 },
    flowVelocityPerMinute: { value: (x: number, y?: number) => y ?? x, default: () => 0 },
    activeSignageState: { value: (x: any, y?: any) => y ?? x, default: () => 'NORMAL' },
  },
})
  .addNode('evaluateDensity', async (state) => {
    if (state.currentDensity >= 3.5) return { activeSignageState: 'GATE_LOCKED' };
    if (state.currentDensity >= 2.1) return { activeSignageState: 'ALTERNATE_ROUTING' };
    return { activeSignageState: 'NORMAL' };
  })
  .addNode('dispatchSignageCommand', async (state) => {
    const pubsub = new PubSub();
    await pubsub.topic('stadium.bms.commands').publishMessage({
      json: { zoneId: state.zoneId, commandType: 'SET_SIGNAGE_MODE', targetState: state.activeSignageState },
    });
    const db = new Firestore();
    await db.doc(`stadium/zones/${state.zoneId}`).update({ status: state.activeSignageState });
    return state;
  })
  .addEdge('evaluateDensity', 'dispatchSignageCommand')
  .addEdge('dispatchSignageCommand', END);
```

---

## 3. Agent 2: `DispatchAgent` (Spatial Volunteer Task Allocator)

Automatically allocates maintenance and incident tasks to the closest qualified on-duty volunteer (`ROLE_VOLUNTEER`) within $<50\text{ms}$ (`FR-COP-002`).

### 3.1 Operational Profile & Execution Rules
* **Trigger Event:** Ingests `stadium.cv.incident` (`SPILL`, `MEDICAL`, `TURNSTILE_JAM`) or mobile user hazard reports (`QuickReportModal`).
* **Selection Algorithm (`Spatial Radius Check`):**
  1. Queries PostgreSQL PostGIS (`11_Backend_Schema.md`) for all rows in `volunteer_rosters` where `current_status = 'ON_DUTY'` and `ST_DWithin(last_known_geom, target_geom, 100) = true` ($100\text{m}$ radius).
  2. If `incident.category == 'MEDICAL'`, filters strictly by `is_medical_certified == true`.
  3. Selects the volunteer with the shortest $A^*$ walking distance ($T_{walk}$) to the incident coordinates.
* **Dispatch & Escalation SLA:** Pushes actionable FCM task ticket to the selected volunteer's mobile device (`app/staff/task/[id].tsx`). If the volunteer does not tap `[Acknowledge]` within $15\text{ seconds}$, the agent automatically marks them `BUSY` and re-dispatches to the second-nearest volunteer.

---

## 4. Agent 3: `SustainabilityAgent` (Zero-Occupancy HVAC Throttler)

Optimizes energy expenditure during event lifecycles without compromising attendee comfort (`FR-SUS-001`).

### 4.1 Operational Profile & Execution Rules
* **Trigger Event:** Evaluates every concourse sector and VIP suite (`11_Backend_Schema.md`) on a continuous $60\text{ second}$ cron schedule via `stadium.bms.telemetry`.
* **Zero-Occupancy Logic:**
  * Checks edge CV occupancy counters (`currentPersonCount`).
  * If `currentPersonCount == 0` for $\ge 15\text{ consecutive minutes}$, the agent dispatches a BACnet command to the local air handling unit (`AHU`): reduce supply airflow (`CFM`) by $50\%$ and dim concourse LED lighting to $20\%$.
  * If `currentPersonCount >= 1` (a single person enters the zone), the agent instantly dispatches a BACnet override restoring $100\%$ airflow and $100\%$ LED illumination within $<2\text{ seconds}$.

---

## 5. Agent 4: `NavigationAgent` (Dynamic Graph Weight Adjuster)

Ensures indoor wayfinding (`FR-NAV-002`) remains accurate by continuously updating concourse edge weights ($W_{edge}$) across the venue spatial graph.

### 5.1 Operational Profile & Execution Rules
* **Trigger Event:** Ingests `stadium:zone:update` from Firestore telemetry shards.
* **Edge Weight Calculation Formula:**
  $$W_{edge} = T_{baseline} \times \left(1 + \max\left(0, \frac{D_{crowd} - 2.0}{1.5}\right)^2\right)$$
  Where $T_{baseline}$ is the unobstructed traversal time in seconds (`stadium_routing_edges.baseline_traversal_seconds`) and $D_{crowd}$ is current density.
* **Graph Propagation:** When $W_{edge}$ changes by $>20\%$, the agent updates Cloud SQL (`stadium_routing_edges`) and broadcasts `stadium:zone:congested` over WebSockets (`20_WebSocket_Flow.md`), forcing all active mobile clients inside the sector to instantly recalculate and shift their AR floor chevrons (`#00F0FF`) to alternate stairwells or elevators.
