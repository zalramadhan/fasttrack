"use client";

import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  AuthShell,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "./auth/AuthShell";

export default function VerifyEmailForm({
  token,
  fontClass,
}: {
  token: string;
  fontClass?: string;
}) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : t("verify.invalidLink"));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? t("verify.invalidLink"));
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
      eyebrow={lang === "id" ? "VERIFIKASI EMAIL" : "EMAIL VERIFICATION"}
      title={done ? t("verify.successTitle") : t("verify.pageTitle")}
      subtitle={done ? t("verify.successBody") : t("verify.pageBody")}
    >
      {done ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-[#C3F36B]/30 bg-[#C3F36B]/10 p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#C3F36B]" />
            <p className="text-sm leading-relaxed text-[#F4F5F1]">{t("verify.successBody")}</p>
          </div>
          <a href="/" className={authPrimaryButtonClass}>
            {t("verify.openEditor")}
          </a>
          <a href="/login" className={authSecondaryButtonClass}>
            {t("verify.login")}
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#FCA5A5]/25 bg-[#FCA5A5]/10 px-3 py-2 text-xs leading-relaxed text-[#FCA5A5]"
            >
              {error}
            </p>
          ) : (
            <p className="rounded-xl border border-[#30332F] bg-[#101110] px-3.5 py-3 text-xs leading-relaxed text-[#A0A59B]">
              {lang === "id"
                ? "Klik tombol di bawah untuk mengonfirmasi alamat email ini."
                : "Click the button below to confirm this email address."}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !token}
            className={authPrimaryButtonClass}
          >
            <MailCheck className="h-4 w-4" />
            {busy ? t("verify.verifying") : t("verify.confirm")}
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
