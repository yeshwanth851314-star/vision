import { describe, test, expect, beforeAll } from "vitest";
import { buildApp } from "../src/app";
import type { FastifyInstance } from "fastify";

describe("Step 6 & 7: API Security Controls & Security Testing", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  describe("Security Headers (Helmet)", () => {
    test("Should include Strict-Transport-Security (HSTS)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });
      expect(response.headers["strict-transport-security"]).toBeDefined();
      expect(response.headers["strict-transport-security"]).toContain("max-age=31536000");
    });

    test("Should include Content-Security-Policy", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });
      expect(response.headers["content-security-policy"]).toBeDefined();
      expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
    });
    
    test("Should include X-Content-Type-Options to prevent MIME sniffing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
    });
  });

  describe("CORS Policies", () => {
    test("Should include Access-Control-Allow-Origin header for allowed origin", async () => {
      const response = await app.inject({
        method: "OPTIONS",
        url: "/health",
        headers: {
          "Origin": "http://localhost:3000",
          "Access-Control-Request-Method": "GET"
        }
      });
      expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });

    test("Should fail-fast in production if ALLOWED_ORIGINS is missing", async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevOrigins = process.env.ALLOWED_ORIGINS;

      process.env.NODE_ENV = "production";
      delete process.env.ALLOWED_ORIGINS;

      try {
        await buildApp();
        throw new Error("Should have thrown error on missing production ALLOWED_ORIGINS");
      } catch (err: any) {
        expect(err.message).toContain("CORS configuration error");
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevOrigins) process.env.ALLOWED_ORIGINS = prevOrigins;
      }
    });

    test("Should fail-fast in production if ALLOWED_ORIGINS is wildcard *", async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevOrigins = process.env.ALLOWED_ORIGINS;

      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "http://legit.com, *";

      try {
        await buildApp();
        throw new Error("Should have thrown error on wildcard production ALLOWED_ORIGINS");
      } catch (err: any) {
        expect(err.message).toContain("CORS configuration error");
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevOrigins) process.env.ALLOWED_ORIGINS = prevOrigins;
      }
    });
  });

  describe("Rate Limiting", () => {
    test("Should return 429 Too Many Requests when exceeding the rate limit", async () => {
      // Send 101 requests (max is 100)
      const requests = Array.from({ length: 105 }).map(() =>
        app.inject({
          method: "GET",
          url: "/health",
          remoteAddress: "192.168.1.100" // Use specific IP to avoid cross-test contamination
        })
      );
      
      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.statusCode === 429);
      
      expect(tooManyRequests.length).toBeGreaterThan(0);
      expect(tooManyRequests[0].json().error).toBe("Too Many Requests");
    });
  });
});
