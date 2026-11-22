"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LogOut, Receipt, Settings, ShieldCheck } from "lucide-react";
import type { PublicUser } from "@/lib/types";
import type { Locale } from "./content";

type OrderState = {
  code: string;
  whatsappUrl: string | null;
};

const copy = {
  en: {
    menu: "Account",
    openWorkspace: "Open workspace",
    orders: "Order history",
    help: "Help guide",
    upgrade: "Upgrade lifetime",
    upgrading: "Opening…",
    logout: "Log out",
    free: "Free",
    lifetime: "Lifetime",
    admin: "Admin",
    pending: "Waiting for activation",
    upgradeError: "Could not create the order. Try again.",
  },
  id: {
    menu: "Akun",
    openWorkspace: "Buka editor",
    orders: "Riwayat pesanan",
    help: "Panduan bantuan",
    upgrade: "Upgrade lifetime",
    upgrading: "Membuka…",
    logout: "Keluar",
    free: "Gratis",
    lifetime: "Lifetime",
    admin: "Admin",
    pending: "Menunggu aktivasi",
    upgradeError: "Gagal membuat pesanan. Coba lagi.",
  },
};

export function AccountMenu({ user, locale }: { user: PublicUser; locale: Locale }) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const initial = (user.name || user.email).slice(0, 1).toUpperCase();
  const paid = user.plan === "lifetime";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function upgrade() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        order?: { code: string };
        whatsappUrl?: string | null;
      };
      if (!response.ok || !data.order) {
        setError(data.error ?? t.upgradeError);
        return;
      }
      setOrder({
        code: data.order.code,
        whatsappUrl: data.whatsappUrl ?? null,
      });
    } catch {
      setError(t.upgradeError);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t.menu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={`grid h-10 w-10 place-items-center rounded-full border text-[12px] font-bold transition ${
          paid
            ? "border-[#C3F36B]/50 bg-[#C3F36B]/12 text-[#C3F36B]"
            : "border-[#3A3E37] bg-[#202320] text-[#F4F5F1] hover:border-[#C3F36B]/50"
        }`}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-12 right-0 z-[60] w-[260px] rounded-[16px] border border-[#30332F] bg-[#181A18] p-3 text-[#F4F5F1] shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
        >
          <p className="truncate text-[11.5px] font-medium text-[#F4F5F1]">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ${
                paid
                  ? "border-[#C3F36B]/30 bg-[#C3F36B]/10 text-[#C3F36B]"
                  : "border-[#3A3E37] text-[#A0A59B]"
              }`}
            >
              {paid ? t.lifetime : t.free}
            </span>
            {user.role === "admin" && (
              <a
                href="/admin"
                className="rounded-md border border-[#3A3E37] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#A0A59B] transition hover:text-white"
              >
                {t.admin}
              </a>
            )}
          </div>

          <a
            href="/editor"
            className="mt-3 flex items-center justify-between rounded-lg border border-[#C3F36B]/25 bg-[#C3F36B]/8 px-2.5 py-2 text-[11.5px] font-semibold text-[#C3F36B] transition hover:bg-[#C3F36B]/14"
          >
            {t.openWorkspace}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>

          <a
            href="/orders"
            className="mt-1.5 flex items-center justify-between rounded-lg px-2.5 py-2 text-[11.5px] font-medium text-[#D9DDD4] transition hover:bg-white/5 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5 text-[#8C9287]" />
              {t.orders}
            </span>
            <span aria-hidden="true">→</span>
          </a>

          <a
            href="/help"
            className="mt-0.5 flex items-center justify-between rounded-lg px-2.5 py-2 text-[11.5px] font-medium text-[#D9DDD4] transition hover:bg-white/5 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5 text-[#8C9287]" />
              {t.help}
            </span>
            <span aria-hidden="true">→</span>
          </a>

          {!paid && (
            <button
              type="button"
              onClick={() => void upgrade()}
              disabled={busy}
              className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#C3F36B] px-3 text-[11.5px] font-bold text-[#151810] transition hover:bg-[#A9DF4E] disabled:cursor-wait disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {busy ? t.upgrading : t.upgrade}
            </button>
          )}

          {order && (
            <div className="mt-2 rounded-lg border border-[#30332F] bg-[#101110] p-2.5 text-[10.5px] leading-relaxed text-[#A0A59B]">
              <p className="font-mono font-semibold text-[#F4F5F1]">{order.code}</p>
              <p>{t.pending}</p>
              {order.whatsappUrl && (
                <a
                  href={order.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-semibold text-[#C3F36B] underline underline-offset-4"
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {error && (
            <p className="mt-2 text-[10.5px] leading-snug text-[#FCA5A5]">{error}</p>
          )}

          <button
            type="button"
            onClick={() => void logout()}
            className="mt-2.5 flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-[#30332F] px-3 text-[11.5px] font-semibold text-[#D9DDD4] transition hover:border-[#555B50] hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t.logout}
          </button>
        </div>
      )}
    </div>
  );
}
