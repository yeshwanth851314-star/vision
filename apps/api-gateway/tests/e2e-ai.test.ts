import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app";
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Load workspace root .env file
try {
  const envPath = path.resolve(__dirname, "../../../.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    }
  }
} catch (e) {
  // ignore
}

describe("Step 3 & 4 E2E: RAG + Gemini + Tool-Calling E2E path", () => {
  let app: FastifyInstance;
  const secret = "test-secret-key-1234567890";
  let originalEnv: string | undefined;

  beforeAll(async () => {
    originalEnv = process.env.VISIONOS_JWT_SECRET;
    process.env.VISIONOS_JWT_SECRET = secret;
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    if (originalEnv) process.env.VISIONOS_JWT_SECRET = originalEnv;
    else delete process.env.VISIONOS_JWT_SECRET;
  });

  function createToken(payload: any): string {
    const fullPayload = {
      ...payload,
      iss: payload.iss !== undefined ? payload.iss : (process.env.VISIONOS_JWT_ISSUER || undefined),
      aud: payload.aud !== undefined ? payload.aud : (process.env.VISIONOS_JWT_AUDIENCE || undefined),
    };
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
    const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${signature}`;
  }

  describe("MOCKED_AI_E2E classification", () => {
    test("Should route standard ScaNN vector query with O(1) mock cache lookup", async () => {
      const token = createToken({ sub: "user1", role: "FAN", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "Where is the nearest restroom or bathroom?",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.tierExecuted).toBe("TIER_1_SCANN");
      expect(json.response).toContain("Gate B4");
    });
  });

  describe("INTEGRATION_AI_E2E classification", () => {
    test("Should reject privileged tool calls for ROLE_FAN at the application authorization layer", async () => {
      const token = createToken({ sub: "user1", role: "FAN", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "E2E_TEST_DISPATCH",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      // Verify that privilege execution is blocked for FAN
      expect(json.response).toContain("Security Refusal");
      expect(json.response).toContain("Unauthorized role");
    });

    test("Should allow privileged tool calls for ROLE_ORGANIZER at the application authorization layer", async () => {
      const token = createToken({ sub: "org1", role: "ORGANIZER", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "E2E_TEST_DISPATCH",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.response).toContain("Successfully triggered tool call");
      expect(json.response).toContain("Assigned VOL-842");
    });
  });

  describe("DETERMINISTIC_NATURAL_LANGUAGE_TOOL_ROUTING", () => {
    let savedApiKey: string | undefined;
    beforeAll(() => {
      savedApiKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
    });
    afterAll(() => {
      if (savedApiKey) {
        process.env.GEMINI_API_KEY = savedApiKey;
      }
    });

    test("Should select the correct volunteer dispatch tool using natural language (Deterministic Fallback Mock)", async () => {
      const token = createToken({ sub: "org1", role: "ORGANIZER", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "Queue density at Gate A is critically high. Dispatch an available volunteer to assist.",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.response).toContain("dispatch_volunteer_ticket");
      expect(json.response).toContain("GATE_A");
      expect(json.executionMode).toBe("deterministic");
    });

    test("Should block privileged natural language tool selection for ROLE_FAN (Fan Security Deterministic Mock)", async () => {
      const token = createToken({ sub: "fan1", role: "FAN", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "Queue density at Gate A is critically high. Dispatch an available volunteer to assist.",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.response).toContain("Security Refusal");
      expect(json.response).toContain("Unauthorized role");
      expect(json.executionMode).toBe("deterministic");
    });

    test("Should reject natural language tool calls with invalid args (Schema Rejection Deterministic Integration)", async () => {
      const token = createToken({ sub: "org1", role: "ORGANIZER", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "Dispatch a volunteer to assist but with invalid args and missing parameters.",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.response).toContain("Schema Validation Error");
      expect(json.schemaValidation).toBe("failed");
      expect(json.toolExecuted).toBe(false);
      expect(json.executionMode).toBe("deterministic");
    });

    test("Should handle application service failure cleanly (Service Failure Deterministic Failure Injection)", async () => {
      const token = createToken({ sub: "org1", role: "ORGANIZER", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "Dispatch a volunteer to fail service because of database timeout.",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.response).toContain("Application Service Error");
      expect(json.schemaValidation).toBe("passed");
      expect(json.toolExecuted).toBe(false);
      expect(json.executionMode).toBe("deterministic");
    });
  });

  describe("LIVE_GEMINI_TOOL_SELECTION", () => {
    const hasLiveCredentials = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "AIzaSyDCeKjVT-9EOOc_cXjQ_6zi5vTLrom2GqE";

    test("Should execute Live Gemini basic invocation when credentials exist", async (ctx) => {
      if (!hasLiveCredentials) {
        console.warn("LIVE GEMINI BASIC INVOCATION: BLOCKED — CREDENTIALS REQUIRED");
        ctx.skip();
        return;
      }

      const token = createToken({ sub: "org1", role: "ORGANIZER", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "What is the maximum slope permitted for ADA wheelchair ramps?",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.response).toBeDefined();
      expect(json.response.length).toBeGreaterThan(0);
      
      // Strict execution metadata assertions
      expect(json.aiProvider).toBe("gemini");
      expect(json.executionMode).toBe("live");
      expect(["deterministic", "fallback", "mock"]).not.toContain(json.executionMode);
      expect(json.modelId).toContain("gemini");
      
      console.log("-----------------------------------------");
      console.log("LIVE GEMINI BASIC INVOCATION VERIFIED");
      console.log(`Provider : ${json.aiProvider}`);
      console.log(`Mode     : ${json.executionMode}`);
      console.log(`Model    : ${json.modelId}`);
      console.log(`Latency  : ${json.latencyMs}ms`);
      console.log("-----------------------------------------");
    });

    test("Should execute Live Gemini tool selection E2E when credentials exist", async (ctx) => {
      if (!hasLiveCredentials) {
        console.warn("LIVE GEMINI TOOL SELECTION: BLOCKED — CREDENTIALS REQUIRED");
        ctx.skip();
        return;
      }

      const token = createToken({ sub: "org1", role: "ORGANIZER", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "Queue density at Gate A is critically high. Dispatch an available volunteer to assist.",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.response).toContain("dispatch_volunteer_ticket");
      expect(json.response).toContain("GATE_A");

      // Strict execution metadata assertions
      expect(json.aiProvider).toBe("gemini");
      expect(json.executionMode).toBe("live");
      expect(["deterministic", "fallback", "mock"]).not.toContain(json.executionMode);
      expect(json.modelId).toContain("gemini");
      expect(json.toolCall).toBeDefined();
      expect(json.toolCall!.name).toBe("dispatch_volunteer_ticket");
      expect(json.toolCall!.arguments.zoneId).toBe("GATE_A");
      expect(json.schemaValidation).toBe("passed");
      expect(json.authorization).toBe("allowed");
      expect(json.toolExecuted).toBe(true);

      console.log("-----------------------------------------");
      console.log("LIVE GEMINI TOOL SELECTION VERIFIED");
      console.log(`Provider : ${json.aiProvider}`);
      console.log(`Mode     : ${json.executionMode}`);
      console.log(`Model    : ${json.modelId}`);
      console.log(`Tool Name: ${json.toolCall!.name}`);
      console.log(`Latency  : ${json.latencyMs}ms`);
      console.log(`Response : ${json.response}`);
      console.log("-----------------------------------------");
    });

    test("Should execute Live Gemini Fan Security Scenario when credentials exist", async (ctx) => {
      if (!hasLiveCredentials) {
        ctx.skip();
        return;
      }

      const token = createToken({ sub: "fan1", role: "FAN", exp: Math.floor(Date.now() / 1000) + 3600 });
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/ai/route",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          queryText: "Queue density at Gate A is critically high. Dispatch an available volunteer to assist.",
        },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.response).toContain("Security Refusal");
      expect(json.response).toContain("Unauthorized role");

      // Strict execution metadata assertions
      expect(json.aiProvider).toBe("gemini");
      expect(json.executionMode).toBe("live");
      expect(["deterministic", "fallback", "mock"]).not.toContain(json.executionMode);
      expect(json.authorization).toBe("denied");
      expect(json.toolExecuted).toBe(false);
    });
  });
});
