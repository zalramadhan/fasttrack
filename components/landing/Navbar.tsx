"use client";

import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { COPY, Locale } from './content';

interface NavbarProps {
  locale: Locale;
  onStartClick: () => void;
}

export function Navbar({ locale, onStartClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = COPY[locale].nav;

  const navLinks = [
    { href: '#features', label: t.features },
    { href: '#how-it-works', label: t.howItWorks },
    { href: '#pricing', label: t.pricing },
    { href: '#faq', label: t.faq },
  ];

  return (
    <header className="sticky top-0 z-40 h-[74px] border-b border-white/12 bg-[#101110]/45 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      <div className="mx-auto flex h-full max-w-[1160px] items-center justify-between gap-8 px-6">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="font-display text-[22px] font-bold tracking-[-0.04em] text-[#F4F5F1] whitespace-nowrap shrink-0"
        >
          fasttrack
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#D2D6CD]">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F4F5F1] hover:underline hover:underline-offset-4"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary CTA button */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/login"
            className="hidden text-[13px] font-medium text-[#D2D6CD] transition-colors hover:text-white sm:inline-flex"
          >
            {locale === 'en' ? 'Log in' : 'Masuk'}
          </a>
          <a
            href="/register"
            onClick={(event) => {
              event.preventDefault();
              onStartClick();
            }}
            className="hidden sm:inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-[10px] bg-[#C3F36B] px-[18px] text-[13px] font-bold text-[#151810] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#A9DF4E] cursor-pointer"
          >
            <span>{t.cta}</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-white/15 bg-white/8 text-[#F4F5F1] backdrop-blur-md md:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-b border-white/12 bg-[#101110]/75 px-6 py-4 backdrop-blur-2xl backdrop-saturate-150 md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium text-[#B7BBB2]">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-2.5 whitespace-nowrap hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/register"
              onClick={(event) => {
                event.preventDefault();
                setMobileOpen(false);
                onStartClick();
              }}
              className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#C3F36B] px-4 text-sm font-bold text-[#151810] whitespace-nowrap cursor-pointer"
            >
              <span>{t.cta}</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
