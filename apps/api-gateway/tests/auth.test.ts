import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyVisionToken } from "../src/middleware/auth";
import crypto from "node:crypto";
import { requireRoles } from "../src/middleware/authMiddleware";

describe("Step 4 & 5: Authentication & Authorization Hardening", () => {
  const secret = "test-secret-key-1234567890";
  let originalEnv: string | undefined;
  
  beforeEach(() => {
    originalEnv = process.env.VISIONOS_JWT_SECRET;
    process.env.VISIONOS_JWT_SECRET = secret;
  });

  afterEach(() => {
    if (originalEnv) process.env.VISIONOS_JWT_SECRET = originalEnv;
    else delete process.env.VISIONOS_JWT_SECRET;
  });

  function createToken(payload: any, signKey: string = secret): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", signKey).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${signature}`;
  }

  describe("JWT Signature & Expiration Verification", () => {
    test("Should successfully verify a valid signed token", () => {
      const payload = { sub: "user1", role: "FAN", exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = createToken(payload);
      
      const claims = verifyVisionToken(`Bearer ${token}`);
      expect(claims).not.toBeNull();
      expect(claims?.role).toBe("ROLE_FAN");
      expect(claims?.sub).toBe("user1");
    });

    test("Should reject an expired token", () => {
      const payload = { sub: "user1", role: "FAN", exp: Math.floor(Date.now() / 1000) - 3600 };
      const token = createToken(payload);
      
      const claims = verifyVisionToken(`Bearer ${token}`);
      expect(claims).toBeNull();
    });

    test("Should reject a token with an invalid signature (tampering)", () => {
      const payload = { sub: "user1", role: "ORGANIZER", exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = createToken(payload, "wrong-secret-key");
      
      const claims = verifyVisionToken(`Bearer ${token}`);
      expect(claims).toBeNull();
    });
    
    test("Should reject a completely malformed token", () => {
      expect(verifyVisionToken("Bearer invalid.token")).toBeNull();
      expect(verifyVisionToken("malformed")).toBeNull();
      expect(verifyVisionToken("..")).toBeNull();
    });

    test("Should reject token with non-HS256 algorithm", () => {
      const payload = { sub: "user1", role: "FAN" };
      // create token with RS256 alg
      const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
      const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
      const token = `${header}.${body}.${signature}`;

      const claims = verifyVisionToken(`Bearer ${token}`);
      expect(claims).toBeNull();
    });

    test("Should reject token if active time is before nbf", () => {
      const payload = { sub: "user1", role: "FAN", nbf: Math.floor(Date.now() / 1000) + 3600 };
      const token = createToken(payload);

      const claims = verifyVisionToken(`Bearer ${token}`);
      expect(claims).toBeNull();
    });

    test("Should reject token if issuer does not match configuration (JWT_ISSUER_INVALID)", () => {
      const prevIssuer = process.env.VISIONOS_JWT_ISSUER;
      process.env.VISIONOS_JWT_ISSUER = "expected-issuer";
      try {
        const payload = { sub: "user1", role: "FAN", iss: "wrong-issuer", exp: Math.floor(Date.now() / 1000) + 3600 };
        const token = createToken(payload);
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).toBeNull();
      } finally {
        if (prevIssuer) process.env.VISIONOS_JWT_ISSUER = prevIssuer;
        else delete process.env.VISIONOS_JWT_ISSUER;
      }
    });

    test("Should reject token if issuer is missing but configured (JWT_ISSUER_MISSING)", () => {
      const prevIssuer = process.env.VISIONOS_JWT_ISSUER;
      process.env.VISIONOS_JWT_ISSUER = "expected-issuer";
      try {
        const payload = { sub: "user1", role: "FAN", exp: Math.floor(Date.now() / 1000) + 3600 };
        const token = createToken(payload);
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).toBeNull();
      } finally {
        if (prevIssuer) process.env.VISIONOS_JWT_ISSUER = prevIssuer;
        else delete process.env.VISIONOS_JWT_ISSUER;
      }
    });

    test("Should reject token if audience does not match configuration (JWT_AUDIENCE_STRING_INVALID)", () => {
      const prevAudience = process.env.VISIONOS_JWT_AUDIENCE;
      process.env.VISIONOS_JWT_AUDIENCE = "expected-audience";
      try {
        const payload = { sub: "user1", role: "FAN", aud: "wrong-audience", exp: Math.floor(Date.now() / 1000) + 3600 };
        const token = createToken(payload);
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).toBeNull();
      } finally {
        if (prevAudience) process.env.VISIONOS_JWT_AUDIENCE = prevAudience;
        else delete process.env.VISIONOS_JWT_AUDIENCE;
      }
    });

    test("Should reject token if audience is missing but configured (JWT_AUDIENCE_MISSING)", () => {
      const prevAudience = process.env.VISIONOS_JWT_AUDIENCE;
      process.env.VISIONOS_JWT_AUDIENCE = "expected-audience";
      try {
        const payload = { sub: "user1", role: "FAN", exp: Math.floor(Date.now() / 1000) + 3600 };
        const token = createToken(payload);
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).toBeNull();
      } finally {
        if (prevAudience) process.env.VISIONOS_JWT_AUDIENCE = prevAudience;
        else delete process.env.VISIONOS_JWT_AUDIENCE;
      }
    });

    test("Should accept token if issuer and audience are correct (JWT_ISSUER_VALID, JWT_AUDIENCE_STRING_VALID)", () => {
      const prevIssuer = process.env.VISIONOS_JWT_ISSUER;
      const prevAudience = process.env.VISIONOS_JWT_AUDIENCE;
      process.env.VISIONOS_JWT_ISSUER = "expected-issuer";
      process.env.VISIONOS_JWT_AUDIENCE = "expected-audience";
      try {
        const payload = { sub: "user1", role: "FAN", iss: "expected-issuer", aud: "expected-audience", exp: Math.floor(Date.now() / 1000) + 3600 };
        const token = createToken(payload);
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).not.toBeNull();
        expect(claims?.sub).toBe("user1");
      } finally {
        if (prevIssuer) process.env.VISIONOS_JWT_ISSUER = prevIssuer;
        else delete process.env.VISIONOS_JWT_ISSUER;
        if (prevAudience) process.env.VISIONOS_JWT_AUDIENCE = prevAudience;
        else delete process.env.VISIONOS_JWT_AUDIENCE;
      }
    });

    test("Should accept token if audience is an array containing the expected audience (JWT_AUDIENCE_ARRAY_VALID)", () => {
      const prevAudience = process.env.VISIONOS_JWT_AUDIENCE;
      process.env.VISIONOS_JWT_AUDIENCE = "expected-audience";
      try {
        const payload = { sub: "user1", role: "FAN", aud: ["wrong-audience", "expected-audience"], exp: Math.floor(Date.now() / 1000) + 3600 };
        const token = createToken(payload);
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).not.toBeNull();
        expect(claims?.sub).toBe("user1");
      } finally {
        if (prevAudience) process.env.VISIONOS_JWT_AUDIENCE = prevAudience;
        else delete process.env.VISIONOS_JWT_AUDIENCE;
      }
    });

    test("Should reject token if audience is an array without the expected audience (JWT_AUDIENCE_ARRAY_INVALID)", () => {
      const prevAudience = process.env.VISIONOS_JWT_AUDIENCE;
      process.env.VISIONOS_JWT_AUDIENCE = "expected-audience";
      try {
        const payload = { sub: "user1", role: "FAN", aud: ["wrong-audience-1", "wrong-audience-2"], exp: Math.floor(Date.now() / 1000) + 3600 };
        const token = createToken(payload);
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).toBeNull();
      } finally {
        if (prevAudience) process.env.VISIONOS_JWT_AUDIENCE = prevAudience;
        else delete process.env.VISIONOS_JWT_AUDIENCE;
      }
    });

    test("Should reject token if audience is malformed (JWT_AUDIENCE_MALFORMED)", () => {
      const prevAudience = process.env.VISIONOS_JWT_AUDIENCE;
      process.env.VISIONOS_JWT_AUDIENCE = "expected-audience";
      try {
        const payload = { sub: "user1", role: "FAN", aud: 12345, exp: Math.floor(Date.now() / 1000) + 3600 };
        const token = createToken(payload);
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).toBeNull();
      } finally {
        if (prevAudience) process.env.VISIONOS_JWT_AUDIENCE = prevAudience;
        else delete process.env.VISIONOS_JWT_AUDIENCE;
      }
    });

    test("Should reject token with invalid JSON segment (triggers catch block)", () => {
      // payload part is not a valid base64url encoded JSON
      const token = "header.invalid_base64_payload.signature";
      expect(verifyVisionToken(`Bearer ${token}`)).toBeNull();
    });

    test("Should reject verification in production if VISIONOS_JWT_SECRET is not configured", () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      delete process.env.VISIONOS_JWT_SECRET;

      try {
        const payload = { sub: "user1", role: "FAN" };
        const token = createToken(payload, ""); // sign with empty key as secret is not set
        const claims = verifyVisionToken(`Bearer ${token}`);
        expect(claims).toBeNull();
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.VISIONOS_JWT_SECRET = secret;
      }
    });
  });

  describe("RBAC Matrix Enforcement (requireRoles)", () => {
    test("Should allow access if user has the required role", async () => {
      const payload = { sub: "org1", role: "ORGANIZER", exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = createToken(payload);

      const request = { headers: { authorization: `Bearer ${token}` } } as any;
      const reply = { 
        status: vi.fn().mockReturnThis(), 
        send: vi.fn(), 
        sent: false 
      } as any;

      const middleware = requireRoles("ROLE_ORGANIZER");
      await middleware(request, reply);

      expect(reply.status).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
      expect(request.user).toBeDefined();
      expect(request.user.role).toBe("ROLE_ORGANIZER");
    });

    test("Should forbid access if user lacks the required role", async () => {
      const payload = { sub: "fan1", role: "FAN", exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = createToken(payload);

      const request = { headers: { authorization: `Bearer ${token}` } } as any;
      const reply = { 
        status: vi.fn().mockReturnThis(), 
        send: vi.fn(), 
        sent: false 
      } as any;
      
      // Simulate reply.send setting reply.sent = true (as Fastify does)
      reply.send.mockImplementation(() => { reply.sent = true; });

      const middleware = requireRoles("ROLE_ORGANIZER", "ROLE_VOLUNTEER");
      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith({ error: "Forbidden: insufficient role for this operation" });
    });

    test("Should return 401 if request has invalid/expired token (verifyJwtAuth failure)", async () => {
      const request = { headers: { authorization: "Bearer invalid.token.signature" } } as any;
      const reply = { 
        status: vi.fn().mockReturnThis(), 
        send: vi.fn(), 
        sent: false 
      } as any;

      reply.send.mockImplementation(() => { reply.sent = true; });

      const middleware = requireRoles("ROLE_ORGANIZER");
      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        error: "Unauthorized: Invalid, expired, or unverifiable bearer token"
      });
    });

    test("Should return 401 if request is missing authorization header", async () => {
      const request = { headers: {} } as any;
      const reply = { 
        status: vi.fn().mockReturnThis(), 
        send: vi.fn(), 
        sent: false 
      } as any;

      reply.send.mockImplementation(() => { reply.sent = true; });

      const middleware = requireRoles("ROLE_ORGANIZER");
      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        error: "Unauthorized: Missing or invalid Bearer token"
      });
    });
  });
});
