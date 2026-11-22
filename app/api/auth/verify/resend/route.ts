import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { consumeRateLimit } from "@/lib/server/db";
import {
  VERIFY_IP_LIMIT,
  VERIFY_USER_LIMIT,
  VERIFY_WINDOW_MS,
  clientIp,
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

  const retryAfter = Math.max(
    await consumeRateLimit(`verify:user:${user.id}`, VERIFY_USER_LIMIT, VERIFY_WINDOW_MS),
    await consumeRateLimit(`verify:ip:${clientIp(req)}`, VERIFY_IP_LIMIT, VERIFY_WINDOW_MS),
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  try {
    const sent = await sendUserVerification({
      id: user.id,
      email: user.email,
      name: user.name,
      baseUrl: appBaseUrl(req),
    });
    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error },
        { status: sent.error.includes("not configured") ? 503 : 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[verify/resend]", error);
    return NextResponse.json({ error: "Gagal mengirim email verifikasi." }, { status: 500 });
  }
}
