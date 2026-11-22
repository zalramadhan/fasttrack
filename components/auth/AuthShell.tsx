"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export const authLabelClass =
  "block text-[10px] font-bold uppercase tracking-[1.3px] text-[#8C9287]";
export const authInputClass =
  "h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] px-3.5 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#6F756B] focus:border-[#C3F36B] disabled:opacity-50";
export const authPrimaryButtonClass =
  "inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#C3F36B] px-5 text-sm font-bold text-[#151810] transition hover:bg-[#A9DF4E] disabled:cursor-wait disabled:opacity-60";
export const authSecondaryButtonClass =
  "inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#30332F] bg-[#101110] px-5 text-sm font-semibold text-[#F4F5F1] transition hover:border-[#555B50] hover:bg-[#202320]";

export function AuthShell({
  fontClass,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  fontClass?: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t, lang, setLang } = useI18n();

  return (
    <div
      className={`landing-page relative min-h-screen overflow-hidden bg-[#101110] text-[#F4F5F1] ${fontClass ?? ""}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="hero-grid-pattern absolute inset-0 opacity-45"
          style={{
            maskImage:
              "radial-gradient(900px circle at 50% 22%, rgba(0,0,0,0.9), transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(900px circle at 50% 22%, rgba(0,0,0,0.9), transparent 72%)",
          }}
        />
        <div className="animate-studio-light-a absolute -top-56 -right-52 h-[620px] w-[760px] rounded-full bg-[radial-gradient(ellipse,rgba(195,243,107,0.1)_0%,transparent_68%)]" />
        <div className="absolute bottom-[-260px] left-[-180px] h-[520px] w-[640px] rounded-full bg-[radial-gradient(ellipse,rgba(128,164,132,0.08)_0%,transparent_70%)]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-[#101110]/55 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1160px] items-center justify-between gap-4 px-6">
          <a
            href="/"
            className="font-display text-[22px] font-bold tracking-[-0.04em] text-[#F4F5F1]"
          >
            fasttrack
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="hidden text-[12px] font-medium text-[#A0A59B] transition hover:text-white sm:inline"
            >
              {lang === "id" ? "Kembali ke beranda" : "Back to home"}
            </a>
            <div
              role="group"
              aria-label={t("common.language")}
              className="inline-flex items-center rounded-lg border border-[#30332F] bg-[#181A18] p-0.5 text-[11px] font-semibold"
            >
              {(["en", "id"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value)}
                  aria-pressed={lang === value}
                  className={`rounded-md px-2 py-1 uppercase tracking-[0.08em] transition ${
                    lang === value
                      ? "bg-[#C3F36B] text-[#151810]"
                      : "text-[#A0A59B] hover:text-white"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-74px)] max-w-[1160px] items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          <div className="rounded-[22px] border border-[#30332F] bg-[#181A18] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.4)] sm:p-7">
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#C3F36B]">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#F4F5F1] sm:text-[34px]">
              {title}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[#A0A59B]">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>

          <p className="mt-4 text-center text-[10.5px] leading-relaxed text-[#777D73]">
            {t("start.legal")}
            {" · "}
            <a
              href="/help"
              className="underline decoration-[#30332F] underline-offset-4 transition hover:text-[#C3F36B]"
            >
              {t("account.help")}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
