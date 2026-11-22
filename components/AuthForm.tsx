"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import LogoMark from "./Logo";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      name: String(data.get("name") ?? ""),
      whatsapp: String(data.get("whatsapp") ?? ""),
    };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? t("common.genericError"));
        setBusy(false);
        return;
      }
      window.location.assign("/");
    } catch {
      setError(t("common.genericError"));
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

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
            {t(isLogin ? "auth.loginTitle" : "auth.registerTitle")}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {t(isLogin ? "auth.loginSub" : "auth.registerSub")}
          </p>

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

            {!isLogin && (
              <>
                <label className="block space-y-1.5">
                  <span className="label">{t("auth.name")}</span>
                  <input name="name" autoComplete="name" className="input" />
                </label>
                <label className="block space-y-1.5">
                  <span className="label">{t("auth.whatsapp")}</span>
                  <input
                    name="whatsapp"
                    inputMode="tel"
                    autoComplete="tel"
                    className="input"
                    placeholder="08…"
                  />
                </label>
              </>
            )}

            <label className="block space-y-1.5">
              <span className="label">{t("auth.password")}</span>
              <input
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={isLogin ? undefined : 8}
                className="input"
              />
              {!isLogin && (
                <span className="block text-[10px] text-muted">
                  {t("auth.passwordHint")}
                </span>
              )}
            </label>

            {isLogin && (
              <div className="flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-[10.5px] text-muted underline decoration-line underline-offset-4"
                >
                  {t("auth.forgot")}
                </a>
              </div>
            )}

            {error && <p className="alert">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary w-full"
            >
              {busy ? "…" : t(isLogin ? "auth.login" : "auth.register")}
            </button>
          </form>

          <div className="mt-3">
            <a
              href="/api/auth/google"
              className="btn w-full justify-center"
            >
              {t("auth.google")}
            </a>
          </div>

          <p className="mt-4 text-center text-[12px] text-muted">
            {t(isLogin ? "auth.needAccount" : "auth.haveAccount")}{" "}
            <a
              href={isLogin ? "/register" : "/login"}
              className="font-medium text-ink underline decoration-line underline-offset-4"
            >
              {t(isLogin ? "auth.toRegister" : "auth.toLogin")}
            </a>
          </p>

          <p className="mt-5 text-center text-[10.5px] leading-relaxed text-muted">
            {t("auth.freeNote")}
          </p>
        </div>
      </main>

      <footer className="border-t border-line px-5 py-4 text-center text-[10.5px] text-muted">
        {t("start.legal")} · <a href="/help" className="underline decoration-line underline-offset-4 transition hover:text-ink">{t("account.help")}</a>
      </footer>
    </div>
  );
}
