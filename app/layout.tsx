import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n";
import { landingFontClass } from "./fonts";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "fasttrack — video card editor",
  description:
    "Combine videos with transitions, trim, text, and music, then export MP4. Start free, upgrade for clean 1080p.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={landingFontClass} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("fasttrack-theme");if(t!=="dark"&&t!=="light"){t="dark"}document.documentElement.dataset.theme=t;var l=localStorage.getItem("fasttrack-lang");document.documentElement.lang=l==="id"?"id":"en"}catch(e){}})();',
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
