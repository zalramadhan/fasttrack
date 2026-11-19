import type { TextLayer } from "./types";

export type TextStylePreset = {
  id: string;
  name: string;
  patch: Pick<
    TextLayer,
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "letterSpacing"
    | "lineHeight"
    | "color"
    | "outlineWidth"
    | "outlineColor"
    | "transform"
  >;
};

export const TEXT_PRESETS: TextStylePreset[] = [
  {
    id: "clean",
    name: "Clean",
    patch: {
      fontFamily: "Inter",
      fontSize: 92,
      fontWeight: 700,
      letterSpacing: 0,
      lineHeight: 1.15,
      color: "#ffffff",
      outlineWidth: 0,
      outlineColor: "#000000",
      transform: "none",
    },
  },
  {
    id: "poster",
    name: "Poster",
    patch: {
      fontFamily: "Bebas Neue",
      fontSize: 148,
      fontWeight: 400,
      letterSpacing: 2,
      lineHeight: 0.98,
      color: "#ffffff",
      outlineWidth: 5,
      outlineColor: "#000000",
      transform: "uppercase",
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    patch: {
      fontFamily: "Instrument Serif",
      fontSize: 108,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1.06,
      color: "#ffffff",
      outlineWidth: 0,
      outlineColor: "#000000",
      transform: "none",
    },
  },
  {
    id: "impact",
    name: "Impact",
    patch: {
      fontFamily: "Anton",
      fontSize: 128,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 0.95,
      color: "#ffffff",
      outlineWidth: 7,
      outlineColor: "#16161a",
      transform: "uppercase",
    },
  },
  {
    id: "mono",
    name: "Mono",
    patch: {
      fontFamily: "JetBrains Mono",
      fontSize: 60,
      fontWeight: 500,
      letterSpacing: 3,
      lineHeight: 1.45,
      color: "#ffffff",
      outlineWidth: 0,
      outlineColor: "#000000",
      transform: "uppercase",
    },
  },
  {
    id: "soft",
    name: "Soft",
    patch: {
      fontFamily: "Cormorant Garamond",
      fontSize: 112,
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1.12,
      color: "#f6efe4",
      outlineWidth: 0,
      outlineColor: "#000000",
      transform: "none",
    },
  },
  {
    id: "lime",
    name: "Lime",
    patch: {
      fontFamily: "Outfit",
      fontSize: 96,
      fontWeight: 800,
      letterSpacing: -1,
      lineHeight: 1.04,
      color: "#dcff5a",
      outlineWidth: 0,
      outlineColor: "#000000",
      transform: "none",
    },
  },
  {
    id: "tag",
    name: "Tag",
    patch: {
      fontFamily: "Space Grotesk",
      fontSize: 56,
      fontWeight: 500,
      letterSpacing: 2,
      lineHeight: 1.4,
      color: "#ffffff",
      outlineWidth: 0,
      outlineColor: "#000000",
      transform: "uppercase",
    },
  },
];
