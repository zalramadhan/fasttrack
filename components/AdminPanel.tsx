"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { PublicUser, UserPlan, UserRole } from "@/lib/types";
import { useI18n, type MessageKey } from "@/lib/i18n";
import AccountMenu from "./AccountMenu";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import { Wordmark } from "./Logo";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  role: UserRole;
  plan: UserPlan;
  status: "active" | "suspended";
  createdAt: number;
  activatedAt: number | null;
  emailVerifiedAt: number | null;
  pendingCode: string | null;
  pendingSince: number | null;
  projectUpdatedAt: number | null;
};

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

export type AdminAudit = {
  id: string;
  action: string;
  targetId: string;
  detail: string;
  createdAt: number;
  adminEmail: string;
};

type Stats = {
  users: number;
  lifetime: number;
  free: number;
  suspended: number;
  unverified: number;
  pendingOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  revenue: number;
  projects: number;
};

type Backup = { name: string; size: number; modified: number };

export default function AdminPanel({
  user,
  users,
  orders,
  audit,
  stats,
  backups,
  storage,
  shopeeUrl,
  emailConfigured,
}: {
  user: PublicUser;
  users: AdminUser[];
  orders: AdminOrder[];
  audit: AdminAudit[];
  stats: Stats;
  backups: Backup[];
  storage: {
    uploadsBytes: number;
    uploadsFiles: number;
    exportsBytes: number;
    exportsFiles: number;
    totalBytes: number;
  };
  shopeeUrl: string;
  emailConfigured: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "users" | "orders" | "settings">(
    "overview",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "free" | "lifetime" | "unverified">("all");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "paid" | "cancelled">("all");
  const [shopeeDraft, setShopeeDraft] = useState(shopeeUrl);
  const [savedShopee, setSavedShopee] = useState(shopeeUrl);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((item) => {
      if (
        userFilter === "free" && item.plan !== "free" ||
        userFilter === "lifetime" && item.plan !== "lifetime" ||
        userFilter === "unverified" && item.emailVerifiedAt
      ) {
        return false;
      }
      if (!needle) return true;
      return (
        item.email.toLowerCase().includes(needle) ||
        item.name.toLowerCase().includes(needle) ||
        item.whatsapp.includes(needle)
      );
    });
  }, [query, userFilter, users]);

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (item) => orderFilter === "all" || item.status === orderFilter,
      ),
    [orderFilter, orders],
  );

  function flash(text: string) {
    setNotice(text);
    setError(null);
    window.setTimeout(() => setNotice(null), 2500);
  }

  async function request(
    key: string,
    url: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    message: string,
  ) {
    if (busy) return false;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("common.genericError"));
        return false;
      }
      flash(message);
      router.refresh();
      return true;
    } catch {
      setError(t("common.genericError"));
      return false;
    } finally {
      setBusy(null);
    }
  }

  function activate(id: string) {
    return request(
      `activate:${id}`,
      "/api/admin/activate",
      "POST",
      { userId: id, note: notes[id] ?? "" },
      t("admin.noticeActivated"),
    );
  }

  async function setStatus(item: AdminUser, status: "active" | "suspended") {
    if (
      status === "suspended" &&
      !window.confirm(t("admin.confirmSuspend", { email: item.email }))
    ) {
      return;
    }
    await request(
      `status:${item.id}`,
      "/api/admin/users",
      "PATCH",
      { userId: item.id, status },
      status === "suspended" ? t("admin.noticeSuspended") : t("admin.noticeReactivated"),
    );
  }

  function verifyEmail(item: AdminUser) {
    return request(
      `verify:${item.id}`,
      "/api/admin/users",
      "PATCH",
      { userId: item.id, verifyEmail: true },
      t("admin.noticeVerified"),
    );
  }

  function cancelOrder(item: AdminOrder) {
    if (!window.confirm(t("admin.confirmCancelOrder", { code: item.code }))) return;
    void request(
      `order:${item.id}`,
      "/api/admin/orders",
      "PATCH",
      { orderId: item.id, status: "cancelled" },
      t("admin.noticeCancelled"),
    );
  }

  async function saveShopee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await request(
      "settings",
      "/api/admin/settings",
      "PATCH",
      { shopeeUrl: shopeeDraft },
      t("admin.noticeSettings"),
    );
    if (ok) setSavedShopee(shopeeDraft.trim());
  }

  const tabs = [
    { id: "overview" as const, label: t("admin.tabOverview") },
    { id: "users" as const, label: t("admin.tabUsers") },
    { id: "orders" as const, label: t("admin.tabOrders") },
    { id: "settings" as const, label: t("admin.tabSettings") },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2.5">
            <Wordmark
              markClassName="h-7 w-7 text-accent"
              textClassName="text-[20px] text-ink"
            />
            <span className="chip">{t("admin.role")}</span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">admin</p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-ink">
              {t("admin.title")}
            </h1>
            <p className="mt-1 text-[12.5px] text-muted">{t("admin.subtitle")}</p>
          </div>
          <a href="/" className="btn">
            {t("admin.back")}
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label={t("admin.statUsers")} value={stats.users} />
          <Stat label={t("admin.statLifetime")} value={stats.lifetime} />
          <Stat label={t("admin.statPending")} value={stats.pendingOrders} />
          <Stat label={t("admin.statPaid")} value={stats.paidOrders} />
          <Stat
            label={t("admin.statRevenue")}
            value={formatRupiah(stats.revenue)}
            compact
          />
          <Stat label={t("admin.statProjects")} value={stats.projects} />
        </div>

        <nav className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`focus-ring min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition ${
                tab === item.id
                  ? "bg-ink text-on-ink"
                  : "text-muted hover:bg-ink/[0.03] hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {error && <p className="alert mt-4">{error}</p>}
        {notice && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] px-2.5 py-2 text-[11.5px] text-emerald-700 dark:text-emerald-300">
            {notice}
          </p>
        )}

        {tab === "overview" && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <section className="card p-4">
                <p className="card-title">{t("admin.backups")}</p>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[24px] font-semibold tabular-nums text-ink">
                      {backups.length}
                    </p>
                    <p className="text-[11px] text-muted">{t("admin.backupCount")}</p>
                  </div>
                  <div className="text-right text-[11px] text-muted">
                    <p>{formatBytes(backups.reduce((sum, item) => sum + item.size, 0))}</p>
                    <p>{t("admin.totalSize")}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-line bg-paper/60 px-2.5 py-2">
                  {backups[0] ? (
                    <>
                      <p className="truncate font-mono text-[10.5px] text-ink">
                        {backups[0].name}
                      </p>
                      <p className="mt-1 text-[10.5px] text-muted">
                        {new Date(backups[0].modified).toLocaleString("id-ID")} ·{" "}
                        {formatBytes(backups[0].size)}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted">{t("admin.noBackups")}</p>
                  )}
                </div>
              </section>

              <section className="card p-4">
                <p className="card-title">{t("admin.storage")}</p>
                <p className="mt-3 text-[24px] font-semibold tabular-nums text-ink">
                  {formatBytes(storage.totalBytes)}
                </p>
                <dl className="mt-2 space-y-1.5 text-[11px] text-muted">
                  <Row
                    label={t("admin.uploads")}
                    value={`${formatBytes(storage.uploadsBytes)} · ${storage.uploadsFiles} file`}
                  />
                  <Row
                    label={t("admin.exports")}
                    value={`${formatBytes(storage.exportsBytes)} · ${storage.exportsFiles} file`}
                  />
                  <Row label={t("admin.emailService")} value={emailConfigured ? t("admin.configured") : t("admin.notConfigured")} />
                </dl>
              </section>
            </div>

            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <p className="card-title">{t("admin.recentOrders")}</p>
                <button
                  type="button"
                  onClick={() => setTab("orders")}
                  className="text-[11px] font-medium text-muted hover:text-ink"
                >
                  {t("admin.viewAll")} →
                </button>
              </div>
              <OrderTable
                orders={orders.slice(0, 6)}
                busy={busy}
                onCancel={cancelOrder}
                empty={t("admin.noOrders")}
                t={t}
              />
            </section>

            <section className="card p-4">
              <p className="card-title">{t("admin.audit")}</p>
              <div className="mt-3 space-y-2">
                {audit.length === 0 && (
                  <p className="text-[11px] text-muted">{t("admin.noAudit")}</p>
                )}
                {audit.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium text-ink">
                        {item.action}
                        {item.detail ? ` · ${item.detail}` : ""}
                      </p>
                      <p className="truncate text-[10px] text-muted">
                        {item.adminEmail || "admin"}
                        {item.targetId ? ` · ${item.targetId.slice(0, 8)}` : ""}
                      </p>
                    </div>
                    <p className="text-[10px] tabular-nums text-muted">
                      {new Date(item.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "users" && (
          <div className="mt-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("admin.searchUsers")}
                className="input flex-1"
              />
              <select
                value={userFilter}
                onChange={(event) =>
                  setUserFilter(event.target.value as typeof userFilter)
                }
                className="input sm:w-44"
                aria-label={t("admin.filterUsers")}
              >
                <option value="all">{t("admin.allUsers")}</option>
                <option value="free">{t("account.free")}</option>
                <option value="lifetime">{t("account.lifetime")}</option>
                <option value="unverified">{t("admin.unverified")}</option>
              </select>
            </div>

            <p className="mt-2 text-[10.5px] text-muted">
              {t("admin.showing", {
                count: filteredUsers.length,
                total: users.length,
              })}
            </p>

            <div className="mt-2 space-y-2">
              {filteredUsers.length === 0 && (
                <p className="rounded-xl border border-line bg-surface p-4 text-[12px] text-muted">
                  {t("admin.noUsers")}
                </p>
              )}
              {filteredUsers.map((item) => {
                const paid = item.plan === "lifetime";
                const suspended = item.status === "suspended";
                return (
                  <section key={item.id} className="card p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {item.name || item.email}
                        </p>
                        <p className="truncate text-[11px] text-muted">{item.email}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`chip ${
                              paid
                                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                : ""
                            }`}
                          >
                            {t(paid ? "account.lifetime" : "account.free")}
                          </span>
                          {item.role === "admin" && (
                            <span className="chip">{t("admin.role")}</span>
                          )}
                          {suspended && (
                            <span className="chip border-red-500/30 text-red-600 dark:text-red-400">
                              {t("admin.suspended")}
                            </span>
                          )}
                          <span
                            className={`chip ${
                              item.emailVerifiedAt
                                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                : "border-amber-500/30 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {item.emailVerifiedAt
                              ? t("admin.verified")
                              : t("admin.unverified")}
                          </span>
                          {item.pendingCode && (
                            <span className="chip font-mono">{item.pendingCode}</span>
                          )}
                          {item.projectUpdatedAt && (
                            <span className="chip">{t("admin.hasProject")}</span>
                          )}
                          {item.whatsapp && (
                            <a
                              href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="chip hover:text-ink"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] tabular-nums text-muted">
                        {new Date(item.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>

                    {!paid && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={notes[item.id] ?? ""}
                          onChange={(event) =>
                            setNotes((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder={t("admin.note")}
                          className="input flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => void activate(item.id)}
                          disabled={busy === `activate:${item.id}`}
                          className="btn btn-primary shrink-0"
                        >
                          {busy === `activate:${item.id}`
                            ? t("admin.activating")
                            : t("admin.activate")}
                        </button>
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {!item.emailVerifiedAt && (
                        <button
                          type="button"
                          onClick={() => void verifyEmail(item)}
                          disabled={busy === `verify:${item.id}`}
                          className="btn"
                        >
                          {t("admin.markVerified")}
                        </button>
                      )}
                      {item.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() =>
                            void setStatus(item, suspended ? "active" : "suspended")
                          }
                          disabled={busy === `status:${item.id}`}
                          className={`btn ${suspended ? "" : "text-red-600 dark:text-red-400"}`}
                        >
                          {suspended
                            ? t("admin.reactivate")
                            : t("admin.suspend")}
                        </button>
                      )}
                      {paid && item.activatedAt && (
                        <span className="text-[10px] text-muted">
                          {t("admin.activated")} ·{" "}
                          {new Date(item.activatedAt).toLocaleDateString("id-ID")}
                        </span>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", t("admin.allOrders")],
                  ["pending", t("orders.pending")],
                  ["paid", t("orders.paid")],
                  ["cancelled", t("orders.cancelled")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOrderFilter(value)}
                  className={`focus-ring rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                    orderFilter === value
                      ? "border-ink bg-ink text-on-ink"
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <section className="card mt-2 overflow-hidden">
              <OrderTable
                orders={filteredOrders}
                busy={busy}
                onCancel={cancelOrder}
                empty={t("admin.noOrders")}
                t={t}
              />
            </section>
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <form onSubmit={saveShopee} className="card p-4">
              <p className="card-title">{t("admin.shopeeTitle")}</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                {t("admin.shopeeHint")}
              </p>
              <label className="mt-3 block space-y-1.5">
                <span className="label">{t("admin.shopeeUrl")}</span>
                <input
                  value={shopeeDraft}
                  onChange={(event) => setShopeeDraft(event.target.value)}
                  placeholder="https://s.shopee.co.id/..."
                  className="input"
                  type="url"
                />
              </label>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={busy === "settings"}
                  className="btn btn-primary"
                >
                  {busy === "settings" ? t("admin.saving") : t("admin.save")}
                </button>
                {savedShopee && (
                  <a
                    href={savedShopee}
                    target="_blank"
                    rel="sponsored noreferrer"
                    className="text-[11px] font-medium text-muted underline decoration-line underline-offset-4 hover:text-ink"
                  >
                    {t("admin.testLink")}
                  </a>
                )}
              </div>
              {!savedShopee && (
                <p className="mt-2 text-[10.5px] text-muted">
                  {t("admin.adHidden")}
                </p>
              )}
            </form>

            <section className="card p-4">
              <p className="card-title">{t("admin.emailTitle")}</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                {t("admin.emailHint")}
              </p>
              <div className="mt-3 rounded-lg border border-line bg-paper/60 px-3 py-2 text-[11px] text-muted">
                <p className="font-medium text-ink">
                  {emailConfigured
                    ? t("admin.emailReady")
                    : t("admin.emailMissing")}
                </p>
                <p className="mt-1 font-mono text-[10px]">
                  RESEND_API_KEY · EMAIL_FROM · APP_URL
                </p>
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
                {t("admin.emailFallback")}
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="card p-3">
      <p className="label">{label}</p>
      <p
        className={`mt-1 font-semibold tabular-nums text-ink ${
          compact ? "text-[16px]" : "text-[24px]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-right font-mono text-[10.5px] text-ink">{value}</dd>
    </div>
  );
}

function OrderTable({
  orders,
  busy,
  onCancel,
  empty,
  t,
}: {
  orders: AdminOrder[];
  busy: string | null;
  onCancel: (item: AdminOrder) => void;
  empty: string;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}) {
  if (orders.length === 0) {
    return <p className="p-4 text-[11.5px] text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[9.5px] uppercase tracking-[0.12em] text-muted">
            <th className="px-4 py-2 font-medium">{t("admin.orderCode")}</th>
            <th className="px-4 py-2 font-medium">{t("admin.user")}</th>
            <th className="px-4 py-2 font-medium">{t("admin.amount")}</th>
            <th className="px-4 py-2 font-medium">{t("admin.status")}</th>
            <th className="px-4 py-2 font-medium">{t("admin.created")}</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {orders.map((item) => (
            <tr key={item.id} className="border-b border-line/70 last:border-0">
              <td className="px-4 py-2.5 font-mono text-[10.5px] text-ink">
                {item.code}
              </td>
              <td className="max-w-[180px] px-4 py-2.5">
                <p className="truncate text-[11px] text-ink">
                  {item.userName || item.userEmail}
                </p>
                <p className="truncate text-[10px] text-muted">{item.userEmail}</p>
              </td>
              <td className="px-4 py-2.5 text-[11px] tabular-nums text-ink">
                {formatRupiah(item.amount)}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`chip ${
                    item.status === "paid"
                      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : item.status === "cancelled"
                        ? "border-red-500/30 text-red-600 dark:text-red-400"
                        : "border-amber-500/30 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {t(
                    item.status === "paid"
                      ? "orders.paid"
                      : item.status === "cancelled"
                        ? "orders.cancelled"
                        : "orders.pending",
                  )}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[10px] tabular-nums text-muted">
                {new Date(item.createdAt).toLocaleDateString("id-ID")}
              </td>
              <td className="px-4 py-2.5 text-right">
                {item.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => onCancel(item)}
                    disabled={busy === `order:${item.id}`}
                    className="text-[10.5px] font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    {t("admin.cancelOrder")}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
