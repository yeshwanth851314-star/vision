# 12_Firestore_Schema: VisionOS Real-Time NoSQL Document Structures & Rules

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Real-Time Operational NoSQL Document Schema & Security Rules (`Google Cloud Firestore`) |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Cloud Systems Architect, Lead Database Architect |
| **Purpose** | To establish exact document hierarchies, sub-collection shard topologies, composite indexing JSON specifications (`firestore.indexes.json`), and role-based security rules (`firestore.rules`) for real-time state synchronization ($\ge 1\text{ Hz}$). |
| **Scope** | Serves as the operational state engine driven by `onSnapshot` subscriptions across `apps/mobile` (`Fan & Volunteer App`), `apps/web` (`Organizer 3D COP`), and `packages/ai-router`. |
| **Assumptions** | 1. Firestore handles volatile, high-velocity updates (CV crowd heatmaps, vendor wait times, active emergency banners); relational geometry and ticket ledgers reside in Cloud SQL (`11_Backend_Schema.md`).<br>2. Document writes are sharded ($10\text{ shards per high-velocity zone}$) to strictly prevent exceeding Firestore's $1\text{ write/second per document limit}$. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `11_Backend_Schema.md` — Relational Cloud SQL Schema<br>• `20_WebSocket_Flow.md` — Push Mesh Gateway |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Cloud Systems Architect | Initial production release of document structures, sharded telemetry subcollections, composite indexes, and strict rules. |

---

## 1. NoSQL Document Topology & Collection Hierarchy

```mermaid
graph TD
  Root[`stadium/` (Root Document)]
  
  subgraph TopCollections [Primary Operational Collections]
    Zones[`zones/` (Concourse Density & Heatmaps)]
    Beacons[`beacons/` (BLE Grid Calibration)]
    Vendors[`vendors/` (Concessions & Live Wait Times)]
    Dispatches[`dispatches/` (Active Volunteer Tickets)]
    System[`system/` (Global Emergency Overrides)]
  end

  subgraph SubCollections [Sharded High-Velocity Subcollections]
    TelemetryShards[`zones/{zoneId}/telemetry_shards/shard_0..9` <br> ($1\text{ Hz}$ CV Queue Ingestion)]
    VendorOrders[`vendors/{vendorId}/active_orders/{orderId}` <br> (Real-Time Kitchen Queue)]
  end

  Root --> Zones
  Root --> Beacons
  Root --> Vendors
  Root --> Dispatches
  Root --> System

  Zones --> TelemetryShards
  Vendors --> VendorOrders
```

---

## 2. Document Schema Specifications (Exact JSON Profiles)

