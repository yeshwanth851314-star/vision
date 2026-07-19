import { describe, it, expect } from "vitest";
import {
  ZoneTelemetrySchema,
  CrowdAlertPayloadSchema,
  BMSCommandSchema,
  VolunteerDispatchSchema,
  UserLoginRequestSchema,
  GateObserverSchema,
  RTSPStreamConfigSchema,
  formatCurrency,
  computeIoU,
} from "@visionos/shared";
import {
  CrowdAgent,
  DispatchAgent,
  SustainabilityAgent,
  NavigationAgent,
  SwarmOrchestrator,
  swarmOrchestrator,
} from "@visionos/ai-router";

describe("Tier 1: Functional Unit Tests (@visionos/shared Schemas & Enums)", () => {
  it("should validate a correct ZoneTelemetry payload matching ZoneTelemetrySchema", () => {
    const payload = {
      zoneId: "CONCOURSE_B4_EAST",
      sectorName: "Gate B4 East Concourse",
      densityPerSqM: 1.8,
      headcount: 420,
      averageFlowVelocityMps: 1.2,
      status: "NORMAL",
      timestamp: Date.now(),
    };
    const result = ZoneTelemetrySchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("should reject ZoneTelemetry with negative density or invalid enum status", () => {
    const invalidPayload = {
      zoneId: "",
      sectorName: "Gate B4 West Concourse",
      densityPerSqM: -1.5, // invalid negative density
      headcount: -5,
      averageFlowVelocityMps: 0.9,
      status: "INVALID_STATUS", // not in enum
      timestamp: -100,
    };
    const result = ZoneTelemetrySchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("should validate CrowdAlertPayload Schema for critical concourse overrides", () => {
    const alertPayload = {
      alertId: "33333333-3333-4333-8333-333333333333",
      zoneId: "CONCOURSE_B4_EAST",
      severity: "EMERGENCY_OVERRIDE",
      densityDetected: 4.8,
      recommendedGate: "GATE_W2",
      message: "Emergency concourse override: Severe density surge detected.",
      timestamp: Date.now(),
    };
    const result = CrowdAlertPayloadSchema.safeParse(alertPayload);
    expect(result.success).toBe(true);
  });

  it("should validate UserLoginRequestSchema role restrictions", () => {
    const validLogin = {
      email: "commander@visionos.ai",
      password: "SuperSecretPassword123!",
      role: "COMMANDER",
    };
    const invalidLogin = {
      email: "not-an-email",
      password: "short",
      role: "UNAUTHORIZED_ROLE",
    };
    expect(UserLoginRequestSchema.safeParse(validLogin).success).toBe(true);
    expect(UserLoginRequestSchema.safeParse(invalidLogin).success).toBe(false);
  });

  it("should enforce BMSCommandSchema and RTSPStreamConfigSchema structures", () => {
    const bmsCommand = {
      commandId: "55555555-5555-4555-8555-555555555555",
      targetDeviceNumber: "1024",
      protocol: "BACNET",
      property: "PRESENT_VALUE",
      value: "100% Airflow @ 19.5°C",
      timestamp: Date.now(),
    };
    expect(BMSCommandSchema.safeParse(bmsCommand).success).toBe(true);

    const rtspConfig = {
      cameraId: "CAM_B4_01",
      rtspUri: "rtsp://10.20.30.40:554/live/ch1",
      targetFps: 30,
      enableTensorRT: true,
      enableGaussianBlur: true,
    };
    expect(RTSPStreamConfigSchema.safeParse(rtspConfig).success).toBe(true);
  });
});

describe("Tier 1: Functional Unit Tests (@visionos/ai-router Swarm Agents)", () => {
  it("CrowdAgent should detect critical density >= 3.5 and recommend Gate W2 diversion", async () => {
    const crowdAgent = new CrowdAgent();
    const alert = await crowdAgent.analyzeSurge(4.2, "CONCOURSE_B4_EAST");
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("CRITICAL");
    expect(alert?.recommendedGate).toBe("GATE_W2");
    expect(alert?.densityDetected).toBe(4.2);
  });

  it("CrowdAgent should return warning alert for density between 2.1 and 3.5", async () => {
    const crowdAgent = new CrowdAgent();
    const alert = await crowdAgent.analyzeSurge(2.8, "CONCOURSE_B4_WEST");
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("WARNING");
    expect(alert?.recommendedGate).toBe("GATE_B4");
  });

  it("CrowdAgent should return null for normal density < 2.1", async () => {
    const crowdAgent = new CrowdAgent();
    const alert = await crowdAgent.analyzeSurge(1.5, "CONCOURSE_B4_WEST");
    expect(alert).toBeNull();
  });

  it("DispatchAgent should assign volunteer with unique ID and valid properties", async () => {
    const dispatchAgent = new DispatchAgent();
    const dispatch = await dispatchAgent.assignVolunteer(
      "CONCOURSE_B4_EAST",
      "CROWD_CONTROL",
      "CRITICAL",
      "Emergency concourse crowd dispersal required."
    );
    expect(dispatch).toBeDefined();
    expect(dispatch.zoneId).toBe("CONCOURSE_B4_EAST");
    expect(dispatch.taskType).toBe("CROWD_CONTROL");
    expect(dispatch.priority).toBe("CRITICAL");
    expect(dispatch.status).toBe("ASSIGNED");
    expect(VolunteerDispatchSchema.safeParse(dispatch).success).toBe(true);
  });

  it("SustainabilityAgent should optimize HVAC airflow based on crowd density", async () => {
    const sustainabilityAgent = new SustainabilityAgent();
    const bmsCmd = await sustainabilityAgent.optimizeHVAC("CONCOURSE_B4_EAST", 3.8, 23.0);
    expect(bmsCmd).toBeDefined();
    expect(bmsCmd.protocol).toBe("BACNET");
    expect(bmsCmd.property).toBe("PRESENT_VALUE");
    expect(String(bmsCmd.value)).toContain("100% Airflow");
    expect(BMSCommandSchema.safeParse(bmsCmd).success).toBe(true);
  });

  it("NavigationAgent should calculate step-free ADA wayfinding paths", async () => {
    const navigationAgent = new NavigationAgent();
    const standardRoute = await navigationAgent.calculateWayfindingRoute("NODE_B4", "NODE_W2", false);
    const adaRoute = await navigationAgent.calculateWayfindingRoute("NODE_B4", "NODE_W2", true);

    expect(standardRoute).toContain("ESCALATOR_CENTRAL_CONCOURSE");
    expect(adaRoute).toContain("ELEVATOR_WEST_ADA_LEVEL_1");
    expect(adaRoute).not.toContain("ESCALATOR_CENTRAL_CONCOURSE");
  });

  it("SwarmOrchestrator should execute complete deterministic loop and aggregate dispatches + BMS commands", async () => {
    const result = await swarmOrchestrator.executeSwarmLoop({
      traceId: "trace-test-101",
      zoneId: "CONCOURSE_B4_EAST",
      densityPerSqM: 4.1,
      currentTempCelsius: 24.0,
      isADA: true,
      incidentDescription: "High surge reported by turnstile optical counters.",
    });

    expect(result.traceId).toBe("trace-test-101");
    expect(result.crowdAssessment?.severity).toBe("CRITICAL");
    expect(result.dispatchesCreated.length).toBeGreaterThan(0);
    expect(result.bmsCommandsIssued.length).toBe(1);
    expect(result.wayfindingRoute).toContain("ELEVATOR_WEST_ADA_LEVEL_1");
    expect(result.executionSummary).toContain("Swarm loop completed for CONCOURSE_B4_EAST");
  });

  it("SwarmOrchestrator should fall back correctly for normal densities and default parameters", async () => {
    const result = await swarmOrchestrator.executeSwarmLoop({
      traceId: "trace-test-102",
      zoneId: "ZONE_A",
      densityPerSqM: 1.0,
    });

    expect(result.traceId).toBe("trace-test-102");
    expect(result.crowdAssessment).toBeNull();
    expect(result.dispatchesCreated.length).toBe(0);
    expect(result.bmsCommandsIssued[0].value).toContain("80% Airflow @ 21.5°C");
    expect(result.wayfindingRoute).toContain("ESCALATOR_CENTRAL_CONCOURSE");
    expect(result.initialQueryOrEvent).toBe("Concourse check at ZONE_A (1 p/m²)");
  });

  it("DispatchAgent should generate random volunteer ID if zone ID has no numbers", async () => {
    const dispatchAgent = new DispatchAgent();
    const dispatch = await dispatchAgent.assignVolunteer("ZONE_WITHOUT_DIGITS");
    expect(dispatch.volunteerId).toMatch(/^VOL-\d{3}$/);
  });
});

describe("Tier 1: Functional Unit Tests (@visionos/shared Utilities)", () => {
  it("should format currency correctly in USD and specified currencies", () => {
    expect(formatCurrency(100)).toBe("$1.00");
    expect(formatCurrency(1500, "EUR")).toBe("€15.00");
  });

  it("should compute Intersection over Union (IoU) correctly", () => {
    const boxA = { xMin: 0, yMin: 0, xMax: 10, yMax: 10 };
    const boxB = { xMin: 5, yMin: 5, xMax: 15, yMax: 15 };
    // Intersection: (5,5) to (10,10) -> area 25
    // Box A: 100, Box B: 100
    // Union: 100 + 100 - 25 = 175
    // IoU: 25 / 175 = 0.142857...
    expect(computeIoU(boxA, boxB)).toBeCloseTo(0.142857, 4);

    const nonOverlappingBox = { xMin: 20, yMin: 20, xMax: 30, yMax: 30 };
    expect(computeIoU(boxA, nonOverlappingBox)).toBe(0);
  });
});
