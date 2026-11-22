import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeAuthToken } from "@/lib/server/auth-tokens";
import { consumeRateLimit } from "@/lib/server/db";
import {
  RESET_IP_LIMIT,
  RESET_WINDOW_MS,
  clientIp,
  tooManyRequests,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const retryAfter = await consumeRateLimit(
    `reset-password:ip:${clientIp(req)}`,
    RESET_IP_LIMIT,
    RESET_WINDOW_MS,
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  try {
    const body = (await req.json()) as { token?: unknown; password?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const password = String(body.password ?? "");

    if (password.length < 8 || password.length > 200) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter." },
        { status: 400 },
      );
    }

    const userId = await consumeAuthToken(token, "password_reset");
    if (!userId) {
      return NextResponse.json(
        { error: "Link reset tidak valid atau sudah kedaluwarsa." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) {
      console.error("[auth/reset-password]", error.message);
      return NextResponse.json(
        { error: "Gagal mengubah password. Minta link reset baru." },
        { status: 500 },
      );
    }

    // Opening the reset link proves control of the address.
    await admin
      .from("profiles")
      .update({ email_verified_at: Date.now() })
      .eq("id", userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return NextResponse.json({ error: "Gagal mengubah password." }, { status: 500 });
  }
}