### 2.1 Collection: `zones` (`/stadium/zones/{zoneId}`)
Stores aggregated, real-time crowd density ($\text{persons/m}^2$) and active warning throttles for each physical concourse section (`FR-CRD-001`).

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FirestoreConcourseZoneDocument",
  "type": "object",
  "required": ["zoneId", "sectorId", "zoneName", "currentDensityPerSqM", "status", "lastUpdatedUtc"],
  "properties": {
    "zoneId": { "type": "string", "example": "CONCOURSE_B4_EAST" },
    "sectorId": { "type": "string", "example": "SECTOR_112" },
    "zoneName": { "type": "string", "example": "Concourse Ring 1 - Gate B4 Corridor" },
    "currentDensityPerSqM": { "type": "number", "minimum": 0.0, "example": 3.4 },
    "currentPersonCount": { "type": "integer", "minimum": 0, "example": 420 },
    "flowVelocityPerMinute": { "type": "integer", "example": 1140 },
    "status": { "type": "string", "enum": ["NORMAL", "WARNING", "CRITICAL"], "example": "WARNING" },
    "activeAcousticDecibels": { "type": "number", "example": 96.5 },
    "hasActiveStrobeHazards": { "type": "boolean", "example": false },
    "isDigitalSignageThrottled": { "type": "boolean", "example": true },
    "lastUpdatedUtc": { "type": "string", "format": "date-time", "example": "2026-07-13T18:45:12.104Z" }
  }
}
```

#### Subcollection: `telemetry_shards` (`/stadium/zones/{zoneId}/telemetry_shards/shard_{0..9}`)
To absorb high-frequency $1\text{ Hz}$ write bursts from NVIDIA Jetson edge nodes (`17_Computer_Vision_Pipeline.md`) without triggering write contention ($1\text{ write/sec limit}$), the API Gateway hashes incoming payloads via `crc32(cameraId) % 10` and writes directly to these 10 shards.

```json
{
  "shardId": "shard_4",
  "latestCameraFrameTimestampUtc": "2026-07-13T18:45:12.050Z",
  "sourceEdgeNodeId": "JETSON_AGX_ORIN_NODE_04",
  "personBoundingBoxCount": 42,
  "detectedWeaponBoxes": 0,
  "queueDepthMeters": 14.5
}
```

---

### 2.2 Collection: `vendors` (`/stadium/vendors/{vendorId}`)
Drives live wait-time badges (`[12 MIN WAIT]`) on fan mobile apps (`FR-CRD-003`).

```json
{
  "vendorId": "VENDOR_GRILL_B4",
  "vendorName": "World Cup Halal & South American Grill",
  "category": "HALAL",
  "locationConcourse": "Concourse Ring Level 1 - Column 22",
  "isOpen": true,
  "queuePersonCount": 24,
  "estimatedWaitMinutes": 12,
  "status": "NORMAL",
  "historicalThroughputPerMinute": 2.0,
  "menuCatalog": [
    { "itemId": "ITEM_CHORIPAN_01", "name": "Choripán with Chimichurri", "priceUsd": 14.50, "inStock": true }
  ],
  "lastUpdatedUtc": "2026-07-13T18:44:30.000Z"
}
```

---

### 2.3 Collection: `system` (`/stadium/system/global_state`)
The single source of truth document observed by every active mobile and web client (`apps/mobile/_layout.tsx`, `apps/web/layout.tsx`). When Commander Vance overrides this document (`isEmergencyEvacActive: true`), all clients instantly lock out normal tabs (`FR-EMR-002`).

```json
{
  "eventId": "FIFA_2026_MATCH_48_ARG_BRA",
  "stadiumOccupancyTotal": 81420,
  "stadiumCapacityTotal": 85000,
  "isEmergencyEvacActive": false,
  "emergencyType": "NONE",
  "evacuationTargetSafeGate": null,
  "isGreenCorridorModeActive": false,
  "activeGreenCorridorSectorIds": [],
  "lastStateChangeUtc": "2026-07-13T17:00:00.000Z"
}
```

---

## 3. Composite Indexes Configuration (`firestore.indexes.json`)

To enable complex analytical sorting in Commander Vance's 3D COP (`apps/web`) and volunteer dispatch routing (`DispatchAgent`), the following composite indexes must be deployed via `firebase deploy --only firestore:indexes`:

```json
{
  "indexes": [
    {
      "collectionGroup": "zones",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "currentDensityPerSqM", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "dispatches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "priorityLevel", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "vendors",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "isOpen", "order": "ASCENDING" },
        { "fieldPath": "estimatedWaitMinutes", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 4. Role-Based Security Rules (`firestore.rules`)

Enforces exact RBAC isolation (`ROLE_FAN`, `ROLE_VOLUNTEER`, `ROLE_ORGANIZER`, `ROLE_RESPONDER`) directly at the database edge:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions decoding custom JWT claims
    function isAuthenticated() {
      return request.auth != null && request.auth.token.sub != null;
    }
    
    function hasRole(roleName) {
      return isAuthenticated() && request.auth.token.role == roleName;
    }

    function isOrganizerOrResponder() {
      return hasRole('ROLE_ORGANIZER') || hasRole('ROLE_RESPONDER');
    }

    // ========================================================================
    // RULE 1: GLOBAL SYSTEM STATE (`/stadium/system/global_state`)
    // ========================================================================
    match /stadium/system/global_state {
      // All authenticated fans and volunteers can read the global state (to detect emergency overrides)
      allow read: if isAuthenticated();
      // Only Command Staff (`ROLE_ORGANIZER`) or system service accounts can trigger or clear emergency overrides
      allow write: if hasRole('ROLE_ORGANIZER');
    }

    // ========================================================================
    // RULE 2: CONCOURSE ZONES & TELEMETRY (`/stadium/zones/{zoneId}`)
    // ========================================================================
    match /stadium/zones/{zoneId} {
      allow read: if isAuthenticated();
      // Client apps cannot write directly to zones; only trusted API Gateway / Edge CV service accounts can mutate
      allow write: if false;

      match /telemetry_shards/{shardId} {
        allow read: if isOrganizerOrResponder() || hasRole('ROLE_VOLUNTEER');
        allow write: if false; // Mutated strictly via Admin SDK in Cloud Run API Gateway
      }
    }

    // ========================================================================
    // RULE 3: VENDORS & LIVE CONCESSIONS (`/stadium/vendors/{vendorId}`)
    // ========================================================================
    match /stadium/vendors/{vendorId} {
      allow read: if isAuthenticated();
      allow write: if hasRole('ROLE_ORGANIZER');
    }

    // ========================================================================
    // RULE 4: VOLUNTEER DISPATCHES (`/stadium/dispatches/{dispatchId}`)
    // ========================================================================
    match /stadium/dispatches/{dispatchId} {
      // Volunteers can read dispatches assigned specifically to their JWT `sub`
      allow read: if isOrganizerOrResponder() || 
                  (hasRole('ROLE_VOLUNTEER') && resource.data.assignedVolunteerSub == request.auth.token.sub);
      
      // Volunteers can only update status (`ACKNOWLEDGED` -> `RESOLVED`) on their assigned tickets
      allow update: if hasRole('ROLE_VOLUNTEER') && 
                    resource.data.assignedVolunteerSub == request.auth.token.sub &&
                    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'resolvedAtUtc', 'notes']);
      
      allow create, delete: if hasRole('ROLE_ORGANIZER');
    }
  }
}
```
