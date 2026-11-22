import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicUser, UserRole } from "@/lib/types";

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    role: (row.role as UserRole) ?? "user",
    plan: (row.plan as "free" | "lifetime") ?? "free",
    status: (row.status as "active" | "suspended") ?? "active",
    createdAt: Number(row.created_at ?? 0),
    activatedAt: row.activated_at != null ? Number(row.activated_at) : null,
    emailVerifiedAt: row.email_verified_at != null ? Number(row.email_verified_at) : null,
  };
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser) return null;
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (!profile) return null;
    if (profile.status !== "active") return null;

    // Role in profiles is only trusted when the admin-only app_metadata agrees.
    // user_metadata is client-controlled and must never grant admin.
    const isAdmin =
      profile.role === "admin" && authUser.app_metadata?.role === "admin";
    if (profile.role === "admin" && !isAdmin) {
      await admin.from("profiles").update({ role: "user" }).eq("id", authUser.id);
      profile.role = "user";
    }

    // OAuth providers verify the email themselves. Email/password accounts use
    // the signed verification link so Supabase's disabled confirmation setting
    // cannot silently mark the address as owned.
    const provider = String(authUser.app_metadata?.provider ?? "");
    if (provider !== "email" && authUser.email_confirmed_at && !profile.email_verified_at) {
      await admin
        .from("profiles")
        .update({ email_verified_at: Date.now() })
        .eq("id", authUser.id);
      profile.email_verified_at = Date.now();
    }
    return toPublicUser(profile as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function destroyCurrentSession() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}
