import { createHash, randomBytes } from "node:crypto";
import {
  createEmailToken,
  consumeEmailToken,
  findUserById,
  markEmailVerified,
} from "./db";
import { sendVerificationEmail } from "./email";

const TOKEN_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function appBaseUrl(request: Request) {
  const configured = (process.env.APP_URL || "").replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export async function sendUserVerification(userId: string, baseUrl: string) {
  const found = findUserById(userId);
  if (!found) return { ok: false, error: "User tidak ditemukan." } as const;
  if (found.user.emailVerifiedAt) return { ok: true, alreadyVerified: true } as const;

  const token = randomBytes(32).toString("base64url");
  createEmailToken(hashToken(token), userId, Date.now() + TOKEN_MS);
  const url = `${baseUrl.replace(/\/+$/, "")}/verify?token=${encodeURIComponent(token)}`;
  const result = await sendVerificationEmail({
    to: found.user.email,
    name: found.user.name,
    url,
  });

  return result.ok
    ? ({ ok: true, alreadyVerified: false } as const)
    : ({ ok: false, error: result.error } as const);
}

export function verifyEmailToken(token: string) {
  if (!token || token.length > 200) return null;
  const userId = consumeEmailToken(hashToken(token));
  if (!userId) return null;
  return markEmailVerified(userId);
}
