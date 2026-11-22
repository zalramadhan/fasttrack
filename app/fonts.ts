import {
  Bricolage_Grotesque,
  DM_Sans,
  JetBrains_Mono,
  Playfair_Display,
} from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const landingFontClass = [
  bricolage.variable,
  dmSans.variable,
  jetbrainsMono.variable,
  playfair.variable,
].join(" ");
