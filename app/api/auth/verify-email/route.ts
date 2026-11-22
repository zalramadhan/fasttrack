import { NextResponse } from "next/server";
import { consumeAuthToken } from "@/lib/server/auth-tokens";
import { consumeRateLimit, markEmailVerified } from "@/lib/server/db";
import {
  VERIFY_IP_LIMIT,
  VERIFY_WINDOW_MS,
  clientIp,
  tooManyRequests,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const retryAfter = await consumeRateLimit(
    `verify-email:ip:${clientIp(req)}`,
    VERIFY_IP_LIMIT,
    VERIFY_WINDOW_MS,
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  try {
    const body = (await req.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const userId = await consumeAuthToken(token, "verify_email");
    if (!userId) {
      return NextResponse.json(
        { error: "Link verifikasi tidak valid atau kedaluwarsa." },
        { status: 400 },
      );
    }
    await markEmailVerified(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[verify-email]", error);
    return NextResponse.json({ error: "Gagal memverifikasi email." }, { status: 500 });
  }
}
