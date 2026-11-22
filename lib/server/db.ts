import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicUser, UserPlan, UserRole } from "@/lib/types";

function nowMs() {
  return Date.now();
}

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    role: (row.role as UserRole) ?? "user",
    plan: (row.plan as UserPlan) ?? "free",
    status: (row.status as "active" | "suspended") ?? "active",
    createdAt: Number(row.created_at ?? 0),
    activatedAt: row.activated_at != null ? Number(row.activated_at) : null,
    emailVerifiedAt: row.email_verified_at != null ? Number(row.email_verified_at) : null,
  };
}

export async function findUserByEmail(email: string) {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (!data) return null;
  return { row: data, user: toPublicUser(data as Record<string, unknown>) };
}

export async function findUserById(id: string) {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { row: data, user: toPublicUser(data as Record<string, unknown>) };
}

export async function createUser(input: {
  email: string;
  passwordHash?: string;
  name: string;
  whatsapp?: string;
  role: UserRole;
  googleSub?: string;
}) {
  // Profile creation is handled by trigger on auth.users; this helper is kept
  // for compatibility but should not be used directly in Supabase mode.
  const id = randomUUID();
  const now = nowMs();
  const { data, error } = await createAdminClient()
    .from("profiles")
    .insert({
      id,
      email: input.email,
      name: input.name,
      whatsapp: input.whatsapp ?? "",
      role: input.role,
      plan: "free",
      status: "active",
      created_at: now,
      email_verified_at: input.googleSub ? now : null,
    })
    .select()
    .single();
  if (error) throw error;
  return toPublicUser(data as Record<string, unknown>);
}

export async function findUserByGoogleSub(_sub: string) {
  // Supabase Auth manages google identity; profiles keyed by auth user id.
  return null;
}

export async function linkGoogleSub(_userId: string, _sub: string) {
  return null;
}

export async function markEmailVerified(userId: string) {
  const now = nowMs();
  await createAdminClient()
    .from("profiles")
    .update({ email_verified_at: now })
    .eq("id", userId);
  return (await findUserById(userId))?.user ?? null;
}

// Email token helpers (no-op in Supabase mode; verification handled by Supabase Auth).
export async function createEmailToken() {}
export async function consumeEmailToken() {
  return null;
}

// Session helpers are no-ops; Supabase Auth manages sessions.
export async function createSession() {}
export async function findSessionUser() {
  return null;
}
export async function deleteSession() {}

export async function getPendingOrder(userId: string) {
  const { data } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any;
}

export async function listOrdersByUser(userId: string) {
  const { data } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as any[];
}

export async function createOrder(userId: string, amount: number, code: string) {
  const now = nowMs();
  const { data } = await createAdminClient()
    .from("orders")
    .insert({ id: randomUUID(), code, user_id: userId, amount, status: "pending", created_at: now })
    .select()
    .single();
  return data as any;
}

export async function orderCodeExists(code: string) {
  const { data } = await createAdminClient()
    .from("orders")
    .select("code")
    .eq("code", code)
    .maybeSingle();
  return Boolean(data);
}

export async function listUsersWithPendingOrder() {
  const { data } = await createAdminClient().from("profiles").select("*").order("created_at", { ascending: false });
  return (data ?? []) as any[];
}

export async function activateLifetime(userId: string, adminId: string, note = "") {
  const now = nowMs();
  await createAdminClient().from("profiles").update({ plan: "lifetime", activated_at: now, activated_by: adminId }).eq("id", userId);
  await createAdminClient().from("orders").update({ status: "paid", note, confirmed_at: now, confirmed_by: adminId }).eq("user_id", userId).eq("status", "pending");
  return (await findUserById(userId))?.user ?? null;
}

export async function getUserForAdmin(id: string) {
  return (await findUserById(id))?.user ?? null;
}

export async function rateLimitRetryAfter(key: string, limit: number) {
  const { data } = await createAdminClient().from("rate_limits").select("count,reset_at").eq("key", key).maybeSingle();
  if (!data) return 0;
  const now = nowMs();
  if (data.reset_at <= now || data.count < limit) return 0;
  return Math.max(1, Math.ceil((data.reset_at - now) / 1000));
}

export async function recordRateLimit(key: string, limit: number, windowMs: number) {
  const now = nowMs();
  const { data: existing } = await createAdminClient().from("rate_limits").select("count,reset_at").eq("key", key).maybeSingle();
  if (!existing || existing.reset_at <= now) {
    await createAdminClient().from("rate_limits").upsert({ key, count: 1, reset_at: now + windowMs });
    return 0;
  }
  const count = existing.count + 1;
  await createAdminClient().from("rate_limits").update({ count }).eq("key", key);
  if (count <= limit) return 0;
  return Math.max(1, Math.ceil((existing.reset_at - now) / 1000));
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  // Prefer DB function if available.
  try {
    const { data, error } = await createAdminClient().rpc("consume_rate_limit", { p_key: key, p_limit: limit, p_window_ms: windowMs });
    if (!error && typeof data === "number") return data;
  } catch {
    // fall through
  }
  const blocked = await rateLimitRetryAfter(key, limit);
  if (blocked) return blocked;
  return recordRateLimit(key, limit, windowMs);
}

