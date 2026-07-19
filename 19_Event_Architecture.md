# 19_Event_Architecture: VisionOS Event-Driven Pub/Sub & BMS Mesh

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Event-Driven Architecture, Pub/Sub Topologies, Dead-Letter Queues, & BMS Automation Mesh |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Cloud Systems Architect, Lead API Architect |
| **Purpose** | To define the exact asynchronous event topics (`Google Cloud Pub/Sub`), strict JSON event schemas, ordering guarantees (`orderingKey: zoneId`), Dead-Letter Queue (`DLQ`) retention policies, and BACnet/Modbus hardware command mappings. |
| **Scope** | Enforced across `apps/api-gateway`, `apps/edge-cv`, `packages/ai-router`, and BMS hardware gateways (`apps/bms-gateway`). |
| **Assumptions** | 1. Google Cloud Pub/Sub guarantees at-least-once delivery; consumers must be idempotent by validating event `eventId` hashes.<br>2. High-frequency telemetry streams ($1\text{ Hz}$) must enforce strict topic ordering using `orderingKey: zoneId` to prevent race conditions during crowd density evaluation. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `11_Backend_Schema.md` — Relational Audit Storage<br>• `15_Agent_Specifications.md` — LangGraph Swarm Ingestors |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Cloud Systems Architect | Initial release of Pub/Sub topics, DLQ policies ($14\text{-day retention}$), and BMS BACnet translation protocols. |

---

## 1. Pub/Sub Event Mesh Topology (`ERD / Topic Map`)

```mermaid
graph TD
  subgraph Producers [Event Producers]
    Jetson[`apps/edge-cv` <br> (800 Jetson Nodes)]
    Gateway[`apps/api-gateway` <br> (REST & WSS Handlers)]
    Swarm[`packages/ai-router` <br> (Autonomous Agents)]
    BMSHW[`apps/bms-gateway` <br> (BACnet/Modbus Bridge)]
  end

  subgraph PubSubTopics [Google Cloud Pub/Sub Topics (`us-central1`)]
    CVTopic[`stadium.cv.crowd_surge` <br> (Ordering: `zoneId`)]
    BMSTelemetry[`stadium.bms.telemetry` <br> (Ordering: `hvacZoneId`)]
    BMSCommands[`stadium.bms.commands` <br> (Ordering: `zoneId`)]
    UserCheckin[`stadium.user.checkin` <br> (Ordering: `sectorId`)]
    Dispatches[`stadium.dispatches.create` <br> (Ordering: `volunteerId`)]
    DLQ[`stadium.dlq.unprocessed` <br> ($14\text{-Day Retention}$)]
  end

  subgraph Consumers [Event Consumers]
    AgentSwarm[`packages/ai-router` <br> (`CrowdAgent`, `DispatchAgent`)]
    AuditService[`apps/api-gateway` <br> (Prisma Postgres Auditor)]
    FirestoreSync[`Firebase Cloud Functions` <br> (Shard Ingestion)]
    BMSController[`apps/bms-gateway` <br> (Hardware Actuators)]
  end

  Jetson --> CVTopic
  BMSHW --> BMSTelemetry
  Gateway --> UserCheckin
  Swarm --> BMSCommands
  Swarm --> Dispatches

  CVTopic --> AgentSwarm
  CVTopic --> FirestoreSync
  BMSTelemetry --> AgentSwarm
  BMSCommands --> BMSController
  Dispatches --> AuditService
  UserCheckin --> AuditService

  CVTopic -. Failure (> 5 Retries) .-> DLQ
  BMSCommands -. Failure (> 5 Retries) .-> DLQ
```

---

## 2. Pub/Sub Topic Specifications & JSON Schemas

