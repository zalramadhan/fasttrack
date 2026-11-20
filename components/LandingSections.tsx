"use client";

import { useI18n } from "@/lib/i18n";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
      {children}
    </p>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="grid grid-cols-[34px_1fr] gap-4 py-4 first:pt-0 last:pb-0">
      <span className="pt-0.5 font-mono text-[11px] text-muted">{number}</span>
      <div>
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h3>
        <p className="mt-1 max-w-[44ch] text-[12.5px] leading-relaxed text-muted">
          {body}
        </p>
      </div>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 first:pt-0">
      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] font-medium text-ink">{value}</dd>
    </div>
  );
}

export default function LandingSections({
  lifetimePrice,
}: {
  lifetimePrice: number;
}) {
  const { t } = useI18n();
  const price = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(lifetimePrice);

  return (
    <div>
      <section
        id="how"
        aria-labelledby="how-title"
        className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col justify-center px-8 py-8 sm:px-12 sm:py-10 lg:py-12"
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <SectionLabel>{t("landing.howLabel")}</SectionLabel>
            <h2
              id="how-title"
              className="mt-3 max-w-[15ch] text-[32px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[40px]"
            >
              {t("landing.howTitle")}
            </h2>
            <p className="mt-4 max-w-[38ch] text-[13px] leading-relaxed text-muted sm:text-[14px]">
              {t("landing.howBody")}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#start" className="btn btn-primary">
                {t("landing.howCta")}
              </a>
              <span className="text-[10.5px] text-muted">
                {t("landing.howNote")}
              </span>
            </div>
          </div>

          <ol>
            <Step
              number="01"
              title={t("landing.step1Title")}
              body={t("landing.step1Body")}
            />
            <Step
              number="02"
              title={t("landing.step2Title")}
              body={t("landing.step2Body")}
            />
            <Step
              number="03"
              title={t("landing.step3Title")}
              body={t("landing.step3Body")}
            />
          </ol>
        </div>
      </section>

      <section
        id="editor"
        aria-labelledby="editor-title"
        className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col justify-center px-8 py-8 sm:px-12 sm:py-10 lg:py-12"
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-14">
          <div>
            <SectionLabel>{t("landing.editorLabel")}</SectionLabel>
            <h2
              id="editor-title"
              className="mt-3 max-w-[16ch] text-[32px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[40px]"
            >
              {t("landing.editorTitle")}
            </h2>
          </div>

          <div>
            <p className="max-w-[48ch] text-[13px] leading-relaxed text-muted sm:text-[14px]">
              {t("landing.editorBody")}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2">
              <Fact
                label={t("landing.factClipsLabel")}
                value={t("landing.factClipsValue")}
              />
              <Fact
                label={t("landing.factTransitionsLabel")}
                value={t("landing.factTransitionsValue")}
              />
              <Fact
                label={t("landing.factTextLabel")}
                value={t("landing.factTextValue")}
              />
              <Fact
                label={t("landing.factAudioLabel")}
                value={t("landing.factAudioValue")}
              />
            </dl>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[18px] border border-ink/10 bg-stage p-2 shadow-[0_32px_80px_-48px_rgba(16,16,18,0.75)] dark:border-white/10">
          <picture>
            <source
              media="(max-width: 767px)"
              srcSet="/landing/editor-390.webp"
              type="image/webp"
            />
            <img
              src="/landing/editor-1440.webp"
              alt={t("landing.editorTitle")}
              width={1440}
              height={900}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full rounded-[11px]"
            />
          </picture>
        </div>

        <div className="mt-5">
          <SectionLabel>{t("landing.previewLabel")}</SectionLabel>
          <p className="mt-2 max-w-[62ch] text-[12px] leading-relaxed text-muted">
            {t("landing.previewBody")}
          </p>
        </div>
      </section>

      <section
        id="pricing"
        aria-labelledby="pricing-title"
        className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col justify-center px-8 py-8 sm:px-12 sm:py-10 lg:py-12"
      >
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-16">
          <div>
            <SectionLabel>{t("landing.pricingLabel")}</SectionLabel>
            <h2
              id="pricing-title"
              className="mt-3 max-w-[14ch] text-[32px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[40px]"
            >
              {t("landing.pricingTitle")}
            </h2>
            <p className="mt-4 max-w-[38ch] text-[13px] leading-relaxed text-muted sm:text-[14px]">
              {t("landing.pricingBody")}
            </p>
            <p className="mt-6 max-w-[38ch] text-[10.5px] leading-relaxed text-muted">
              {t("landing.priceNote")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-[16px] border border-line bg-surface p-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                {t("landing.freeName")}
              </p>
              <p className="mt-4 text-[30px] font-semibold tracking-[-0.03em] text-ink">
                {t("landing.freePrice")}
              </p>
              <ul className="mt-4 flex-1 space-y-2.5 text-[12px] leading-relaxed text-muted">
                <li>{t("landing.freePoint1")}</li>
                <li>{t("landing.freePoint2")}</li>
                <li>{t("landing.freePoint3")}</li>
              </ul>
              <a href="#start" className="btn mt-6 w-full">
                {t("landing.freeCta")}
              </a>
            </div>

            <div className="flex flex-col rounded-[16px] border border-ink bg-ink p-5 text-on-ink">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-on-ink/60">
                {t("landing.lifetimeName")}
              </p>
              <p className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">
                {t("landing.lifetimePrice", { price })}
              </p>
              <ul className="mt-4 flex-1 space-y-2.5 text-[12px] leading-relaxed text-on-ink/70">
                <li>{t("landing.lifetimePoint1")}</li>
                <li>{t("landing.lifetimePoint2")}</li>
                <li>{t("landing.lifetimePoint3")}</li>
              </ul>
              <a
                href="/help"
                className="btn mt-6 w-full border-on-ink/20 bg-on-ink text-ink hover:border-on-ink/30 hover:bg-on-ink/90"
              >
                {t("landing.lifetimeCta")}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq"
        aria-labelledby="faq-title"
        className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col justify-center px-8 py-8 sm:px-12 sm:py-10 lg:py-12"
      >
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start lg:gap-16">
          <div>
            <SectionLabel>{t("landing.faqLabel")}</SectionLabel>
            <h2
              id="faq-title"
              className="mt-3 max-w-[12ch] text-[32px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[40px]"
            >
              {t("landing.faqTitle")}
            </h2>
            <p className="mt-4 max-w-[36ch] text-[13px] leading-relaxed text-muted sm:text-[14px]">
              {t("landing.faqBody")}
            </p>
            <a href="#start" className="btn btn-primary mt-6">
              {t("landing.faqCta")}
            </a>
            <p className="mt-3 max-w-[34ch] text-[10.5px] leading-relaxed text-muted">
              {t("landing.faqCtaBody")}
            </p>
          </div>

          <div className="space-y-1">
            {([
              ["landing.faq1Q", "landing.faq1A"],
              ["landing.faq2Q", "landing.faq2A"],
              ["landing.faq3Q", "landing.faq3A"],
              ["landing.faq4Q", "landing.faq4A"],
            ] as const).map(([question, answer]) => (
              <details key={question} className="group py-3">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[13px] font-medium leading-snug text-ink [&::-webkit-details-marker]:hidden">
                  <span>{t(question)}</span>
                  <span className="shrink-0 text-[16px] leading-none text-muted transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 max-w-[58ch] text-[12px] leading-relaxed text-muted">
                  {t(answer)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
