/**
 * @visionos/api-gateway/src/db/client.ts
 * Relational Cloud SQL PostgreSQL & PostGIS client wrapper (`11_Backend_Schema.md`).
 */

import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = global.prismaGlobal || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

/**
 * Executes an raw PostGIS spatial containment query ($O(1)$ GIST index lookup)
 * to verify if a given WGS 84 Point (`lon`, `lat`) is within a sector/zone polygon.
 */
export async function isPointInZonePolygon(zoneCode: string, lon: number, lat: number): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<{ contains: boolean }[]>`
      SELECT ST_Contains(polygon_geom, ST_SetSRID(ST_Point(${lon}, ${lat}), 4326)) as contains
      FROM stadium_zones
      WHERE zone_code = ${zoneCode}
      LIMIT 1;
    `;
    return result.length > 0 && result[0] ? result[0].contains : false;
  } catch (error) {
    console.error(`[PostGIS Client] Error evaluating point (${lon}, ${lat}) against zone ${zoneCode}:`, error);
    return false;
  }
}

/**
 * Appends an immutable audit log entry enforcing strict append-only RLS governance (`FR-COP-003`).
 */
export async function recordAuditLog(params: {
  traceId: string;
  actorJwtSub: string;
  actorRole: string;
  actionType: string;
  targetResource: string;
  payloadBefore?: Record<string, any> | null;
  payloadAfter: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        traceId: params.traceId,
        actorJwtSub: params.actorJwtSub,
        actorRole: params.actorRole,
        actionType: params.actionType,
        targetResource: params.targetResource,
        payloadBefore: params.payloadBefore ? (params.payloadBefore as any) : undefined,
        payloadAfter: (params.payloadAfter as any),
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("[PostGIS Client] Failed to insert immutable audit log:", error);
  }
}
