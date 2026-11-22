"use client";

import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { COPY, Locale } from './content';

interface FinalCtaSectionProps {
  locale: Locale;
  onStartClick: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function FinalCtaSection({ locale, onStartClick }: FinalCtaSectionProps) {
  const t = COPY[locale].finalCta;

  return (
    <section className="mx-auto max-w-[1160px] px-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="rounded-[24px] border border-[#30332F] bg-[#181A18] bg-[radial-gradient(ellipse_at_50%_100%,rgba(195,243,107,0.08),transparent_65%)] px-6 py-16 text-center sm:py-20"
      >
        <p className="text-xs font-bold tracking-[1.6px] uppercase text-[#C3F36B]">
          {t.eyebrow}
        </p>
        <h2
          style={{ fontSize: 'clamp(2.125rem, 4.5vw, 3.25rem)' }}
          className="font-display mx-auto mt-4 max-w-[650px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#F4F5F1] text-balance"
        >
          {t.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-[490px] text-[15px] leading-relaxed text-[#A0A59B]">
          {t.subhead}
        </p>
        <a
          href="/register"
          onClick={(event) => {
            event.preventDefault();
            onStartClick();
          }}
          className="mt-7 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] bg-[#C3F36B] px-6 text-sm font-bold text-[#151810] whitespace-nowrap transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#A9DF4E] cursor-pointer"
        >
          <span>{t.cta}</span>
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </motion.div>
    </section>
  );
}
