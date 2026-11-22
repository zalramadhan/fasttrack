import { redirect } from "next/navigation";
import { appBaseUrl } from "@/lib/server/verification";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const supabase = await createSupabaseServerClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error("[auth/confirm]", error.message);
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error && !!data?.session;
    console.log("[auth/confirm] code exchange ok=", ok, "user=", data?.user?.email, "err=", error?.message);
    if (error) console.error("[auth/confirm]", error.message);
  }

  const target = new URL(ok ? "/" : "/login", appBaseUrl(req));
  console.log("[auth/confirm] redirect ->", target.toString());
  redirect(target.toString());
}
