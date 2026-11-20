export type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

export type UserPlan = "free" | "lifetime";
export type UserRole = "user" | "admin";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  role: UserRole;
  plan: UserPlan;
  status: "active" | "suspended";
  createdAt: number;
  activatedAt: number | null;
  emailVerifiedAt: number | null;
};

export type OrderStatus = "pending" | "paid" | "cancelled";

export type EditorStep = "trim" | "text" | "export";

export type PreviewQuality = "full" | "half" | "quarter";

export type SavedProject = {
  version: 1;
  clips: Clip[];
  music: MediaAsset | null;
  videoFrame: VideoFrame;
  ratio: AspectRatio;
  layers: TextLayer[];
  selectedId: string | null;
  time: number;
  resolution: 360 | 720 | 1080;
  quality: "standard" | "high";
  step: EditorStep;
  sourceVolume: number;
  muted: boolean;
  musicVolume: number;
  musicOffset: number;
  previewQuality?: PreviewQuality;
};

export type UserOrder = {
  id: string;
  code: string;
  amount: number;
  status: OrderStatus;
  note: string;
  createdAt: number;
  confirmedAt: number | null;
  whatsappUrl: string | null;
};

export type VideoBackground = "crop" | "blur" | "solid";

/** How the source video is framed inside the canvas. */
export type VideoFrame = {
  zoom: number; // 1 = normal
  offsetX: number; // -1..1 of available pan
  offsetY: number;
  background: VideoBackground;
  blur: number; // blur radius at 1080 base, 0..60
  backgroundDim: number; // 0..0.85, darkens the blurred background
  backgroundColor: string; // solid background fill
};

export const DEFAULT_VIDEO_FRAME: VideoFrame = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  background: "crop",
  blur: 28,
  backgroundDim: 0.35,
  backgroundColor: "#101012",
};

export type TextTransform = "none" | "uppercase" | "lowercase";

export type TextAlign = "left" | "center" | "right";

export type TextAnimation =
  | "none"
  | "fade"
  | "pop"
  | "slide"
  // Typeframes-inspired entrances.
  | "line-mask"
  | "word-pop"
  | "char-stagger"
  | "letter-wave"
  | "flip"
  | "typewriter"
  | "neon"
  | "echo"
  | "track-tighten"
  | "gradient-sheen"
  | "word-mask"
  | "glow-pulse"
  | "rgb-split"
  | "vhs"
  | "shatter"
  | "slice-shift"
  | "scramble"
  | "caret-sweep"
  // Typeframes-style loops: active for the whole layer duration.
  | "vertical-ticker"
  | "marquee"
  | "diagonal-ticker";

/** All measurements are in pixels relative to a 1080px short side, then scaled. */
export type TextLayer = {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  color: string;
  outlineWidth: number;
  outlineColor: string;
  transform: TextTransform;
  align: TextAlign;
  x: number; // 0..1 of canvas width
  y: number; // 0..1 of canvas height
  maxWidth: number; // 0..1 of canvas width
  start: number; // seconds, relative to the full timeline
  end: number;
  enter: TextAnimation;
  exit: TextAnimation;
  animDuration: number;
  /** Speed multiplier for loop tickers, 1 = normal. */
  loopSpeed: number;
};

export type TransitionId = string;

/** Incoming transition for a clip, drawn against the previous clip. */
export type ClipTransition = {
  type: TransitionId | "none";
  duration: number; // seconds of overlap
};

export const DEFAULT_TRANSITION: ClipTransition = { type: "none", duration: 0.6 };
export const MAX_TRANSITION = 1.5;

export type MediaAsset = {
  id: string;
  url: string;
  name: string;
  kind: "video" | "audio";
  duration: number;
  width?: number;
  height?: number;
};

/** One video in the sequence. */
export type Clip = {
  key: string;
  asset: MediaAsset;
  trimStart: number;
  trimEnd: number;
  transition: ClipTransition;
};

export type ExportClip = {
  sourceId: string;
  trimStart: number;
  duration: number;
};

export type ExportStatus = {
  status: "receiving" | "encoding" | "done" | "error";
  framesWritten: number;
  totalFrames: number;
  progress: number; // 0..1 of encoding stage
  error?: string;
  fileName?: string;
};

export const ASPECT_RATIOS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1, height: 1 },
  "4:5": { width: 4, height: 5 },
  "9:16": { width: 9, height: 16 },
  "16:9": { width: 16, height: 9 },
};

export function outputSize(ratio: AspectRatio, base: 360 | 720 | 1080) {
  switch (ratio) {
    case "1:1":
      return { width: base, height: base };
    case "4:5":
      return { width: base, height: Math.round((base * 5) / 4) };
    case "9:16":
      return { width: base, height: Math.round((base * 16) / 9) };
    case "16:9":
      return { width: Math.round((base * 16) / 9), height: base };
  }
}

export const MAX_DURATION = 180;
export const MAX_CLIPS = 6;

export function clipLength(clip: Clip) {
  return Math.max(0, clip.trimEnd - clip.trimStart);
}

export type TimelineItem = {
  clip: Clip;
  index: number;
  /** Global start, already pulled back by the incoming transition. */
  offset: number;
  /** Clip length on its own, before overlap. */
  length: number;
  end: number;
  /** Effective overlap into this clip, seconds (0 for the first clip). */
  transitionIn: number;
};

const roundMs = (value: number) => Math.round(value * 1000) / 1000;

export function buildTimeline(clips: Clip[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  clips.forEach((clip, index) => {
    const length = Math.max(0.05, clipLength(clip));
    let transitionIn = 0;
    if (index > 0) {
      const prev = items[index - 1];
      const wanted = clip.transition && clip.transition.type !== "none" ? clip.transition.duration : 0;
      transitionIn = Math.min(wanted, prev.length * 0.5, length * 0.5);
      transitionIn = Math.max(0, roundMs(transitionIn));
    }
    const offset = index === 0 ? 0 : items[index - 1].end - transitionIn;
    items.push({
      clip,
      index,
      offset,
      length,
      end: offset + length,
      transitionIn,
    });
  });
  return items;
}

export function timelineDuration(items: TimelineItem[]) {
  return items.length ? items[items.length - 1].end : 0;
}

/** Clip that owns a global time. During an overlap this is the outgoing clip. */
export function timelineIndexAt(items: TimelineItem[], time: number) {
  for (let index = 0; index < items.length - 1; index++) {
    if (time < items[index].end) return index;
  }
  return Math.max(0, items.length - 1);
}

/** Transition running at a global time, if any. */
export function transitionAt(items: TimelineItem[], time: number) {
  for (let index = 0; index < items.length - 1; index++) {
    const next = items[index + 1];
    if (
      next.transitionIn > 0.001 &&
      time >= next.offset &&
      time < items[index].end
    ) {
      return {
        from: items[index],
        to: next,
        progress: Math.min(1, Math.max(0, (time - next.offset) / next.transitionIn)),
      };
    }
  }
  return null;
}
