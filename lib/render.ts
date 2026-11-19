import { DEFAULT_VIDEO_FRAME, type TextAnimation, type TextLayer, type VideoFrame } from "./types";
import { TYPE_EFFECTS } from "./text-animations";

export type Rect = { left: number; top: number; width: number; height: number };

export type FrameInput = {
  width: number;
  height: number;
  video: HTMLVideoElement | null;
  layers: TextLayer[];
  time: number;
  videoFrame?: VideoFrame;
  /** Preview-only: draw layers outside their time window faintly. */
  ghostInactive?: boolean;
};

export function drawFrame(ctx: CanvasRenderingContext2D, input: FrameInput) {
  drawVideoScene(ctx, input.video, input.width, input.height, input.videoFrame);
  drawLayers(ctx, input.layers, input.width, input.height, input.time, input.ghostInactive);
}

/** Background + framed video only, without text. */
export function drawVideoScene(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  width: number,
  height: number,
  frame?: VideoFrame,
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0b0c";
  ctx.fillRect(0, 0, width, height);

  if (video && video.readyState >= 2 && video.videoWidth > 0) {
    drawVideo(ctx, video, width, height, frame);
  }
  ctx.restore();
}

/** Text layers only, painted over whatever is already on the canvas. */
export function drawLayers(
  ctx: CanvasRenderingContext2D,
  layers: TextLayer[],
  width: number,
  height: number,
  time: number,
  ghostInactive?: boolean,
) {
  ctx.save();
  for (const layer of layers) {
    const active = isLayerActive(layer, time);
    if (!active && !ghostInactive) continue;
    if (!active) {
      drawTextLayer(ctx, layer, width, height, 0.32);
      continue;
    }
    const animation = layerAnimation(layer, time, height);
    if (animation.alpha <= 0.001) continue;
    drawTextLayer(ctx, layer, width, height, 1, animation);
  }
  ctx.restore();
}

function drawVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  frame?: VideoFrame,
) {
  const settings = frame ?? DEFAULT_VIDEO_FRAME;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const blurry = settings.background === "blur";
  const contained = settings.background !== "crop";

  if (settings.background === "solid") {
    ctx.fillStyle = settings.backgroundColor || "#101012";
    ctx.fillRect(0, 0, width, height);
  }

  if (blurry) {
    // Blurred, slightly oversized cover copy fills the empty space behind.
    const bgScale = Math.max(width / vw, height / vh) * 1.15;
    const bw = vw * bgScale;
    const bh = vh * bgScale;
    ctx.save();
    ctx.globalAlpha = 0.8;
    if (settings.blur > 0.5) {
      const radius = settings.blur * (Math.min(width, height) / 1080);
      ctx.filter = `blur(${radius}px)`;
    }
    ctx.drawImage(video, (width - bw) / 2, (height - bh) / 2, bw, bh);
    ctx.restore();

    const dim = Math.min(0.85, Math.max(0, settings.backgroundDim));
    if (dim > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${dim})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  const baseScale = contained
    ? Math.min(width / vw, height / vh)
    : Math.max(width / vw, height / vh);
  const scale = baseScale * Math.max(1, settings.zoom);
  const dw = vw * scale;
  const dh = vh * scale;

  const panX = ((width - dw) / 2) * clampUnit(settings.offsetX);
  const panY = ((height - dh) / 2) * clampUnit(settings.offsetY);

  ctx.drawImage(video, (width - dw) / 2 + panX, (height - dh) / 2 + panY, dw, dh);
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function isLayerActive(layer: TextLayer, time: number) {
  return time >= layer.start - 1e-3 && time <= layer.end + 1e-3;
}

export type LayerAnimationState = {
  alpha: number;
  scale: number;
  offsetY: number;
  /** Set while a typeframes-style entrance is playing. */
  effect?: TextAnimation;
  enter?: number;
  elapsed?: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

/** Enter/exit animation for a layer at a given clip-relative time. */
export function layerAnimation(
  layer: TextLayer,
  time: number,
  height: number,
): LayerAnimationState {
  const duration = Math.max(0.05, layer.animDuration || 0.45);
  const enterRaw = layer.enter === "none" ? 1 : clamp01((time - layer.start) / duration);
  const exitRaw = layer.exit === "none" ? 1 : clamp01((layer.end - time) / duration);
  const progress = Math.min(enterRaw, exitRaw);

  if (TYPE_EFFECTS.has(layer.enter) && enterRaw < 1 && enterRaw <= exitRaw) {
    return {
      alpha: 1,
      scale: 1,
      offsetY: 0,
      effect: layer.enter,
      enter: enterRaw,
      elapsed: Math.max(0, time - layer.start),
    };
  }

  if (progress >= 1) return { alpha: 1, scale: 1, offsetY: 0 };

  const active = enterRaw <= exitRaw ? layer.enter : layer.exit;
  const eased = easeOutCubic(progress);

  if (active === "pop") {
    return { alpha: eased, scale: 0.86 + 0.14 * eased, offsetY: 0 };
  }
  if (active === "slide") {
    return { alpha: eased, scale: 1, offsetY: (1 - eased) * height * 0.06 };
  }
  return { alpha: eased, scale: 1, offsetY: 0 };
}

export function textScale(width: number, height: number) {
  return Math.min(width, height) / 1080;
}

function applyTransform(text: string, mode: TextLayer["transform"]) {
  if (mode === "uppercase") return text.toUpperCase();
  if (mode === "lowercase") return text.toLowerCase();
  return text;
}

function fontString(layer: TextLayer, size: number) {
  return `${layer.fontWeight} ${size}px "${layer.fontFamily}", "Inter", sans-serif`;
}

export type TextLayout = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  widest: number;
  bounds: Rect;
  align: TextLayer["align"];
  anchorX: number;
  blockLeft: number;
  top: number;
};

/** Lay out a layer the same way it is painted, so dragging matches pixels. */
export function layoutTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number,
): TextLayout {
  const scale = textScale(width, height);
  const fontSize = Math.max(6, layer.fontSize * scale);
  const letterSpacing = layer.letterSpacing * scale;
  const lineHeight = Math.max(1, fontSize * layer.lineHeight);
  const maxWidth = Math.max(fontSize, layer.maxWidth * width);

  const prevFont = ctx.font;
  const prevSpacing = (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing;
  ctx.font = fontString(layer, fontSize);
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${letterSpacing}px`;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const text = applyTransform(layer.text, layer.transform);
  const lines = wrapText(ctx, text, maxWidth);

  let widest = 0;
  for (const line of lines) widest = Math.max(widest, ctx.measureText(line).width);

  ctx.font = prevFont;
  if (prevSpacing !== undefined) {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = prevSpacing;
  }
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "";

  const anchorX = layer.x * width;
  const anchorY = layer.y * height;
  const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
  const blockLeft = anchorX - widest / 2;
  const top = anchorY - totalHeight / 2;

  return {
    lines,
    fontSize,
    lineHeight,
    widest,
    bounds: { left: blockLeft, top, width: widest, height: totalHeight },
    align: layer.align,
    anchorX,
    blockLeft,
    top,
  };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }

  return lines;
}

export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number,
  alpha = 1,
  animation?: LayerAnimationState,
) {
  const layout = layoutTextLayer(ctx, layer, width, height);
  if (layout.lines.length === 0) return;
  if (!layout.lines.some((line) => line.trim().length > 0)) return;

  if (animation?.effect && animation.elapsed !== undefined) {
    drawTypeText(ctx, layer, layout, width, height, animation);
    return;
  }

  const scale = textScale(width, height);
  const letterSpacing = layer.letterSpacing * scale;

  ctx.save();
  ctx.globalAlpha *= alpha * (animation?.alpha ?? 1);
  if (animation && (animation.scale !== 1 || animation.offsetY !== 0)) {
    const centerX = layout.anchorX;
    const centerY = layout.top + (layout.lines.length * layout.lineHeight) / 2;
    ctx.translate(0, animation.offsetY);
    ctx.translate(centerX, centerY);
    ctx.scale(animation.scale, animation.scale);
    ctx.translate(-centerX, -centerY);
  }
  ctx.font = fontString(layer, layout.fontSize);
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${letterSpacing}px`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = layer.color;

  if (layer.outlineWidth > 0) {
    ctx.strokeStyle = layer.outlineColor;
    ctx.lineWidth = layer.outlineWidth * scale * 2;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
  }

  layout.lines.forEach((line, index) => {
    const lineWidth = ctx.measureText(line).width;
    let x = layout.blockLeft;
    if (layout.align === "center") x = layout.anchorX - lineWidth / 2;
    if (layout.align === "right") x = layout.blockLeft + layout.widest - lineWidth;
    const y = layout.top + index * layout.lineHeight + layout.lineHeight / 2;

    if (layer.outlineWidth > 0) ctx.strokeText(line, x, y);
    ctx.fillText(line, x, y);
  });

  ctx.restore();
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "";
}

function drawTypeText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  layout: TextLayout,
  width: number,
  height: number,
  animation: LayerAnimationState,
) {
  const effect = animation.effect;
  if (!effect) return;

  const scale = textScale(width, height);
  const fontSize = layout.fontSize;
  const spacing = layer.letterSpacing * scale;
  const duration = Math.max(0.05, layer.animDuration || 0.45);
  const elapsed = Math.max(0, animation.elapsed ?? 0);
  const baseAlpha = animation.alpha;
  const setSpacing = (value: string) => {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = value;
  };

  const unitProgress = (delay: number) =>
    Math.min(1, Math.max(0, (elapsed - delay) / Math.max(0.05, duration - delay)));

  const lineY = (index: number) =>
    layout.top + index * layout.lineHeight + layout.lineHeight / 2;

  const alignX = (lineWidth: number) => {
    if (layer.align === "center") return layout.anchorX - lineWidth / 2;
    if (layer.align === "right") return layout.blockLeft + layout.widest - lineWidth;
    return layout.blockLeft;
  };

  const paint = (
    text: string,
    x: number,
    y: number,
    alpha: number,
    options?: { scale?: number; scaleX?: number; rotate?: number; dy?: number },
  ) => {
    if (!text) return;
    const textWidth = ctx.measureText(text).width;
    const unitScale = options?.scale ?? 1;
    ctx.save();
    ctx.globalAlpha = baseAlpha * alpha;
    ctx.translate(x + textWidth / 2, y + (options?.dy ?? 0));
    if (options?.rotate) ctx.rotate(options.rotate);
    ctx.scale(unitScale, unitScale * (options?.scaleX ?? 1));
    ctx.translate(-textWidth / 2, 0);
    if (layer.outlineWidth > 0) ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  const drawLine = (line: string, x: number, y: number, alpha = 1) => {
    if (!line.trim()) return;
    ctx.save();
    ctx.globalAlpha = baseAlpha * alpha;
    if (layer.outlineWidth > 0) ctx.strokeText(line, x, y);
    ctx.fillText(line, x, y);
    ctx.restore();
  };

  ctx.save();
  ctx.font = fontString(layer, fontSize);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = layer.color;
  ctx.strokeStyle = layer.outlineColor;
  ctx.lineWidth = layer.outlineWidth * scale * 2;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  setSpacing(`${spacing}px`);

  if (effect === "line-mask") {
    const count = Math.max(1, layout.lines.length);
    const stagger = Math.min(0.16, (duration * 0.6) / Math.max(1, count - 1));
    layout.lines.forEach((line, index) => {
      if (!line.trim()) return;
      const progress = easeOutCubic(unitProgress(index * stagger));
      const lineWidth = ctx.measureText(line).width;
      const x = alignX(lineWidth);
      const y = lineY(index);
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        layout.blockLeft - fontSize * 0.08,
        layout.top + index * layout.lineHeight - 1,
        layout.widest + fontSize * 0.16,
        layout.lineHeight + 2,
      );
      ctx.clip();
      drawLine(line, x, y + (1 - progress) * layout.lineHeight * 1.05);
      ctx.restore();
    });
  } else if (effect === "word-pop") {
    setSpacing("0px");
    const lines = layout.lines.map((line) => line.split(/(\s+)/).filter(Boolean));
    const total = lines.reduce((sum, units) => sum + units.filter((u) => u.trim()).length, 0);
    const stagger = Math.min(0.12, (duration * 0.6) / Math.max(1, total - 1));
    let wordIndex = 0;
    lines.forEach((units, lineIndex) => {
      let lineWidth = 0;
      units.forEach((unit) => {
        lineWidth += ctx.measureText(unit).width + spacing;
      });
      let x = alignX(Math.max(0, lineWidth - spacing));
      units.forEach((unit) => {
        const unitWidth = ctx.measureText(unit).width;
        if (unit.trim()) {
          const progress = easeOutCubic(unitProgress(wordIndex * stagger));
          const pop = 0.82 + 0.18 * progress + 0.12 * Math.sin(Math.PI * progress);
          paint(unit, x, lineY(lineIndex), progress, { scale: pop });
          wordIndex += 1;
        }
        x += unitWidth + spacing;
      });
    });
  } else if (
    effect === "char-stagger" ||
    effect === "letter-wave" ||
    effect === "flip"
  ) {
    setSpacing("0px");
    const lines = layout.lines.map((line) => Array.from(line));
    const total = lines.reduce((sum, chars) => sum + chars.length, 0);
    const stagger = Math.min(0.05, (duration * 0.6) / Math.max(1, total - 1));
    let charIndex = 0;
    lines.forEach((chars, lineIndex) => {
      let lineWidth = 0;
      chars.forEach((char) => {
        lineWidth += ctx.measureText(char).width + spacing;
      });
      let x = alignX(Math.max(0, lineWidth - spacing));
      chars.forEach((char, charInLine) => {
        const charWidth = ctx.measureText(char).width;
        if (char.trim()) {
          const progress = easeOutCubic(unitProgress(charIndex * stagger));
          if (effect === "char-stagger") {
            paint(char, x, lineY(lineIndex), progress, {
              dy: (1 - progress) * fontSize * 0.4,
              rotate: (1 - progress) * 0.05,
            });
          } else if (effect === "letter-wave") {
            const wave =
              Math.sin(charInLine * 0.7 - elapsed * 6) * fontSize * 0.14 * (1 - progress);
            paint(char, x, lineY(lineIndex), progress, { dy: wave });
          } else {
            paint(char, x, lineY(lineIndex), progress, {
              scaleX: 0.06 + 0.94 * progress,
            });
          }
          charIndex += 1;
        }
        x += charWidth + spacing;
      });
    });
  } else if (effect === "typewriter") {
    const totalChars = layout.lines.reduce((sum, line) => sum + Array.from(line).length, 0);
    const progress = easeOutCubic(Math.min(1, elapsed / duration));
    let remaining = Math.floor(totalChars * progress);
    let caretX = -1;
    let caretY = 0;
    layout.lines.forEach((line, index) => {
      const chars = Array.from(line);
      const count = Math.min(chars.length, remaining);
      remaining -= count;
      const visible = chars.slice(0, count).join("");
      if (!visible) return;
      const lineWidth = ctx.measureText(visible).width;
      const x = alignX(lineWidth);
      const y = lineY(index);
      drawLine(visible, x, y);
      if (count > 0) {
        caretX = x + lineWidth + spacing;
        caretY = y;
      }
    });
    if (caretX >= 0 && remaining === 0 && Math.floor(elapsed * 3) % 2 === 0) {
      const caretHeight = fontSize * 0.9;
      ctx.fillRect(
        caretX,
        caretY - caretHeight / 2,
        Math.max(1.5, fontSize * 0.045),
        caretHeight,
      );
    }
  } else if (effect === "neon") {
    const seed = Math.floor(elapsed * 24);
    const noise = Math.sin(seed * 127.1) * 43758.5453;
    const flicker = 0.45 + 0.55 * (noise - Math.floor(noise));
    ctx.save();
    ctx.shadowColor = layer.color;
    ctx.shadowBlur = fontSize * 0.32;
    layout.lines.forEach((line, index) => {
      const lineWidth = ctx.measureText(line).width;
      drawLine(line, alignX(lineWidth), lineY(index), Math.max(0.35, flicker));
    });
    ctx.restore();
  } else if (effect === "echo") {
    const progress = easeOutCubic(Math.min(1, elapsed / duration));
    for (let copy = 2; copy >= 1; copy--) {
      const dy = fontSize * 0.07 * copy * (1 - progress);
      layout.lines.forEach((line, index) => {
        if (!line.trim()) return;
        const lineWidth = ctx.measureText(line).width;
        drawLine(line, alignX(lineWidth), lineY(index) + dy, 0.16 * progress);
      });
    }
    layout.lines.forEach((line, index) => {
      const lineWidth = ctx.measureText(line).width;
      drawLine(line, alignX(lineWidth), lineY(index), 0.55 + 0.45 * progress);
    });
  } else if (effect === "track-tighten") {
    const progress = easeOutCubic(Math.min(1, elapsed / duration));
    setSpacing(`${spacing + (1 - progress) * fontSize * 0.22}px`);
    layout.lines.forEach((line, index) => {
      if (!line.trim()) return;
      const lineWidth = ctx.measureText(line).width;
      drawLine(line, alignX(lineWidth), lineY(index), progress);
    });
  } else if (effect === "gradient-sheen") {
    const progress = Math.min(1, elapsed / duration);
    const span = Math.max(1, layout.widest);
    const center = layout.blockLeft + (progress * 2.2 - 0.6) * span;
    const gradient = ctx.createLinearGradient(
      center - span * 0.4,
      0,
      center + span * 0.4,
      0,
    );
    gradient.addColorStop(0, layer.color);
    gradient.addColorStop(0.5, "#ffffff");
    gradient.addColorStop(1, layer.color);
    ctx.fillStyle = gradient;
    layout.lines.forEach((line, index) => {
      if (!line.trim()) return;
      const lineWidth = ctx.measureText(line).width;
      drawLine(line, alignX(lineWidth), lineY(index));
    });
  }

  ctx.restore();
  setSpacing("");
}

/** Topmost layer under a canvas-space point. */
export function hitTestLayers(
  ctx: CanvasRenderingContext2D,
  layers: TextLayer[],
  width: number,
  height: number,
  px: number,
  py: number,
): TextLayer | null {
  const pad = 12;
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const { bounds } = layoutTextLayer(ctx, layer, width, height);
    if (
      px >= bounds.left - pad &&
      px <= bounds.left + bounds.width + pad &&
      py >= bounds.top - pad &&
      py <= bounds.top + bounds.height + pad
    ) {
      return layer;
    }
  }
  return null;
}
