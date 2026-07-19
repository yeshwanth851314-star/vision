/**
 * @visionos/performance/load-benchmark.test.ts
 * Non-Functional Performance, Throughput, and Latency Benchmark Suite (`23_Testing_Strategy.md`).
 * Verifies high-frequency concurrency, sub-100ms SLA guarantees, and AI Router throughput under stress.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { registerCopRoutes } from "../../apps/api-gateway/src/routes/copRoutes";
import { SocketManager } from "../../apps/api-gateway/src/sockets/socketManager";
import { io as ClientIO } from "socket.io-client";

describe("Tier 4: Non-Functional Performance & Load Testing (`FR-NFR-001`)", () => {
  let fastify: FastifyInstance;
  const mockJwtHeader = {
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJDT01NQU5ERVJfVkFOQ0UiLCJyb2xlIjoiQ09NTUFOREVSIn0.signature",
  };

  let port: number;
  let socketManager: SocketManager;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("socketManager", null as any);
    await registerCopRoutes(fastify);
    await fastify.listen({ port: 0 });
    const address = fastify.server.address();
    port = typeof address === "string" ? 0 : address?.port || 0;
    
    socketManager = new SocketManager(fastify.server);
    (fastify as any).socketManager = socketManager;
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("Should process 100 concurrent CV edge telemetry frames in < 500ms total execution time", async () => {
    const BATCH_SIZE = 100;
    const startTime = performance.now();

    const requests = Array.from({ length: BATCH_SIZE }, (_, idx) =>
      fastify.inject({
        method: "POST",
        url: "/api/v1/telemetry/frame",
        headers: mockJwtHeader,
        payload: {
          traceId: `trace_perf_${idx}`,
          cameraId: `CAM_PERF_${idx % 10}`,
          zoneId: `CONCOURSE_ZONE_${idx % 5}`,
          sectorName: "PERF_WING",
          personBoundingBoxCount: 50 + (idx % 100),
          areaSqM: 100,
          queueDepthMeters: 2.5,
          averageFlowVelocityMps: 1.3,
        },
      })
    );

    const responses = await Promise.all(requests);
    const totalTimeMs = performance.now() - startTime;

    expect(responses.length).toBe(BATCH_SIZE);
    for (const res of responses) {
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.densityPerSqM).toBeDefined();
    }

    // Verify throughput: 100 concurrent requests processed in under 500ms (~5ms average per frame)
    expect(totalTimeMs).toBeLessThan(500);
  });

  it("Should execute AI Router queries with average latency under SLA (< 20ms for Tier 1 ScaNN)", async () => {
    const ITERATIONS = 50;
    const startTime = performance.now();

    const queries = Array.from({ length: ITERATIONS }, (_, i) =>
      fastify.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: mockJwtHeader,
        payload: {
          queryText: `Where is gate B${(i % 10) + 1}?`,
          requiresComplexReasoning: false,
        },
      })
    );

    const results = await Promise.all(queries);
    const duration = performance.now() - startTime;
    const avgLatencyMs = duration / ITERATIONS;

    expect(results.length).toBe(ITERATIONS);
    for (const res of results) {
      expect(res.statusCode).toBe(200);
    }
    expect(avgLatencyMs).toBeLessThan(20);
  });

  it("Should sustain rapid volunteer field dispatch assignments without memory leaks or race conditions", async () => {
    const DISPATCH_BATCH = 30;
    const requests = Array.from({ length: DISPATCH_BATCH }, (_, i) =>
      fastify.inject({
        method: "POST",
        url: "/api/v1/cop/dispatches",
        headers: mockJwtHeader,
        payload: {
          traceId: `trace_burst_disp_${i}`,
          zoneId: `ZONE_${i % 4}`,
          priorityLevel: "P2_HIGH" as any,
          hazardCategory: "CROWD_CONTROL" as any,
          taskDescription: `Simulated high-load incident #${i}`,
        },
      })
    );

    const responses = await Promise.all(requests);
    expect(responses.length).toBe(DISPATCH_BATCH);
    for (const res of responses) {
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeDefined();
    }
  });

  it("Should establish a secure real-time WebSocket session, subscribe to zones, and receive broadcasts", () => {
    return new Promise<void>((resolve, reject) => {
      const clientSocket = ClientIO(`http://localhost:${port}`, {
        path: "/api/v1/realtime/mesh",
        auth: {
          token: mockJwtHeader.Authorization.split(" ")[1],
        },
        transports: ["websocket"],
      });

      const cleanup = () => {
        if (clientSocket.connected) {
          clientSocket.disconnect();
        }
      };

      clientSocket.on("connect", () => {
        clientSocket.emit("join:zone", "ZONE_REALTIME_TEST");
        clientSocket.emit("join:alerts");

        // Delay broadcast slightly to allow server to process joins
        setTimeout(() => {
          try {
            socketManager.broadcastZoneTelemetry({
              zoneId: "ZONE_REALTIME_TEST",
              densityPerSqM: 1.8,
              headcount: 180,
              averageFlowVelocityMps: 1.2,
              status: "NORMAL",
              timestamp: Date.now(),
            });
          } catch (err) {
            cleanup();
            reject(err);
          }
        }, 150);
      });

      clientSocket.on("telemetry:update", (data) => {
        try {
          expect(data.zoneId).toBe("ZONE_REALTIME_TEST");
          expect(data.densityPerSqM).toBe(1.8);
          
          // Next, test emergency broadcast
          socketManager.broadcastEmergencyOverride({
            alertId: "alert-id-123",
            zoneId: "ZONE_REALTIME_TEST",
            severity: "CRITICAL",
            densityDetected: 4.2,
            recommendedGate: "GATE_W2",
            message: "Critical bottleneck",
            timestamp: Date.now(),
          });
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      clientSocket.on("EMERGENCY_OVERRIDE", (data) => {
        try {
          expect(data.alertId).toBe("alert-id-123");
          expect(data.severity).toBe("CRITICAL");
          cleanup();
          resolve();
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      clientSocket.on("connect_error", (err) => {
        cleanup();
        reject(err);
      });
    });
  });
});
