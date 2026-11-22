"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { savePendingSource } from "@/lib/pending-source";
import type { PublicUser } from "@/lib/types";
import type { Locale } from "./content";
import { Navbar } from "./Navbar";
import { HeroSection, type LoadedMedia } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { WorkflowSection } from "./WorkflowSection";
import { PricingSection } from "./PricingSection";
import { FaqSection } from "./FaqSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { Footer } from "./Footer";
import { CustomCursor } from "./CustomCursor";
import { AuthModal, type AuthMode } from "./AuthModal";

export default function LandingPage({
  lifetimePrice,
  fontClass,
  user,
}: {
  lifetimePrice: number;
  fontClass?: string;
  user?: PublicUser | null;
}) {
  const isAuthenticated = Boolean(user);
  const [locale, setLocale] = useState<Locale>("en");
  const [loadedMedia, setLoadedMedia] = useState<LoadedMedia | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("fasttrack-lang");
    if (saved === "id") setLocale("id");
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    window.localStorage.setItem("fasttrack-lang", next);
    document.documentElement.lang = next;
  }

  async function rememberMedia() {
    const media = loadedMedia;
    if (!media) return;
    try {
      if (media.type === "file" && media.file) {
        await savePendingSource({
          kind: "file",
          blob: media.file,
          name: media.label,
          createdAt: Date.now(),
        });
      } else if (media.type === "url" && media.url) {
        await savePendingSource({
          kind: "link",
          url: media.url,
          createdAt: Date.now(),
        });
      }
    } catch {
      // Auth can still open; the user can pick the file again afterwards.
    }
  }

  async function start() {
    await rememberMedia();
    if (isAuthenticated) {
      window.location.assign("/editor");
      return;
    }
    setAuthMode("signup");
  }

  return (
    <MotionConfig reducedMotion="user">
      <CustomCursor />
      <div
        id="top"
        className={`landing-page min-h-screen bg-[#101110] text-[#F4F5F1] ${fontClass ?? ""}`}
      >
        <Navbar
          locale={locale}
          user={user ?? null}
          onStartClick={() => void start()}
        />

        <main>
          <HeroSection
            locale={locale}
            onLocaleChange={changeLocale}
            loadedMedia={loadedMedia}
            onMediaSelect={setLoadedMedia}
            onStart={() => void start()}
            isAuthenticated={isAuthenticated}
          />

          <FeaturesSection locale={locale} />
          <WorkflowSection locale={locale} />

          <PricingSection
            locale={locale}
            lifetimePrice={lifetimePrice}
            isAuthenticated={isAuthenticated}
            onSelectFree={() => void start()}
            onSelectUpgrade={() => window.location.assign("/help")}
          />

          <FaqSection locale={locale} />

          <FinalCtaSection
            locale={locale}
            isAuthenticated={isAuthenticated}
            onStartClick={() => void start()}
          />
        </main>

        <Footer
          locale={locale}
          onLocaleChange={changeLocale}
          onOpenHelp={() => window.location.assign("/help")}
        />

        <AuthModal
          mode={authMode}
          locale={locale}
          mediaLabel={loadedMedia?.label}
          onClose={() => setAuthMode(null)}
          onSwitch={setAuthMode}
        />
      </div>
    </MotionConfig>
  );
}
