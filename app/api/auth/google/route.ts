import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/server/verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appBaseUrl(req)}/auth/confirm`,
    },
  });

  if (error || !data?.url) {
    console.error("[auth/google]", error?.message);
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.redirect(data.url);
}
