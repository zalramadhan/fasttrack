import { NextResponse } from "next/server";
import { adminEmails, createUserSession, hashPassword } from "@/lib/server/auth";
import { consumeRateLimit, createUser, findUserByEmail } from "@/lib/server/db";
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
  const retryAfter = consumeRateLimit(
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
      return NextResponse.json(
        { error: "Password minimal 8 karakter." },
        { status: 400 },
      );
    }
    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const user = createUser({
      email,
      passwordHash: hashPassword(password),
      name,
      whatsapp,
      role: adminEmails().includes(email) ? "admin" : "user",
    });

    const verification = await sendUserVerification(
      user.id,
      appBaseUrl(req),
    ).catch((error) => {
      console.error("[auth/register] verification email", error);
      return { ok: false as const, error: "Email could not be sent." };
    });

    await createUserSession(user.id);
    return NextResponse.json(
      {
        user: { ...user, emailVerifiedAt: null },
        verificationSent: verification.ok,
        emailConfigured: emailConfigured(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Gagal membuat akun." }, { status: 500 });
  }
}
