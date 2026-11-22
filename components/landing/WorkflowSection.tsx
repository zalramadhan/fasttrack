"use client";

import { motion } from 'motion/react';
import { COPY, Locale } from './content';

interface WorkflowSectionProps {
  locale: Locale;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function WorkflowSection({ locale }: WorkflowSectionProps) {
  const t = COPY[locale].workflow;

  return (
    <section
      id="how-it-works"
      aria-labelledby="workflow-title"
      className="mx-auto max-w-[1160px] scroll-mt-24 px-6 py-20 lg:py-24"
    >
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
          id="workflow-title"
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

      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {t.steps.map((step, idx) => (
          <motion.li
            key={step.num}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.42, delay: idx * 0.08, ease: EASE_OUT_EXPO }}
            className="border-t border-[#30332F] pt-6"
          >
            <span className="font-display text-[13px] font-bold tracking-wide text-[#C3F36B]">
              {step.num}
            </span>
            <h3 className="font-display mt-4 text-[23px] font-semibold tracking-[-0.03em] text-[#F4F5F1]">
              {step.title}
            </h3>
            <p className="mt-2.5 max-w-[320px] text-sm leading-relaxed text-[#A0A59B]">
              {step.body}
            </p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
