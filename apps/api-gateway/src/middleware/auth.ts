import crypto from "node:crypto";

export type VisionRole = "ROLE_FAN" | "ROLE_VOLUNTEER" | "ROLE_ORGANIZER" | "ROLE_RESPONDER";

export interface VisionClaims {
  sub: string;
  role: VisionRole;
  sectorCode: string;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Verifies HS256 tokens when VISIONOS_JWT_SECRET is configured. The explicit
 * development fallback exists only outside production, so local demo clients
 * can use unsigned fixture tokens without weakening deployed environments.
 */
export function verifyVisionToken(rawToken: string): VisionClaims | null {
  const token = rawToken.replace(/^Bearer\s+/i, "");
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  if (!headerPart || !payloadPart || !signaturePart) return null;

  const header = decodeSegment(headerPart);
  if (!header || header.alg !== "HS256") return null;

  const payload = decodeSegment(payloadPart);
  if (!payload || typeof payload.sub !== "string") return null;

  const secret = process.env.VISIONOS_JWT_SECRET;
  if (secret) {
    const expected = crypto.createHmac("sha256", secret).update(`${headerPart}.${payloadPart}`).digest("base64url");
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(signaturePart);
    if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) return null;
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return null;
    if (typeof payload.nbf === "number" && payload.nbf * 1000 > Date.now()) return null;

    if (process.env.VISIONOS_JWT_ISSUER) {
      if (typeof payload.iss !== "string" || payload.iss !== process.env.VISIONOS_JWT_ISSUER) {
        return null;
      }
    }

    if (process.env.VISIONOS_JWT_AUDIENCE) {
      const aud = payload.aud;
      if (typeof aud === "string") {
        if (aud !== process.env.VISIONOS_JWT_AUDIENCE) return null;
      } else if (Array.isArray(aud)) {
        if (!aud.includes(process.env.VISIONOS_JWT_AUDIENCE)) return null;
      } else {
        return null;
      }
    }
  } else if (process.env.NODE_ENV === "production") {
    return null;
  }

  const roleMap: Record<string, VisionRole> = {
    COMMANDER: "ROLE_ORGANIZER",
    ORGANIZER: "ROLE_ORGANIZER",
    VOLUNTEER: "ROLE_VOLUNTEER",
    FAN: "ROLE_FAN",
    RESPONDER: "ROLE_RESPONDER",
  };
  const suppliedRole = typeof payload.role === "string" ? payload.role : "";
  const role = (suppliedRole in roleMap ? roleMap[suppliedRole] : suppliedRole) as VisionRole;
  if (!Object.values(roleMap).includes(role)) return null;
  return {
    sub: payload.sub,
    role,
    sectorCode: typeof payload.sectorCode === "string" ? payload.sectorCode : "SECTOR_112",
    exp: typeof payload.exp === "number" ? payload.exp : undefined,
    iss: typeof payload.iss === "string" ? payload.iss : undefined,
    aud: typeof payload.aud === "string" || Array.isArray(payload.aud) ? (payload.aud as string | string[]) : undefined,
  };
}

