/**
 * @visionos/api-gateway/src/db/firestoreClient.ts
 * Firebase Admin SDK Firestore client wrapper & sharded telemetry ingestion (`12_Firestore_Schema.md`).
 */

// Simulated or real Firestore interface compatible with Admin SDK / local state
export interface IFirestoreTelemetryShard {
  shardId: string;
  latestCameraFrameTimestampUtc: string;
  sourceEdgeNodeId: string;
  personBoundingBoxCount: number;
  detectedWeaponBoxes: number;
  queueDepthMeters: number;
}

export interface IFirestoreConcourseZoneDocument {
  zoneId: string;
  sectorId: string;
  zoneName: string;
  currentDensityPerSqM: number;
  currentPersonCount: number;
  flowVelocityPerMinute: number;
  status: "NORMAL" | "WARNING" | "CRITICAL";
  activeAcousticDecibels: number;
  hasActiveStrobeHazards: boolean;
  isDigitalSignageThrottled: boolean;
  lastUpdatedUtc: string;
}

export interface IFirestoreGlobalStateDocument {
  eventId: string;
  stadiumOccupancyTotal: number;
  stadiumCapacityTotal: number;
  isEmergencyEvacActive: boolean;
  emergencyType: "NONE" | "CRITICAL_SURGE" | "FIRE" | "SECURITY";
  evacuationTargetSafeGate: string | null;
  isGreenCorridorModeActive: boolean;
  activeGreenCorridorSectorIds: string[];
  lastStateChangeUtc: string;
}

class FirestoreShardedTelemetryManager {
  private inMemoryZones: Map<string, IFirestoreConcourseZoneDocument> = new Map();
  private inMemoryShards: Map<string, IFirestoreTelemetryShard> = new Map();
  private globalState: IFirestoreGlobalStateDocument = {
    eventId: "FIFA_2026_MATCH_48_ARG_BRA",
    stadiumOccupancyTotal: 81420,
    stadiumCapacityTotal: 85000,
    isEmergencyEvacActive: false,
    emergencyType: "NONE",
    evacuationTargetSafeGate: null,
    isGreenCorridorModeActive: false,
    activeGreenCorridorSectorIds: [],
    lastStateChangeUtc: new Date().toISOString(),
  };

  /**
   * Simple CRC32 hash modulo 10 to distribute incoming frame telemetry evenly across 10 document shards.
   */
  public computeShardIndex(sourceId: string): number {
    let hash = 0;
    for (let i = 0; i < sourceId.length; i++) {
      hash = (hash << 5) - hash + sourceId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 10;
  }

  /**
   * Ingests high-frequency ($1\text{ Hz}$) frame data into `/stadium/zones/{zoneId}/telemetry_shards/shard_{0..9}`.
   */
  public async writeTelemetryShard(zoneId: string, sourceEdgeNodeId: string, personCount: number, queueDepth: number): Promise<string> {
    const shardIdx = this.computeShardIndex(sourceEdgeNodeId);
    const shardId = `shard_${shardIdx}`;
    const fullPath = `/stadium/zones/${zoneId}/telemetry_shards/${shardId}`;

    const shardData: IFirestoreTelemetryShard = {
      shardId,
      latestCameraFrameTimestampUtc: new Date().toISOString(),
      sourceEdgeNodeId,
      personBoundingBoxCount: personCount,
      detectedWeaponBoxes: 0,
      queueDepthMeters: queueDepth,
    };

    this.inMemoryShards.set(fullPath, shardData);
    return fullPath;
  }

  /**
   * Updates parent aggregated zone document (`/stadium/zones/{zoneId}`).
   */
  public async updateConcourseZone(zoneId: string, data: Partial<IFirestoreConcourseZoneDocument>): Promise<IFirestoreConcourseZoneDocument> {
    const existing = this.inMemoryZones.get(zoneId) || {
      zoneId,
      sectorId: "SECTOR_112",
      zoneName: `Concourse Ring 1 - ${zoneId}`,
      currentDensityPerSqM: 1.5,
      currentPersonCount: 180,
      flowVelocityPerMinute: 800,
      status: "NORMAL",
      activeAcousticDecibels: 82.0,
      hasActiveStrobeHazards: false,
      isDigitalSignageThrottled: false,
      lastUpdatedUtc: new Date().toISOString(),
    };

    const updated: IFirestoreConcourseZoneDocument = {
      ...existing,
      ...data,
      lastUpdatedUtc: new Date().toISOString(),
    };

    this.inMemoryZones.set(zoneId, updated);
    return updated;
  }

  /**
   * Retrieves global system state (`/stadium/system/global_state`).
   */
  public async getGlobalState(): Promise<IFirestoreGlobalStateDocument> {
    return this.globalState;
  }

  /**
   * Mutates global system state (`/stadium/system/global_state`).
   */
  public async updateGlobalState(updates: Partial<IFirestoreGlobalStateDocument>): Promise<IFirestoreGlobalStateDocument> {
    this.globalState = {
      ...this.globalState,
      ...updates,
      lastStateChangeUtc: new Date().toISOString(),
    };
    return this.globalState;
  }
}

export const firestoreManager = new FirestoreShardedTelemetryManager();
