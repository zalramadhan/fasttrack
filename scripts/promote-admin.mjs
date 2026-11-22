import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error("Usage: npm run promote:admin -- <email> (or set ADMIN_EMAIL)");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("id,email,role")
  .eq("email", email)
  .maybeSingle();

if (profileError) {
  console.error("Failed to read profile:", profileError.message);
  process.exit(1);
}
if (!profile) {
  console.error(`No profile found for ${email}. Register the account first.`);
  process.exit(1);
}

const { data: authUser, error: authError } = await admin.auth.admin.getUserById(profile.id);
if (authError || !authUser.user) {
  console.error("Failed to read auth user:", authError?.message ?? "not found");
  process.exit(1);
}

// app_metadata is admin-only. The app requires it before trusting profiles.role.
const appMetadata = { ...(authUser.user.app_metadata ?? {}), role: "admin" };
const { error: authUpdateError } = await admin.auth.admin.updateUserById(profile.id, {
  app_metadata: appMetadata,
});
if (authUpdateError) {
  console.error("Failed to update app_metadata:", authUpdateError.message);
  process.exit(1);
}

const { error: profileUpdateError } = await admin
  .from("profiles")
  .update({ role: "admin" })
  .eq("id", profile.id);
if (profileUpdateError) {
  console.error("Failed to update profile:", profileUpdateError.message);
  process.exit(1);
}

console.log(`Promoted ${profile.email} to admin.`);
