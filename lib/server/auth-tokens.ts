import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { consumeRateLimit } from "./db";

export type AuthTokenPurpose = "verify_email" | "password_reset";

type TokenPayload = {
  v: 1;
  sub: string;
  purpose: AuthTokenPurpose;
  exp: number;
  jti: string;
};

function secret() {
  const value = process.env.AUTH_TOKEN_SECRET || "";
  if (value.length < 32) {
    throw new Error("AUTH_TOKEN_SECRET is not configured.");
  }
  return value;
}

function sign(encoded: string) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

function jtiKey(jti: string) {
  return createHash("sha256").update(jti).digest("hex");
}

export function createAuthToken(
  userId: string,
  purpose: AuthTokenPurpose,
  ttlMs: number,
) {
  const payload: TokenPayload = {
    v: 1,
    sub: userId,
    purpose,
    exp: Date.now() + Math.max(60_000, ttlMs),
    jti: randomBytes(24).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAuthToken(token: string, purpose: AuthTokenPurpose) {
  if (!token || token.length > 2048) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  let expected: string;
  try {
    expected = sign(encoded);
  } catch {
    return null;
  }

  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length || !timingSafeEqual(received, wanted)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<TokenPayload>;
    if (payload.v !== 1 || payload.purpose !== purpose) return null;
    if (typeof payload.sub !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.sub)) {
      return null;
    }
    if (typeof payload.jti !== "string" || payload.jti.length < 16) return null;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    return { userId: payload.sub, jti: payload.jti, exp: payload.exp };
  } catch {
    return null;
  }
}

/**
 * Consumes a signed token exactly once. The rate-limit table is used as the
 * single-use marker so this works without an extra migration.
 */
export async function consumeAuthToken(token: string, purpose: AuthTokenPurpose) {
  const payload = verifyAuthToken(token, purpose);
  if (!payload) return null;

  const ttl = Math.max(1_000, payload.exp - Date.now());
  const retryAfter = await consumeRateLimit(
    `auth-token:${purpose}:${jtiKey(payload.jti)}`,
    1,
    ttl,
  );
  if (retryAfter) return null;
  return payload.userId;
}
