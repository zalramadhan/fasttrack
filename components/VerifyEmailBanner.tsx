"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { PublicUser } from "@/lib/types";
import { MailIcon } from "./icons";

export default function VerifyEmailBanner({ user }: { user: PublicUser }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user.emailVerifiedAt) return null;

  async function resend() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(
          data.error?.includes("not configured")
            ? t("verify.notConfigured")
            : (data.error ?? t("common.genericError")),
        );
        return;
      }
      setMessage(t("verify.sent"));
    } catch {
      setError(t("common.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-amber-500/25 bg-amber-500/[0.07]">
      <div className="mx-auto flex max-w-[1580px] flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <MailIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-[11.5px] font-semibold text-ink">
              {t("verify.bannerTitle")}
            </p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
              {t("verify.bannerBody", { email: user.email })}
            </p>
            {message && (
              <p className="mt-1 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-1 text-[10.5px] text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy}
          className="btn shrink-0 self-start border-amber-500/30 bg-surface sm:self-auto"
        >
          {busy ? t("verify.sending") : t("verify.resend")}
        </button>
      </div>
    </div>
  );
}
