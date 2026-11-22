"use client";

import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  AuthShell,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "./auth/AuthShell";

export default function ForgotPasswordForm({ fontClass }: { fontClass?: string }) {
  const { t, lang } = useI18n();
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
    <AuthShell
      fontClass={fontClass}
      eyebrow={lang === "id" ? "AKUN FASTTRACK" : "FASTTRACK ACCOUNT"}
      title={t("auth.forgotTitle")}
      subtitle={t("auth.forgotSub")}
    >
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-[#C3F36B]/30 bg-[#C3F36B]/10 p-4">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#C3F36B] text-[12px] font-bold text-[#151810]">
              ✓
            </span>
            <div>
              <p className="text-sm font-semibold text-[#F4F5F1]">{t("auth.forgotSent")}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#A0A59B]">{t("auth.forgotNote")}</p>
            </div>
          </div>
          <a href="/login" className={authPrimaryButtonClass}>
            <ArrowLeft className="h-4 w-4" />
            {t("auth.backToLogin")}
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className={authLabelClass}>{t("auth.email")}</span>
            <div className="relative mt-1.5">
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777D73]"
              />
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`${authInputClass} pl-10`}
                placeholder="you@example.com"
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

          <button type="submit" disabled={busy} className={authPrimaryButtonClass}>
            {busy ? "…" : t("auth.forgotSubmit")}
          </button>

          <a
            href="/login"
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#A0A59B] underline decoration-[#30332F] underline-offset-4 transition hover:text-[#C3F36B]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("auth.backToLogin")}
          </a>
        </form>
      )}
    </AuthShell>
  );
}
