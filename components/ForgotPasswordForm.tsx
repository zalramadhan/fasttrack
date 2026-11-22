"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import LogoMark from "./Logo";

export default function ForgotPasswordForm() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(data.get("email") ?? "") }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? t("common.genericError"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("common.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-5">
          <a href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7 shrink-0 text-ink" />
            <span className="text-[14.5px] font-semibold tracking-[-0.02em] text-ink">
              fasttrack
            </span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-[400px]">
          <p className="label">fasttrack account</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
            {t("auth.forgotTitle")}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {t("auth.forgotSub")}
          </p>

          {sent ? (
            <div className="card mt-6 space-y-3 p-4">
              <p className="text-[13px] leading-relaxed text-ink">{t("auth.forgotSent")}</p>
              <p className="text-[10.5px] leading-relaxed text-muted">{t("auth.forgotNote")}</p>
              <a href="/login" className="btn btn-primary w-full justify-center">
                {t("auth.backToLogin")}
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="card mt-6 space-y-3 p-4">
              <label className="block space-y-1.5">
                <span className="label">{t("auth.email")}</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  placeholder="you@example.com"
                />
              </label>
              {error && <p className="alert">{error}</p>}
              <button type="submit" disabled={busy} className="btn btn-primary w-full">
                {busy ? "…" : t("auth.forgotSubmit")}
              </button>
              <a
                href="/login"
                className="block text-center text-[11px] text-muted underline decoration-line underline-offset-4"
              >
                {t("auth.backToLogin")}
              </a>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-line px-5 py-4 text-center text-[10.5px] text-muted">
        {t("start.legal")} ·{" "}
        <a href="/help" className="underline decoration-line underline-offset-4 transition hover:text-ink">
          {t("account.help")}
        </a>
      </footer>
    </div>
  );
}
