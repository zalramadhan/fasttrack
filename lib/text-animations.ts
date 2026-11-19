import type { TextAnimation } from "./types";

type TypeAnimation = {
  value: TextAnimation;
  label: string;
  loop?: boolean;
};

/** Canvas ports of the typeframes text effects. */
export const TYPE_ANIMATIONS: TypeAnimation[] = [
  { value: "line-mask", label: "Line Mask Rise" },
  { value: "word-mask", label: "Word Mask Rise" },
  { value: "word-pop", label: "Word Pop" },
  { value: "char-stagger", label: "Char Stagger" },
  { value: "letter-wave", label: "Letter Wave" },
  { value: "flip", label: "Flip 3D" },
  { value: "typewriter", label: "Typewriter" },
  { value: "caret-sweep", label: "Caret Sweep" },
  { value: "neon", label: "Neon Flicker" },
  { value: "glow-pulse", label: "Glow Pulse" },
  { value: "echo", label: "Echo Stack" },
  { value: "track-tighten", label: "Track Tighten" },
  { value: "gradient-sheen", label: "Gradient Sheen" },
  { value: "rgb-split", label: "Chromatic Split" },
  { value: "vhs", label: "VHS Skew" },
  { value: "shatter", label: "Character Shatter" },
  { value: "slice-shift", label: "Slice Shift" },
  { value: "scramble", label: "Scramble Decode" },
  { value: "vertical-ticker", label: "Vertical Ticker", loop: true },
  { value: "marquee", label: "Infinite Marquee", loop: true },
  { value: "diagonal-ticker", label: "Diagonal Ticker", loop: true },
];

export const TYPE_EFFECTS: ReadonlySet<TextAnimation> = new Set(
  TYPE_ANIMATIONS.map((item) => item.value),
);

export const LOOP_EFFECTS: ReadonlySet<TextAnimation> = new Set(
  TYPE_ANIMATIONS.filter((item) => item.loop).map((item) => item.value),
);

export function isLoopEffect(effect: TextAnimation) {
  return LOOP_EFFECTS.has(effect);
}
