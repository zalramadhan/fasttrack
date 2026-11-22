import { createAuthToken } from "./auth-tokens";
import { emailConfigured, sendVerificationEmail } from "./email";

export function appBaseUrl(request: Request) {
  const configured = (process.env.APP_URL || "").replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export async function sendUserVerification(input: {
  id: string;
  email: string;
  name: string;
  baseUrl: string;
}) {
  if (!emailConfigured()) {
    return { ok: false, error: "Email service is not configured yet." } as const;
  }

  try {
    const token = createAuthToken(input.id, "verify_email", 24 * 60 * 60 * 1000);
    const base = input.baseUrl.replace(/\/+$/, "");
    const url = `${base}/auth/verify?token=${encodeURIComponent(token)}`;
    return await sendVerificationEmail({ to: input.email, name: input.name, url });
  } catch (error) {
    console.error("[verification] send failed", error);
    return { ok: false, error: "Email could not be sent." } as const;
  }
}
