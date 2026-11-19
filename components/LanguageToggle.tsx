"use client";

import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-paper/70 p-0.5"
    >
      {(["en", "id"] as const).map((value) => {
        const active = lang === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLang(value)}
            aria-pressed={active}
            className={`focus-ring rounded-[6px] px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] transition ${
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(20,20,25,0.08)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
