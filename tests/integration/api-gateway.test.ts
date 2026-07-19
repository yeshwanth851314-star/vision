import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { registerCopRoutes } from "../../apps/api-gateway/src/routes/copRoutes";
import { SocketManager } from "../../apps/api-gateway/src/sockets/socketManager";

describe("Tier 2: API Gateway Contract & Integration Verification", () => {
  let fastify: FastifyInstance;
  const mockJwtHeader = {
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJDT01NQU5ERVJfVkFOQ0UiLCJyb2xlIjoiQ09NTUFOREVSIn0.signature",
  };
  const fanJwtHeader = {
    Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJGQU5fTUFURU8iLCJyb2xlIjoiRkFOIiwic2VjdG9yQ29kZSI6IlNFQ1RPUl8xMTIifQ.signature",
  };

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("socketManager", null as any);
    await registerCopRoutes(fastify);

    fastify.get("/health", async () => {
      return { status: "UP", service: "api-gateway", timestamp: Date.now() };
    });

    await fastify.ready();
    const socketManager = new SocketManager(fastify.server);
    (fastify as any).socketManager = socketManager;
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("GET /health should return 200 UP status without authentication required", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/health",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe("UP");
    expect(body.service).toBe("api-gateway");
  });

  it("GET /api/v1/cop/gates/:gateId should reject unauthenticated requests with 401 Unauthorized", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/api/v1/cop/gates/GATE_B4",
    });
    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.error).toContain("Unauthorized");
  });

  it("POST /api/v1/ai/swarm/execute should run LangGraph multi-agent loop with valid JWT header", async () => {
    const payload = {
      zoneId: "CONCOURSE_B4_EAST",
      densityPerSqM: 4.5,
      currentTempCelsius: 24.5,
      isADA: true,
      incidentDescription: "Severe concourse congestion reported.",
    };

    const response = await fastify.inject({
      method: "POST",
      url: "/api/v1/ai/swarm/execute",
      headers: mockJwtHeader,
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.activeZoneId).toBe("CONCOURSE_B4_EAST");
    expect(body.crowdAssessment.severity).toBe("CRITICAL");
    expect(body.dispatchesCreated.length).toBe(1);
    expect(body.bmsCommandsIssued.length).toBe(1);
    expect(body.wayfindingRoute).toContain("ELEVATOR_WEST_ADA_LEVEL_1");
  });

  it("POST /api/v1/ai/route should route queries through the Three-Tier Model Router", async () => {
    const payload = {
      queryText: "How many volunteers are currently active near Gate B4?",
      requiresComplexReasoning: false,
    };

    const response = await fastify.inject({
      method: "POST",
      url: "/api/v1/ai/route",
      headers: mockJwtHeader,
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toBeDefined();
  });

  it("POST /api/v1/bms/hvac/throttle should generate and broadcast BACnet throttling command", async () => {
    const payload = {
      zoneId: "CONCOURSE_B4_EAST",
      targetAirflowPct: 100,
      targetTempCelsius: 19.5,
    };

    const response = await fastify.inject({
      method: "POST",
      url: "/api/v1/bms/hvac/throttle",
      headers: mockJwtHeader,
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.protocol).toBe("BACNET");
    expect(body.property).toBe("PRESENT_VALUE");
  });

  it("POST /api/v1/telemetry/frame should ingest high-frequency CV edge frame data", async () => {
    const payload = {
      traceId: "trace_cam_b4_01",
      cameraId: "CAM_B4_01",
      zoneId: "CONCOURSE_B4_EAST",
      sectorName: "EAST_WING",
      personBoundingBoxCount: 142,
      areaSqM: 80,
      queueDepthMeters: 4.2,
      averageFlowVelocityMps: 1.1,
    };

    const response = await fastify.inject({
      method: "POST",
      url: "/api/v1/telemetry/frame",
      headers: mockJwtHeader,
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.headcount).toBe(142);
    expect(body.densityPerSqM).toBe(1.77);
    expect(body.status).toBeDefined();
  });

  it("POST /api/v1/cop/dispatches should create field volunteer dispatch assignment", async () => {
    const payload = {
      traceId: "trace_disp_001",
      zoneId: "CONCOURSE_B4_EAST",
      priorityLevel: "P1_CRITICAL" as any,
      hazardCategory: "MEDICAL_EMERGENCY" as any,
      taskDescription: "Medical assistance needed near gate B4.",
    };

    const response = await fastify.inject({
      method: "POST",
      url: "/api/v1/cop/dispatches",
      headers: mockJwtHeader,
      payload,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.id).toBeDefined();
    expect(body.status).toBe("PENDING");
  });

  it("POST /api/v1/turnstile/checkin should verify QR ticket ECDSA pass", async () => {
    const payload = {
      traceId: "trace_chk_001",
      ticketBarcodeHash: "TCK-SIM-2026-991",
      entryGateCode: "GATE_B4",
    };

    const response = await fastify.inject({
      method: "POST",
      url: "/api/v1/turnstile/checkin",
      headers: mockJwtHeader,
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.sectorCode).toBe("SECTOR_112");
  });

  it("implements the approved fan check-in and accessible route contracts", async () => {
    const checkin = await fastify.inject({
      method: "POST",
      url: "/api/v1/auth/checkin",
      headers: fanJwtHeader,
      payload: { ticketBarcodeHash: "TCK-SIM-2026-992", deviceBleAnchorId: "BEACON_B4", clientAppVersion: "1.0.0", requiresWheelchairAccess: true },
    });
    expect(checkin.statusCode).toBe(200);
    expect(JSON.parse(checkin.payload).checkInStatus).toBe("VERIFIED_ACTIVE");

    const route = await fastify.inject({
      method: "POST",
      url: "/api/v1/navigation/route",
      headers: fanJwtHeader,
      payload: { sourceNodeId: "NODE_GATE_B4", destinationNodeId: "NODE_SEAT_112", requiresWheelchairAccess: true },
    });
    expect(route.statusCode).toBe(200);
    const body = JSON.parse(route.payload);
    expect(body.isAdaCompliant).toBe(true);
    expect(body.steps).toHaveLength(2);
    expect(route.headers["x-trace-id"]).toBeDefined();
  });

  it("restricts global emergency override to organizers", async () => {
    const forbidden = await fastify.inject({
      method: "POST",
      url: "/api/v1/cop/emergency/trigger",
      headers: fanJwtHeader,
      payload: { emergencyType: "FIRE", targetSectorId: "SECTOR_EAST_L2", evacuationTargetSafeGate: "GATE_W2", justificationNotes: "Confirmed fire plume from camera 104." },
    });
    expect(forbidden.statusCode).toBe(403);

    const allowed = await fastify.inject({
      method: "POST",
      url: "/api/v1/cop/emergency/trigger",
      headers: mockJwtHeader,
      payload: { emergencyType: "FIRE", targetSectorId: "SECTOR_EAST_L2", evacuationTargetSafeGate: "GATE_W2", justificationNotes: "Confirmed fire plume from camera 104." },
    });
    expect(allowed.statusCode).toBe(201);
    expect(JSON.parse(allowed.payload).globalStateStatus).toBe("CRITICAL_EMERGENCY");
  });
});
