"use client";

import { motion } from 'motion/react';
import { ArrowUpRight, Check } from 'lucide-react';
import { COPY, Locale } from './content';

interface PricingSectionProps {
  locale: Locale;
  lifetimePrice: number;
  onSelectFree: () => void;
  onSelectUpgrade: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function PricingSection({
  locale,
  lifetimePrice,
  onSelectFree,
  onSelectUpgrade,
}: PricingSectionProps) {
  const t = COPY[locale].pricing;
  const lifetimePriceLabel =
    lifetimePrice > 0
      ? new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(lifetimePrice)
      : t.lifetime.price;

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-24 bg-gradient-to-b from-transparent via-[#C3F36B]/[0.03] to-transparent py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1160px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="mx-auto max-w-[670px] text-center"
        >
          <p className="text-xs font-bold tracking-[1.6px] uppercase text-[#C3F36B]">
            {t.eyebrow}
          </p>
          <h2
            id="pricing-title"
            style={{ fontSize: 'clamp(2.125rem, 4.5vw, 3.25rem)' }}
            className="font-display mt-3.5 font-semibold leading-[1.08] tracking-[-0.04em] text-[#F4F5F1] text-balance"
          >
            {t.headlineTop}
            <br />
            {t.headlineBottom}
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-base leading-relaxed text-[#A0A59B] sm:text-[17px]">
            {t.subhead}
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-[800px] gap-5 sm:grid-cols-2">
          {/* Free Tier */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
            className="flex flex-col justify-between rounded-[20px] border border-[#30332F] bg-[#181A18] p-8 transition-transform duration-200 hover:-translate-y-1"
          >
            <div>
              <p className="text-sm font-semibold text-[#B6BCB0]">{t.free.name}</p>
              <div className="font-display mt-3.5 flex items-baseline gap-2 text-[42px] font-bold tracking-[-0.04em] tabular-nums text-[#F4F5F1]">
                <span>{t.free.price}</span>
                <span className="font-sans text-[13px] font-normal tracking-normal text-[#8C9287]">
                  / {t.free.cycle}
                </span>
              </div>
              <p className="mt-2 min-h-[42px] text-[13px] leading-relaxed text-[#A0A59B]">
                {t.free.desc}
              </p>

              <a
                href="/register"
                onClick={(event) => {
                  event.preventDefault();
                  onSelectFree();
                }}
                className="my-6 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#30332F] bg-white/4 px-5 text-sm font-bold text-[#F4F5F1] whitespace-nowrap transition-colors hover:border-[#555B50] hover:bg-white/8 cursor-pointer"
              >
                <span>{t.free.cta}</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>

              <ul className="space-y-3 text-[13px] text-[#C2C7BD]">
                {t.free.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C3F36B]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>

          {/* Lifetime Tier */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, delay: 0.08, ease: EASE_OUT_EXPO }}
            className="flex flex-col justify-between rounded-[20px] border border-[#7B9850] bg-[#1D2119] p-8 shadow-[0_0_60px_rgba(195,243,107,0.06)] transition-transform duration-200 hover:-translate-y-1"
          >
            <div>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-[#F4F5F1]">{t.lifetime.name}</span>
                <span className="text-xs font-medium text-[#C3F36B]">
                  {t.lifetime.cycleNote}
                </span>
              </div>
              <div className="font-display mt-3.5 flex items-baseline gap-2 text-[42px] font-bold tracking-[-0.04em] tabular-nums text-[#F4F5F1]">
                <span>{lifetimePriceLabel}</span>
                <span className="font-sans text-[13px] font-normal tracking-normal text-[#A0A59B]">
                  / {t.lifetime.cycle}
                </span>
              </div>
              <p className="mt-2 min-h-[42px] text-[13px] leading-relaxed text-[#A0A59B]">
                {t.lifetime.desc}
              </p>

              <button
                type="button"
                onClick={onSelectUpgrade}
                className="my-6 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#C3F36B] px-5 text-sm font-bold text-[#151810] whitespace-nowrap transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#A9DF4E] cursor-pointer"
              >
                <span>{t.lifetime.cta}</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <ul className="space-y-3 text-[13px] text-[#E4E7DF]">
                {t.lifetime.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C3F36B]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        </div>

        <p className="mt-6 text-center text-xs text-[#777D73]">{t.waNote}</p>
      </div>
    </section>
  );
}
