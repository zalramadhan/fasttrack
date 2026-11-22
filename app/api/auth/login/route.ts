import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearRateLimit, rateLimitRetryAfter, recordRateLimit } from "@/lib/server/db";
import {
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  LOGIN_WINDOW_MS,
  clientIp,
  tooManyRequests,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const ipKey = `login:ip:${clientIp(req)}`;
    const emailKey = email ? `login:email:${email}` : null;
    const blocked = Math.max(
      await rateLimitRetryAfter(ipKey, LOGIN_IP_LIMIT),
      emailKey ? await rateLimitRetryAfter(emailKey, LOGIN_EMAIL_LIMIT) : 0,
    );
    if (blocked) return tooManyRequests(blocked);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      const retryAfter = Math.max(
        await recordRateLimit(ipKey, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS),
        emailKey ? await recordRateLimit(emailKey, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS) : 0,
      );
      if (retryAfter) return tooManyRequests(retryAfter);
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    await clearRateLimit(ipKey);
    if (emailKey) await clearRateLimit(emailKey);

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    if (!profile || profile.status !== "active") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Akun ini sedang dinonaktifkan." }, { status: 403 });
    }

    // sync email verification
    if (data.user.email_confirmed_at && !profile.email_verified_at) {
      await admin.from("profiles").update({ email_verified_at: Date.now() }).eq("id", data.user.id);
      profile.email_verified_at = Date.now();
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        whatsapp: profile.whatsapp,
        role: profile.role,
        plan: profile.plan,
        status: profile.status,
        createdAt: profile.created_at,
        activatedAt: profile.activated_at,
        emailVerifiedAt: profile.email_verified_at,
      },
    });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Gagal masuk." }, { status: 500 });
  }
}
