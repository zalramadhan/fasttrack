"use client";

import { motion } from 'motion/react';
import { ArrowUpRight, Film, Layers, Music, Sliders, Sparkles, Type } from 'lucide-react';
import { COPY, Locale } from './content';

interface FeaturesSectionProps {
  locale: Locale;
}

const ICON_MAP = {
  timeline: Layers,
  text: Type,
  transitions: Sparkles,
  audio: Music,
  proxy: Sliders,
  export: ArrowUpRight,
} as const;

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function FeaturesSection({ locale }: FeaturesSectionProps) {
  const t = COPY[locale].features;

  return (
    <section id="features" className="mx-auto max-w-[1160px] scroll-mt-24 px-6 py-20 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
        className="max-w-[670px]"
      >
        <p className="text-xs font-bold tracking-[1.6px] uppercase text-[#C3F36B]">
          {t.eyebrow}
        </p>
        <h2
          style={{ fontSize: 'clamp(2.125rem, 4.5vw, 3.25rem)' }}
          className="font-display mt-3.5 font-semibold leading-[1.08] tracking-[-0.04em] text-[#F4F5F1] text-balance"
        >
          {t.headlineTop}
          <br />
          {t.headlineBottom}
        </h2>
        <p className="mt-4 max-w-[540px] text-base leading-relaxed text-[#A0A59B] sm:text-[17px]">
          {t.subhead}
        </p>
      </motion.div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.items.map((item, idx) => {
          const Icon = ICON_MAP[item.id as keyof typeof ICON_MAP] ?? Film;
          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.42, delay: idx * 0.05, ease: EASE_OUT_EXPO }}
              className="flex min-h-[224px] flex-col justify-between rounded-[20px] border border-[#30332F] bg-[#181A18] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-[#59604E] hover:bg-[#1D201C]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#C3F36B]/20 bg-[#C3F36B]/10 text-[#C3F36B]">
                <Icon className="h-5 w-5" />
              </div>

              <div className="mt-7">
                <h3 className="font-display text-xl font-semibold tracking-[-0.025em] text-[#F4F5F1]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#A0A59B]">{item.body}</p>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
