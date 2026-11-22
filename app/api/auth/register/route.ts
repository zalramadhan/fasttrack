import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, findUserByEmail } from "@/lib/server/db";
import { adminEmails } from "@/lib/server/auth";
import { emailConfigured } from "@/lib/server/email";
import {
  REGISTER_IP_LIMIT,
  REGISTER_WINDOW_MS,
  clientIp,
  tooManyRequests,
} from "@/lib/server/rate-limit";
import { appBaseUrl } from "@/lib/server/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const retryAfter = await consumeRateLimit(
    `register:ip:${clientIp(req)}`,
    REGISTER_IP_LIMIT,
    REGISTER_WINDOW_MS,
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim().slice(0, 80);
    const whatsapp = String(body.whatsapp ?? "").trim().slice(0, 40);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 200) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }
    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const supabase = await createSupabaseServerClient();
    const role = adminEmails().includes(email) ? "admin" : "user";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, whatsapp, role },
        emailRedirectTo: `${appBaseUrl(req)}/auth/confirm`,
      },
    });
    if (error || !data.user) {
      console.error("[auth/register]", error?.message);
      return NextResponse.json({ error: "Gagal membuat akun." }, { status: 500 });
    }

    // Ensure profile exists (trigger should create it).
    const admin = createAdminClient();
    // Wait a moment? Trigger synchronous. Fetch.
    let profile = null;
    for (let i = 0; i < 5; i++) {
      const { data: p } = await admin.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (p) { profile = p; break; }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!profile) {
      // Insert manually as fallback.
      await admin.from("profiles").insert({
        id: data.user.id,
        email,
        name,
        whatsapp,
        role,
        plan: "free",
        status: "active",
        created_at: Date.now(),
        email_verified_at: null,
      });
      const { data: p2 } = await admin.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      profile = p2;
    }

    return NextResponse.json(
      {
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
        verificationSent: emailConfigured(),
        emailConfigured: emailConfigured(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Gagal membuat akun." }, { status: 500 });
  }
}
