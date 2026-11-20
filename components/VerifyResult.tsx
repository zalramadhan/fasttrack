"use client";

import { useI18n } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import LogoMark from "./Logo";

export default function VerifyResult({
  ok,
  signedIn,
}: {
  ok: boolean;
  signedIn: boolean;
}) {
  const { t } = useI18n();

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
        <div className="w-full max-w-[440px] text-center">
          <div
            className={`mx-auto grid h-12 w-12 place-items-center rounded-full border ${
              ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            <span className="text-[20px]">{ok ? "✓" : "!"}</span>
          </div>
          <h1 className="mt-4 text-[27px] font-semibold tracking-[-0.03em] text-ink">
            {t(ok ? "verify.successTitle" : "verify.invalidTitle")}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {t(ok ? "verify.successBody" : "verify.invalidBody")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <a href={signedIn ? "/" : "/login"} className="btn btn-primary">
              {t(signedIn ? "verify.openEditor" : "verify.login")}
            </a>
            <a href="/help" className="btn">
              {t("account.help")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