### 2.1 Topic: `stadium.cv.crowd_surge` (`FR-CRD-001`)
Emitted by edge Jetson nodes every $1,000\text{ms}$. Ingested by `CrowdAgent` and Firestore shard sink.
* **Ordering Key:** `zoneId` (`e.g., CONCOURSE_B4_EAST`)
* **Retention Policy:** $7\text{ days}$ (`ACK deadline: 30 seconds`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PubSubCrowdSurgePayload",
  "type": "object",
  "required": ["eventId", "zoneId", "densityPerSqM", "timestampUtc"],
  "properties": {
    "eventId": { "type": "string", "format": "uuid", "example": "f10e8400-e29b-41d4-a716-446655440000" },
    "zoneId": { "type": "string", "example": "CONCOURSE_B4_EAST" },
    "densityPerSqM": { "type": "number", "minimum": 0.0, "example": 3.4008 },
    "flowVelocityPerMinute": { "type": "integer", "example": 1140 },
    "activeAcousticDecibels": { "type": "number", "example": 96.5 },
    "timestampUtc": { "type": "string", "format": "date-time", "example": "2026-07-13T18:45:12.050Z" }
  }
}
```

---

### 2.2 Topic: `stadium.bms.commands` (`FR-CRD-002`, `FR-SUS-001`)
Emitted by `CrowdAgent` or `SustainabilityAgent`. Ingested by `apps/bms-gateway` to actuate physical venue hardware.
* **Ordering Key:** `zoneId`
* **Retention Policy:** $3\text{ days}$ (`ACK deadline: 10 seconds`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PubSubBMSCommandPayload",
  "type": "object",
  "required": ["commandId", "zoneId", "hardwareProtocol", "actionPayload", "timestampUtc"],
  "properties": {
    "commandId": { "type": "string", "format": "uuid", "example": "c20e8400-e29b-41d4-a716-446655440000" },
    "zoneId": { "type": "string", "example": "CONCOURSE_B4_EAST" },
    "hardwareProtocol": { "type": "string", "enum": ["BACNET_IP", "MODBUS_TCP"], "example": "BACNET_IP" },
    "actionPayload": {
      "type": "object",
      "properties": {
        "targetDeviceAddress": { "type": "string", "example": "10.240.50.12:47808" },
        "objectType": { "type": "string", "example": "ANALOG_OUTPUT" },
        "objectInstance": { "type": "integer", "example": 104 },
        "propertyIdentifier": { "type": "string", "example": "PRESENT_VALUE" },
        "targetValue": { "type": "number", "example": 50.0 }
      }
    },
    "timestampUtc": { "type": "string", "format": "date-time", "example": "2026-07-13T18:45:12.100Z" }
  }
}
```

---

## 3. Dead-Letter Queue (`DLQ`) & Retry Governance

To prevent poison-pill messages (e.g., malformed JSONs from corrupted network switches) from blocking ordered Pub/Sub subscriptions:
1. **Exponential Backoff Policy:** Subscriptions execute up to $5\text{ delivery attempts}$ with a backoff schedule of $1\text{s}, 2\text{s}, 4\text{s}, 8\text{s}, 16\text{s}$.
2. **DLQ Routing (`stadium.dlq.unprocessed`):** If a message fails after $5\text{ attempts}$, Pub/Sub strips the `orderingKey` and pushes the payload along with stack trace metadata directly to `stadium.dlq.unprocessed`.
3. **DLQ Retention & Alerting:** `stadium.dlq.unprocessed` retains payloads for **$14\text{ days}$**. If DLQ queue depth exceeds $10\text{ messages}$ in a $5\text{-minute window}$, an automated P1 PagerDuty alert is triggered directly to Commander Marcus Vance (`ROLE_ORGANIZER`).

---

## 4. BACnet / Modbus Hardware Translation Engine (`apps/bms-gateway`)

When `apps/bms-gateway` receives a valid payload from `stadium.bms.commands`, it executes the physical hardware translation over local building industrial Ethernet (`VLAN 104`):

```ts
import { PubSub, Message } from '@google-cloud/pubsub';
import bacnet from 'bacstack'; // Official BACnet/IP protocol stack

const bacnetClient = new bacnet({ adpuTimeout: 3000 });

export async function processBMSCommandMessage(message: Message): Promise<void> {
  const payload = JSON.parse(message.data.toString()) as {
    commandId: string;
    zoneId: string;
    hardwareProtocol: 'BACNET_IP' | 'MODBUS_TCP';
    actionPayload: { targetDeviceAddress: string; objectInstance: number; targetValue: number };
  };

  if (payload.hardwareProtocol === 'BACNET_IP') {
    const [ipAddress, portStr] = payload.actionPayload.targetDeviceAddress.split(':');
    
    // Execute BACnet/IP WriteProperty to AHU Analog Output
    bacnetClient.writeProperty(
      ipAddress,
      8, // Object Type: Analog Output (Airflow Pct)
      payload.actionPayload.objectInstance,
      85, // Property ID: Present Value
      16, // Priority Level (System Automation)
      [{ type: bacnet.enum.ApplicationTags.REAL, value: payload.actionPayload.targetValue }],
      (err) => {
        if (err) {
          console.error(`BACnet actuation failed for ${payload.commandId}:`, err);
          message.nack(); // Triggers retry / DLQ fallback
        } else {
          message.ack();
        }
      }
    );
  } else {
    message.ack();
  }
}
```
