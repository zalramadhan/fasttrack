import { createHash, randomBytes } from "node:crypto";

export function appBaseUrl(request: Request) {
  const configured = (process.env.APP_URL || "").replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export async function sendUserVerification() {
  return { ok: true, alreadyVerified: true } as const;
}

export async function verifyEmailToken() {
  return null;
}
