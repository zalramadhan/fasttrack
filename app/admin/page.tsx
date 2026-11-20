import { redirect } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import { getCurrentUser } from "@/lib/server/auth";
import { listBackups } from "@/lib/server/backup";
import {
  getAdminStats,
  getAdminUsers,
  getSetting,
  listAdminAudit,
  listAdminOrders,
} from "@/lib/server/db";
import { emailConfigured } from "@/lib/server/email";
import { storageUsage } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const users = getAdminUsers().map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    whatsapp: row.whatsapp,
    role: row.role,
    plan: row.plan,
    status: row.status,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    emailVerifiedAt: row.email_verified_at,
    pendingCode: row.pending_code,
    pendingSince: row.pending_created_at,
    projectUpdatedAt: row.project_updated_at,
  }));
  const storage = await storageUsage();
  const orders = listAdminOrders().map((row) => ({ ...row }));
  const audit = listAdminAudit(20).map((row) => ({ ...row }));

  return (
    <AdminPanel
      user={user}
      users={users}
      orders={orders}
      audit={audit}
      stats={{ ...getAdminStats() }}
      backups={listBackups().map((row) => ({ ...row }))}
      storage={storage}
      shopeeUrl={getSetting("shopee_url") ?? ""}
      emailConfigured={emailConfigured()}
    />
  );
}
