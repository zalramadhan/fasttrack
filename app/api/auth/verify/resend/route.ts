import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { consumeRateLimit } from "@/lib/server/db";
import {
  VERIFY_USER_LIMIT,
  VERIFY_WINDOW_MS,
  tooManyRequests,
} from "@/lib/server/rate-limit";
import { appBaseUrl, sendUserVerification } from "@/lib/server/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const retryAfter = consumeRateLimit(
    `verify:user:${user.id}`,
    VERIFY_USER_LIMIT,
    VERIFY_WINDOW_MS,
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  const result = await sendUserVerification(user.id, appBaseUrl(req));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
