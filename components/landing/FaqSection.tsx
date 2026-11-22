"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { COPY, Locale } from './content';

interface FaqSectionProps {
  locale: Locale;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function FaqSection({ locale }: FaqSectionProps) {
  const t = COPY[locale].faq;
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto max-w-[760px] scroll-mt-24 px-6 py-20 lg:py-24"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
        className="text-center"
      >
        <p className="text-xs font-bold tracking-[1.6px] uppercase text-[#C3F36B]">
          {t.eyebrow}
        </p>
        <h2
          id="faq-title"
          style={{ fontSize: 'clamp(2.125rem, 4.5vw, 3.25rem)' }}
          className="font-display mt-3.5 font-semibold leading-[1.08] tracking-[-0.04em] text-[#F4F5F1] text-balance"
        >
          {t.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-base leading-relaxed text-[#A0A59B] sm:text-[17px]">
          {t.subhead}
        </p>
      </motion.div>

      <div className="mt-12 divide-y divide-[#30332F] border-b border-[#30332F]">
        {t.items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.q}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-5 py-6 text-left text-[15px] font-semibold text-[#F4F5F1] cursor-pointer"
              >
                <span>{item.q}</span>
                <Plus
                  className={`h-5 w-5 shrink-0 text-[#C3F36B] transition-transform duration-150 ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  >
                    <p className="max-w-[650px] pb-6 text-sm leading-relaxed text-[#A0A59B]">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
