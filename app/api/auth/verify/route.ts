import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/server/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const user = verifyEmailToken(token);
  const target = new URL(user ? "/verify" : "/verify", url.origin);
  target.searchParams.set("status", user ? "success" : "invalid");
  return NextResponse.redirect(target);
}
