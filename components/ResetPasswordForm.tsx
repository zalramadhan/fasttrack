"use client";

import { useState } from "react";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  AuthShell,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "./auth/AuthShell";

export default function ResetPasswordForm({
  token,
  fontClass,
}: {
  token: string;
  fontClass?: string;
}) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : t("auth.resetInvalid"),
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? t("auth.resetInvalid"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("common.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      fontClass={fontClass}
      eyebrow={lang === "id" ? "AKUN FASTTRACK" : "FASTTRACK ACCOUNT"}
      title={done ? t("auth.resetDoneTitle") : t("auth.resetTitle")}
      subtitle={done ? t("auth.resetDone") : t("auth.resetSub")}
    >
      {done ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-[#C3F36B]/30 bg-[#C3F36B]/10 p-4">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#C3F36B] text-[12px] font-bold text-[#151810]">
              ✓
            </span>
            <p className="text-sm leading-relaxed text-[#F4F5F1]">{t("auth.resetDone")}</p>
          </div>
          <a href="/login" className={authPrimaryButtonClass}>
            <KeyRound className="h-4 w-4" />
            {t("auth.backToLogin")}
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className={authLabelClass}>{t("auth.newPassword")}</span>
            <div className="relative mt-1.5">
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777D73]"
              />
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={200}
                className={`${authInputClass} pl-10`}
                disabled={!token}
              />
            </div>
          </label>

          <label className="block">
            <span className={authLabelClass}>{t("auth.confirmPassword")}</span>
            <div className="relative mt-1.5">
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777D73]"
              />
              <input
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={200}
                className={`${authInputClass} pl-10`}
                disabled={!token}
              />
            </div>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#FCA5A5]/25 bg-[#FCA5A5]/10 px-3 py-2 text-xs leading-relaxed text-[#FCA5A5]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !token}
            className={authPrimaryButtonClass}
          >
            {busy ? "…" : t("auth.resetSubmit")}
          </button>

          {!token ? (
            <a href="/forgot-password" className={authSecondaryButtonClass}>
              {t("auth.requestNew")}
            </a>
          ) : (
            <a
              href="/login"
              className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#A0A59B] underline decoration-[#30332F] underline-offset-4 transition hover:text-[#C3F36B]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("auth.backToLogin")}
            </a>
          )}
        </form>
      )}
    </AuthShell>
  );
}
