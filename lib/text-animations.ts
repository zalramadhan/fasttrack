import type { TextAnimation } from "./types";

/** Canvas ports of the typeframes text effects. */
export const TYPE_ANIMATIONS: { value: TextAnimation; label: string }[] = [
  { value: "line-mask", label: "Line Mask Rise" },
  { value: "word-pop", label: "Word Pop" },
  { value: "char-stagger", label: "Char Stagger" },
  { value: "letter-wave", label: "Letter Wave" },
  { value: "flip", label: "Flip 3D" },
  { value: "typewriter", label: "Typewriter" },
  { value: "neon", label: "Neon Flicker" },
  { value: "echo", label: "Echo Stack" },
  { value: "track-tighten", label: "Track Tighten" },
  { value: "gradient-sheen", label: "Gradient Sheen" },
];

export const TYPE_EFFECTS: ReadonlySet<TextAnimation> = new Set(
  TYPE_ANIMATIONS.map((item) => item.value),
);
