import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, findUserByEmail } from "@/lib/server/db";
import { emailConfigured } from "@/lib/server/email";
import {
  REGISTER_IP_LIMIT,
  REGISTER_WINDOW_MS,
  clientIp,
  tooManyRequests,
} from "@/lib/server/rate-limit";
import { appBaseUrl, sendUserVerification } from "@/lib/server/verification";

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
    const admin = createAdminClient();
    // Never grant admin from public registration. Promote an existing,
    // verified account with `npm run promote:admin -- <email>` instead.
    const role = "user" as const;

    // Use the admin API so Supabase does not send its own confirmation email.
    // The account is created confirmed, but our profile stays unverified until
    // the signed Resend link is opened.
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, whatsapp, role },
    });
    if (error || !created.user) {
      const already =
        error?.code === "email_exists" || /already/i.test(error?.message ?? "");
      console.error("[auth/register]", error?.message);
      return NextResponse.json(
        { error: already ? "Email sudah terdaftar." : "Gagal membuat akun." },
        { status: already ? 409 : 500 },
      );
    }

    // Ensure profile exists (trigger should create it).
    let profile = null;
    for (let i = 0; i < 5; i++) {
      const { data: p } = await admin.from("profiles").select("*").eq("id", created.user.id).maybeSingle();
      if (p) { profile = p; break; }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!profile) {
      // Insert manually as fallback.
      await admin.from("profiles").insert({
        id: created.user.id,
        email,
        name,
        whatsapp,
        role,
        plan: "free",
        status: "active",
        created_at: Date.now(),
        email_verified_at: null,
      });
    }

    const { data: updatedProfile, error: profileError } = await admin
      .from("profiles")
      .update({ name, whatsapp, role, email_verified_at: null })
      .eq("id", created.user.id)
      .select("*")
      .single();
    if (profileError || !updatedProfile) {
      console.error("[auth/register] profile", profileError?.message);
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return NextResponse.json({ error: "Gagal membuat profil." }, { status: 500 });
    }
    profile = updatedProfile;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      console.error("[auth/register] sign-in", signInError.message);
    }

    let verificationSent = false;
    const sent = await sendUserVerification({
      id: created.user.id,
      email,
      name,
      baseUrl: appBaseUrl(req),
    });
    verificationSent = sent.ok;
    if (!sent.ok) {
      console.error("[auth/register] verification email", sent.error);
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
        verificationSent,
        emailConfigured: emailConfigured(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Gagal membuat akun." }, { status: 500 });
  }
}