export async function clearRateLimit(key: string) {
  await createAdminClient().from("rate_limits").delete().eq("key", key);
}

export type ProjectRow = {
  user_id: string;
  data: string;
  created_at: number;
  updated_at: number;
};

export async function getProject(userId: string) {
  const { data } = await createAdminClient().from("projects").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return undefined;
  return { user_id: data.user_id, data: JSON.stringify(data.data), created_at: data.created_at, updated_at: data.updated_at } as ProjectRow;
}

export async function saveProject(userId: string, data: string) {
  const now = nowMs();
  const parsed = JSON.parse(data);
  await createAdminClient().from("projects").upsert({ user_id: userId, data: parsed, created_at: now, updated_at: now });
  return now;
}

export async function getSetting(key: string) {
  const { data } = await createAdminClient().from("settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

export async function setSetting(key: string, value: string, adminId: string) {
  const now = nowMs();
  await createAdminClient().from("settings").upsert({ key, value, updated_at: now, updated_by: adminId });
}

export async function logAdminAction(input: { adminId: string; action: string; targetId?: string; detail?: string }) {
  await createAdminClient().from("admin_audit").insert({
    id: randomUUID(),
    admin_id: input.adminId,
    action: input.action,
    target_id: input.targetId ?? "",
    detail: input.detail ?? "",
    created_at: nowMs(),
  });
}

export async function setUserStatus(userId: string, status: "active" | "suspended") {
  await createAdminClient().from("profiles").update({ status }).eq("id", userId);
  return (await findUserById(userId))?.user ?? null;
}

export async function cancelOrder(orderId: string, adminId: string, note = "") {
  const { data } = await createAdminClient()
    .from("orders")
    .update({ status: "cancelled", note, confirmed_at: nowMs(), confirmed_by: adminId })
    .eq("id", orderId)
    .eq("status", "pending")
    .select();
  return (data?.length ?? 0) > 0;
}

export async function getAdminStats() {
  const { data } = await createAdminClient().rpc("admin_stats");
  const stats = (data ?? {}) as Record<string, unknown>;
  return {
    users: Number(stats.users ?? 0),
    lifetime: Number(stats.lifetime ?? 0),
    free: Number(stats.free ?? 0),
    suspended: Number(stats.suspended ?? 0),
    unverified: Number(stats.unverified ?? 0),
    pendingOrders: Number(stats.pendingOrders ?? 0),
    paidOrders: Number(stats.paidOrders ?? 0),
    cancelledOrders: Number(stats.cancelledOrders ?? 0),
    revenue: Number(stats.revenue ?? 0),
    projects: Number(stats.projects ?? 0),
  };
}

export type AdminOrder = {
  id: string;
  code: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  note: string;
  createdAt: number;
  confirmedAt: number | null;
  userEmail: string;
  userName: string;
};

export async function listAdminOrders() {
  const { data } = await createAdminClient()
    .from("orders")
    .select("*, profiles!orders_user_id_fkey(email,name)")
    .order("created_at", { ascending: false })
    .limit(250);
  // Fallback: if join not available, fetch profiles separately.
  const orders = data ?? [];
  const result: AdminOrder[] = [];
  for (const o of orders) {
    const prof = (o as any).profiles ?? {};
    result.push({
      id: o.id,
      code: o.code,
      amount: o.amount,
      status: o.status,
      note: o.note,
      createdAt: o.created_at,
      confirmedAt: o.confirmed_at,
      userEmail: prof.email ?? "",
      userName: prof.name ?? "",
    });
  }
  return result;
}

export type AdminAudit = {
  id: string;
  action: string;
  targetId: string;
  detail: string;
  createdAt: number;
  adminEmail: string;
};

export async function listAdminAudit(limit = 20) {
  const { data } = await createAdminClient()
    .from("admin_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const result: AdminAudit[] = [];
  for (const a of rows) {
    const prof = await findUserById(String(a.admin_id));
    result.push({
      id: a.id,
      action: a.action,
      targetId: a.target_id,
      detail: a.detail,
      createdAt: a.created_at,
      adminEmail: prof?.user.email ?? "",
    });
  }
  return result;
}

export async function getAdminUsers() {
  const { data } = await createAdminClient().rpc("admin_users");
  const rows = (data ?? []) as any[];
  return rows.map((r) => ({
    ...r,
    pending_code: r.pending_code ?? null,
    pending_created_at: r.pending_created_at ?? null,
    project_updated_at: r.project_updated_at ?? null,
  }));
}

export function backupDatabase() {
  // No-op in Supabase mode.
}
