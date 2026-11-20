import { NextResponse } from "next/server";
import { createUserSession, verifyPassword } from "@/lib/server/auth";
import { clearRateLimit, findUserByEmail, rateLimitRetryAfter, recordRateLimit } from "@/lib/server/db";
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
      rateLimitRetryAfter(ipKey, LOGIN_IP_LIMIT),
      emailKey ? rateLimitRetryAfter(emailKey, LOGIN_EMAIL_LIMIT) : 0,
    );
    if (blocked) return tooManyRequests(blocked);

    const found = findUserByEmail(email);

    if (!found || !verifyPassword(password, found.row.password_hash)) {
      const retryAfter = Math.max(
        recordRateLimit(ipKey, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS),
        emailKey ? recordRateLimit(emailKey, LOGIN_EMAIL_LIMIT, LOGIN_WINDOW_MS) : 0,
      );
      if (retryAfter) return tooManyRequests(retryAfter);
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 },
      );
    }

    clearRateLimit(ipKey);
    if (emailKey) clearRateLimit(emailKey);

    if (found.row.status !== "active") {
      return NextResponse.json({ error: "Akun ini sedang dinonaktifkan." }, { status: 403 });
    }

    await createUserSession(found.user.id);
    return NextResponse.json({ user: found.user });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Gagal masuk." }, { status: 500 });
  }
}
