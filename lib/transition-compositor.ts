import { drawVideoScene } from "./render";
import { TransitionRenderer } from "./transition-renderer";
import { getTransition } from "./transitions";
import type { VideoFrame } from "./types";

export type CompositeInput = {
  from: HTMLVideoElement | null;
  to: HTMLVideoElement | null;
  videoFrame?: VideoFrame;
  type: string;
  progress: number;
};

/**
 * Composites the outgoing and incoming clip with one of the clipframes
 * shaders. Both clips are drawn (framed, without text) into scratch canvases
 * first, so a transition works for preview and frame-by-frame export alike.
 */
export class TransitionCompositor {
  private renderer: TransitionRenderer | null = null;
  private webgl: HTMLCanvasElement | null = null;
  private fromCanvas: HTMLCanvasElement;
  private toCanvas: HTMLCanvasElement;
  private fromCtx: CanvasRenderingContext2D | null;
  private toCtx: CanvasRenderingContext2D | null;
  private activeType: string | null = null;
  private failed = false;

  constructor() {
    this.fromCanvas = document.createElement("canvas");
    this.toCanvas = document.createElement("canvas");
    this.fromCtx = this.fromCanvas.getContext("2d", { alpha: false });
    this.toCtx = this.toCanvas.getContext("2d", { alpha: false });
  }

  draw(
    target: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: CompositeInput,
  ): boolean {
    const progress = Math.min(1, Math.max(0, input.progress));

    if (this.failed || !this.fromCtx || !this.toCtx) {
      this.crossfade(target, width, height, input, progress);
      return false;
    }

    try {
      if (!this.renderer) {
        this.webgl = document.createElement("canvas");
        this.renderer = new TransitionRenderer(this.webgl);
      }

      if (this.activeType !== input.type) {
        this.renderer.setEffect(getTransition(input.type));
        this.activeType = input.type;
      }

      this.renderer.setSize(width, height);
      if (this.fromCanvas.width !== Math.round(width)) {
        this.fromCanvas.width = Math.round(width);
      }
      if (this.fromCanvas.height !== Math.round(height)) {
        this.fromCanvas.height = Math.round(height);
      }
      if (this.toCanvas.width !== Math.round(width)) this.toCanvas.width = Math.round(width);
      if (this.toCanvas.height !== Math.round(height)) this.toCanvas.height = Math.round(height);

      drawVideoScene(this.fromCtx, input.from, width, height, input.videoFrame);
      drawVideoScene(this.toCtx, input.to, width, height, input.videoFrame);

      this.renderer.render(this.fromCanvas, this.toCanvas, progress, 0.7);
      if (!this.webgl) return false;
      target.save();
      target.drawImage(this.webgl, 0, 0, width, height);
      target.restore();
      return true;
    } catch (error) {
      console.warn("Transition WebGL gagal, memakai crossfade.", error);
      this.failed = true;
      this.renderer?.dispose();
      this.renderer = null;
      this.crossfade(target, width, height, input, progress);
      return false;
    }
  }

  private crossfade(
    target: CanvasRenderingContext2D,
    width: number,
    height: number,
    input: CompositeInput,
    progress: number,
  ) {
    drawVideoScene(target, input.from, width, height, input.videoFrame);
    if (!this.toCtx) return;
    if (this.toCanvas.width !== Math.round(width)) this.toCanvas.width = Math.round(width);
    if (this.toCanvas.height !== Math.round(height)) this.toCanvas.height = Math.round(height);
    drawVideoScene(this.toCtx, input.to, width, height, input.videoFrame);
    target.save();
    target.globalAlpha = progress;
    target.drawImage(this.toCanvas, 0, 0, width, height);
    target.restore();
  }

  dispose() {
    this.renderer?.dispose();
    this.renderer = null;
    this.webgl = null;
  }
}
