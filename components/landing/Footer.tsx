"use client";

import { HelpCircle } from 'lucide-react';
import { COPY, Locale } from './content';
import LogoMark from '../Logo';

interface FooterProps {
  locale: Locale;
  onLocaleChange: (next: Locale) => void;
  onOpenHelp: () => void;
}

export function Footer({ locale, onLocaleChange, onOpenHelp }: FooterProps) {
  const t = COPY[locale].footer;

  return (
    <footer className="mt-20 border-t border-white/8 bg-[#101110]">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-6 py-9 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#777D73]">
          <span className="inline-flex items-center gap-2">
            <LogoMark className="h-5 w-5 shrink-0 text-[#C3F36B]" />
            <span className="font-display text-lg font-bold tracking-[-0.04em] text-[#F4F5F1]">
              fasttrack
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{t.notice}</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#9BA095]">
          <button
            type="button"
            onClick={() => onLocaleChange(locale === 'en' ? 'id' : 'en')}
            className="text-[#C3F36B] hover:underline whitespace-nowrap cursor-pointer"
          >
            {locale === 'en' ? 'Bahasa Indonesia' : 'English'}
          </button>

          <button
            type="button"
            onClick={onOpenHelp}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white whitespace-nowrap cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{t.helpGuide}</span>
          </button>

          <a
            href="https://github.com/zalramadhan"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white whitespace-nowrap"
          >
            GitHub
          </a>

          <a
            href="https://instagram.com/zalsomeone"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white whitespace-nowrap"
          >
            @zalsomeone
          </a>

          <span className="text-[#777D73] whitespace-nowrap">{t.madeBy}</span>
        </div>
      </div>
    </footer>
  );
}
