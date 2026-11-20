"use client";

import { useState } from "react";
import type { PublicUser } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

type OrderState = {
  code: string;
  whatsappUrl: string | null;
};

export default function AccountMenu({ user }: { user: PublicUser }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderState | null>(null);

  const initial = (user.name || user.email).slice(0, 1).toUpperCase();
  const paid = user.plan === "lifetime";

  async function upgrade() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        order?: { code: string };
        whatsappUrl?: string | null;
      };
      if (!res.ok || !data.order) {
        setError(data.error ?? t("upgrade.error"));
        return;
      }
      setOrder({
        code: data.order.code,
        whatsappUrl: data.whatsappUrl ?? null,
      });
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      } else {
        setError(t("upgrade.noWhatsapp"));
      }
    } catch {
      setError(t("upgrade.error"));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login");
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("account.menu")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`focus-ring grid h-9 w-9 place-items-center rounded-full border text-[11px] font-semibold ${
          paid
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-line bg-paper text-ink"
        }`}
      >
        {initial}
      </button>

      {open && (
        <div className="card absolute right-0 top-11 z-50 w-[248px] p-3 shadow-xl">
          <p className="truncate text-[11.5px] font-medium text-ink">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className={`chip ${paid ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : ""}`}
            >
              {t(paid ? "account.lifetime" : "account.free")}
            </span>
            {user.role === "admin" && (
              <a href="/admin" className="chip hover:text-ink">
                {t("account.admin")}
              </a>
            )}
          </div>

          <a
            href="/orders"
            className="mt-2 flex items-center justify-between rounded-lg border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink transition hover:border-line-strong hover:bg-ink/[0.03]"
          >
            {t("account.orders")}
            <span aria-hidden="true">→</span>
          </a>

          <a
            href="/help"
            className="mt-1.5 flex items-center justify-between px-1 py-1 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            {t("account.help")}
            <span aria-hidden="true">→</span>
          </a>

          {!paid && (
            <button
              type="button"
              onClick={() => void upgrade()}
              disabled={busy}
              className="btn btn-primary mt-3 w-full"
            >
              {busy ? t("upgrade.opening") : t("account.upgrade")}
            </button>
          )}

          {order && (
            <div className="mt-2 rounded-lg border border-line bg-paper/60 p-2 text-[10.5px] leading-relaxed text-muted">
              <p className="font-mono font-medium text-ink">{order.code}</p>
              <p>{t("account.pending")}</p>
              {order.whatsappUrl && (
                <a
                  href={order.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-medium text-ink underline decoration-line underline-offset-4"
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {error && (
            <p className="mt-2 text-[10.5px] leading-snug text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void logout()}
            className="btn mt-2 w-full"
          >
            {t("account.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
