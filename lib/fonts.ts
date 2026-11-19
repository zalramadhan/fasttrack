/**
 * A curated slice of Google Fonts. Weights are requested one at a time so an
 * unsupported weight only degrades to the nearest loaded face instead of
 * breaking the whole stylesheet.
 */
export type FontEntry = {
  family: string;
  category: "Sans" | "Serif" | "Display" | "Mono" | "Script";
};

export const GOOGLE_FONTS: FontEntry[] = [
  { family: "Inter", category: "Sans" },
  { family: "Geist", category: "Sans" },
  { family: "Roboto", category: "Sans" },
  { family: "Open Sans", category: "Sans" },
  { family: "Lato", category: "Sans" },
  { family: "Montserrat", category: "Sans" },
  { family: "Poppins", category: "Sans" },
  { family: "Raleway", category: "Sans" },
  { family: "Archivo", category: "Sans" },
  { family: "Space Grotesk", category: "Sans" },
  { family: "DM Sans", category: "Sans" },
  { family: "Manrope", category: "Sans" },
  { family: "Sora", category: "Sans" },
  { family: "Outfit", category: "Sans" },
  { family: "Plus Jakarta Sans", category: "Sans" },
  { family: "Work Sans", category: "Sans" },
  { family: "Nunito", category: "Sans" },
  { family: "Rubik", category: "Sans" },
  { family: "Kanit", category: "Sans" },
  { family: "Prompt", category: "Sans" },
  { family: "Quicksand", category: "Sans" },
  { family: "Josefin Sans", category: "Sans" },
  { family: "Oswald", category: "Sans" },
  { family: "Barlow Condensed", category: "Sans" },
  { family: "Public Sans", category: "Sans" },
  { family: "Figtree", category: "Sans" },
  { family: "Onest", category: "Sans" },
  { family: "Playfair Display", category: "Serif" },
  { family: "Merriweather", category: "Serif" },
  { family: "Lora", category: "Serif" },
  { family: "Libre Baskerville", category: "Serif" },
  { family: "Crimson Text", category: "Serif" },
  { family: "EB Garamond", category: "Serif" },
  { family: "Cormorant Garamond", category: "Serif" },
  { family: "Fraunces", category: "Serif" },
  { family: "DM Serif Display", category: "Serif" },
  { family: "Bodoni Moda", category: "Serif" },
  { family: "Instrument Serif", category: "Serif" },
  { family: "Bebas Neue", category: "Display" },
  { family: "Anton", category: "Display" },
  { family: "Syne", category: "Display" },
  { family: "Unbounded", category: "Display" },
  { family: "Bricolage Grotesque", category: "Display" },
  { family: "Archivo Black", category: "Display" },
  { family: "Righteous", category: "Display" },
  { family: "Abril Fatface", category: "Display" },
  { family: "JetBrains Mono", category: "Mono" },
  { family: "IBM Plex Mono", category: "Mono" },
  { family: "Space Mono", category: "Mono" },
  { family: "Fira Code", category: "Mono" },
  { family: "Source Code Pro", category: "Mono" },
  { family: "Caveat", category: "Script" },
  { family: "Pacifico", category: "Script" },
  { family: "Lobster", category: "Script" },
  { family: "Permanent Marker", category: "Script" },
  { family: "Dancing Script", category: "Script" },
];

export const DEFAULT_FONT = "Inter";

export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

const pending = new Map<string, Promise<void>>();
const ready = new Set<string>();

function fontUrl(family: string, weight: number) {
  const name = family.trim().replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${weight}&display=swap`;
}

/** Load a single Google font face and make sure it is usable by canvas. */
export function ensureFont(family: string, weight: number): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const key = `${family}:${weight}`;
  if (ready.has(key)) return Promise.resolve();
  const existing = pending.get(key);
  if (existing) return existing;

  const task = new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontUrl(family, weight);
    const finish = async () => {
      try {
        await document.fonts.load(`${weight} 32px "${family}"`);
      } catch {
        // weight not available, fall back to the closest loaded face
      }
      ready.add(key);
      resolve();
    };
    link.onload = () => void finish();
    link.onerror = () => {
      ready.add(key);
      resolve();
    };
    document.head.appendChild(link);
    // Safety net in case the stylesheet hangs.
    window.setTimeout(() => void finish(), 4000);
  });

  pending.set(key, task);
  return task;
}

export async function ensureLayerFonts(fontFamily: string, fontWeight: number) {
  await Promise.all([ensureFont(fontFamily, 400), ensureFont(fontFamily, fontWeight)]);
}
