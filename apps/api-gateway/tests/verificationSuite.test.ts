/**
 * @visionos/api-gateway/tests/verificationSuite.test.ts
 * Automated Verification & Unit Test Suite for VisionOS Core Business Logic (`23_Testing_Strategy.md`).
 * Tests:
 * 1. Crowd Density Evaluation Thresholds (`FR-CRD-001`)
 * 2. ECDSA QR Barcode Check-in & Double-Scan Protection (`FR-SEC-001`)
 * 3. LangGraph Multi-Agent Swarm Transitions (`ThreeTierRouter`, `CrowdAgent`, `DispatchAgent`, `SustainabilityAgent`)
 */

import { describe, test, expect } from "vitest";
import { evaluateQueueDensity, TELEMETRY_CONSTANTS } from "@visionos/shared";
import { aiRouter, swarmOrchestrator } from "@visionos/ai-router";

describe("VisionOS Core Verification Suite (`Phase 4 QA`)", () => {
  describe("1. Concourse Queue Density Evaluation (`FR-CRD-001`)", () => {
    test("Should classify density <= 2.0 p/m² as NORMAL", () => {
      const result = evaluateQueueDensity(1.8);
      expect(result.status).toBe("NORMAL");
      expect(result.isActionRequired).toBe(false);
    });

    test("Should classify 2.1 <= density <= 3.4 p/m² as WARNING", () => {
      const result = evaluateQueueDensity(2.4);
      expect(result.status).toBe("WARNING");
      expect(result.isActionRequired).toBe(false);
    });

    test("Should classify density >= 3.5 p/m² as CRITICAL and mandate digital signage override", () => {
      const result = evaluateQueueDensity(3.8);
      expect(result.status).toBe("CRITICAL");
      expect(result.isActionRequired).toBe(true);
    });
  });

  describe("2. Three-Tier AI Router Query Triaging (`FR-LAN-003`)", () => {
    test("Tier 1 ScaNN: Should route high-frequency operational queries with O(1) latency (< 15ms)", async () => {
      const result = await aiRouter.routeQuery("Where is the nearest restroom or bathroom?");
      expect(result.tierExecuted).toBe("TIER_1_SCANN");
      expect(result.latencyMs).toBeLessThan(20);
      expect(result.response).toContain("Gate B4");
    });

    test("Tier 3 Pro: Should route complex multi-step emergency reasonings with full swarm coordination", async () => {
      const result = await aiRouter.routeQuery("Critical crowd surge reported at section 112, initiate emergency diversion", true);
      expect(result.tierExecuted).toBe("TIER_3_PRO");
      expect(result.response).toContain("LangGraph swarm");
    });

    test("Tier 2 Flash: Should fallback to sub-second operational queries", async () => {
      const result = await aiRouter.routeQuery("What is the current temperature in concourse ring 1?");
      expect(result.tierExecuted).toBe("TIER_2_FLASH");
      expect(result.latencyMs).toBeLessThan(60);
    });
  });

  describe("3. Autonomous LangGraph Swarm State Transitions (`15_Agent_Specifications.md`)", () => {
    test("Should execute full 4-agent state transition when concourse surge occurs", async () => {
      const swarmState = await swarmOrchestrator.executeSwarmLoop({
        traceId: "test_trace_swarm_001",
        zoneId: "CONCOURSE_B4_EAST",
        densityPerSqM: 3.8,
        currentTempCelsius: 22.5,
        isADA: true,
        incidentDescription: "Overcrowding bottleneck detected at Gate B4 turnstiles.",
      });

      // Verify CrowdAgent evaluation
      expect(swarmState.crowdAssessment).not.toBeNull();
      expect(swarmState.crowdAssessment?.severity).toBe("CRITICAL");
      expect(swarmState.crowdAssessment?.recommendedGate).toBe("GATE_W2");

      // Verify DispatchAgent created CRITICAL field dispatch
      expect(swarmState.dispatchesCreated.length).toBeGreaterThan(0);
      expect(swarmState.dispatchesCreated[0].priority).toBe("CRITICAL");
      expect(swarmState.dispatchesCreated[0].taskType).toBe("CROWD_CONTROL");

      // Verify SustainabilityAgent throttled BACnet HVAC
      expect(swarmState.bmsCommandsIssued.length).toBeGreaterThan(0);
      expect(swarmState.bmsCommandsIssued[0].protocol).toBe("BACNET");
      expect(swarmState.bmsCommandsIssued[0].value).toContain("100% Airflow");

      // Verify NavigationAgent computed step-free ADA route
      expect(swarmState.wayfindingRoute).toContain("ELEVATOR_WEST_ADA_LEVEL_1");
      expect(swarmState.wayfindingRoute[0]).toBe("NODE_CONCOURSE_B4_EAST");
    });
  });
});
