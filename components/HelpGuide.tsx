"use client";

import type { PublicUser } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import AccountMenu from "./AccountMenu";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import LogoMark from "./Logo";
import {
  DownloadIcon,
  FilmIcon,
  HelpIcon,
  MailIcon,
  SaveIcon,
  TypeIcon,
} from "./icons";

export default function HelpGuide({ user }: { user: PublicUser | null }) {
  const { t } = useI18n();

  const sections = [
    { icon: FilmIcon, title: "help.quickTitle", body: "help.quickBody" },
    { icon: SaveIcon, title: "help.saveTitle", body: "help.saveBody" },
    { icon: MailIcon, title: "help.verifyTitle", body: "help.verifyBody" },
    { icon: TypeIcon, title: "help.editTitle", body: "help.editBody" },
    { icon: DownloadIcon, title: "help.exportTitle", body: "help.exportBody" },
  ] as const;

  const faqs = [
    ["help.faq1Q", "help.faq1A"],
    ["help.faq2Q", "help.faq2A"],
    ["help.faq3Q", "help.faq3A"],
    ["help.faq4Q", "help.faq4A"],
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-[56px] max-w-4xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7 text-ink" />
            <span className="text-[14.5px] font-semibold tracking-[-0.02em] text-ink">
              fasttrack
            </span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <a href="/login" className="btn">
                {t("auth.login")}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">fasttrack guide</p>
            <h1 className="mt-1 flex items-center gap-2 text-[30px] font-semibold tracking-[-0.03em] text-ink">
              <HelpIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              {t("help.title")}
            </h1>
            <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-muted">
              {t("help.subtitle")}
            </p>
          </div>
          <a href={user ? "/" : "/login"} className="btn">
            {t(user ? "help.back" : "auth.login")}
          </a>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {sections.map(({ icon: Icon, title, body }) => (
            <section key={title} className="card p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="text-[13px] font-semibold text-ink">{t(title)}</h2>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{t(body)}</p>
            </section>
          ))}
        </div>

        <section className="card mt-3 p-4">
          <h2 className="text-[13px] font-semibold text-ink">{t("help.accountTitle")}</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">{t("help.accountBody")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/orders" className="btn">
              {t("account.orders")}
            </a>
            <a href="/register" className="btn">
              {t("auth.toRegister")}
            </a>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
            {t("help.faqTitle")}
          </h2>
          <div className="mt-2.5 space-y-2">
            {faqs.map(([question, answer]) => (
              <details key={question} className="card px-4 py-3">
                <summary className="cursor-pointer text-[12.5px] font-medium text-ink">
                  {t(question)}
                </summary>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{t(answer)}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-6 text-center text-[10.5px] leading-relaxed text-muted">
          {t("help.needHelp")}
        </p>
      </main>
    </div>
  );
}
