import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/server/db";
import {
  VERIFY_USER_LIMIT,
  VERIFY_WINDOW_MS,
  tooManyRequests,
} from "@/lib/server/rate-limit";

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

  const retryAfter = await consumeRateLimit(
    `verify:user:${user.id}`,
    VERIFY_USER_LIMIT,
    VERIFY_WINDOW_MS,
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[verify/resend]", error);
    return NextResponse.json({ error: "Gagal mengirim email verifikasi." }, { status: 503 });
  }
}
