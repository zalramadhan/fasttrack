import { NextResponse } from "next/server";
import { createAuthToken } from "@/lib/server/auth-tokens";
import { consumeRateLimit, findUserByEmail } from "@/lib/server/db";
import { sendPasswordResetEmail } from "@/lib/server/email";
import {
  FORGOT_EMAIL_LIMIT,
  FORGOT_IP_LIMIT,
  FORGOT_WINDOW_MS,
  clientIp,
  tooManyRequests,
} from "@/lib/server/rate-limit";
import { appBaseUrl } from "@/lib/server/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: unknown };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }

    const retryAfter = Math.max(
      await consumeRateLimit(`forgot:ip:${clientIp(req)}`, FORGOT_IP_LIMIT, FORGOT_WINDOW_MS),
      await consumeRateLimit(`forgot:email:${email}`, FORGOT_EMAIL_LIMIT, FORGOT_WINDOW_MS),
    );
    if (retryAfter) return tooManyRequests(retryAfter);

    const found = await findUserByEmail(email);
    if (found) {
      try {
        const token = createAuthToken(found.user.id, "password_reset", 60 * 60 * 1000);
        const base = appBaseUrl(req).replace(/\/+$/, "");
        const sent = await sendPasswordResetEmail({
          to: found.user.email,
          name: found.user.name,
          url: `${base}/auth/reset?token=${encodeURIComponent(token)}`,
        });
        if (!sent.ok) {
          console.error("[auth/forgot-password] email", sent.error);
        }
      } catch (error) {
        // Never reveal whether the address exists or whether delivery failed.
        console.error("[auth/forgot-password]", error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
}
