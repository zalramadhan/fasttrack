import { drawFrame, drawLayers } from "./render";
import { ensureLayerFonts } from "./fonts";
import { TransitionCompositor } from "./transition-compositor";
import {
  buildTimeline,
  timelineDuration,
  timelineIndexAt,
  transitionAt,
  type Clip,
  type MediaAsset,
  type TextLayer,
  type VideoFrame,
} from "./types";

export type ExportProgressUpdate = {
  stage: "preparing" | "frames" | "encoding" | "done";
  frame: number;
  totalFrames: number;
  encode: number;
  message?: string;
};

export type ExportArgs = {
  clips: Clip[];
  music: MediaAsset | null;
  layers: TextLayer[];
  width: number;
  height: number;
  fps: number;
  sourceVolume: number;
  musicVolume: number;
  musicOffset: number;
  bitrateMbps: number;
  videoFrame: VideoFrame;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal merender frame."))),
      "image/jpeg",
      quality,
    );
  });
}

async function loadVideo(url: string) {
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("Gagal memuat video sumber."));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", ok);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("loadeddata", ok);
    video.addEventListener("error", fail);
    video.load();
  });
  return video;
}

function waitForFrame(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    const rvfc = (
      video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      }
    ).requestVideoFrameCallback;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    if (rvfc) rvfc.call(video, finish);
    setTimeout(finish, 120);
  });
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  const target = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.001));
  if (Math.abs(video.currentTime - target) < 0.002) {
    await waitForFrame(video);
    return;
  }
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener("seeked", finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, 800);
    video.addEventListener("seeked", finish);
    video.currentTime = target;
  });
  await waitForFrame(video);
}

async function readError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function exportVideo(
  args: ExportArgs,
  onProgress: (update: ExportProgressUpdate) => void,
  signal: AbortSignal,
): Promise<{ downloadUrl: string; fileName: string; jobId: string }> {
  const { width, height, fps } = args;
  const timeline = buildTimeline(args.clips);
  const totalDuration = timelineDuration(timeline);
  const totalFrames = Math.round(totalDuration * fps);

  if (!timeline.length) throw new Error("Tambahkan video dulu.");

  onProgress({ stage: "preparing", frame: 0, totalFrames, encode: 0 });

  await Promise.all(
    args.layers.map((layer) => ensureLayerFonts(layer.fontFamily, layer.fontWeight)),
  );
  if (signal.aborted) throw new DOMException("Dibatalkan", "AbortError");

  const videos = await Promise.all(timeline.map((item) => loadVideo(item.clip.asset.url)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");
  const compositor = new TransitionCompositor();

  const createRes = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clips: timeline.map((item) => ({
        sourceId: item.clip.asset.id,
        trimStart: item.clip.trimStart,
        duration: item.length,
      })),
      transitions: timeline.slice(1).map((item) => item.transitionIn),
      musicId: args.music?.id ?? null,
      fps,
      width,
      height,
      sourceVolume: args.sourceVolume,
      musicVolume: args.musicVolume,
      musicOffset: args.musicOffset,
      bitrateMbps: args.bitrateMbps,
    }),
    signal,
  });

  if (!createRes.ok) throw new Error(await readError(createRes));
  const job = (await createRes.json()) as { id: string; totalFrames: number };

  const cleanup = async () => {
    videos.forEach((video) => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
    await fetch(`/api/export/${job.id}`, { method: "DELETE" }).catch(() => {});
  };

  try {
    for (let index = 0; index < totalFrames; index++) {
      if (signal.aborted) throw new DOMException("Dibatalkan", "AbortError");

      const time = index / fps;
      const itemIndex = timelineIndexAt(timeline, time);
      const item = timeline[itemIndex];
      const local = Math.min(Math.max(0, time - item.offset), item.length - 0.001);
      const video = videos[itemIndex];
      const transition = transitionAt(timeline, time);

      await seekVideo(video, item.clip.trimStart + local);

      if (transition) {
        const incomingIndex = transition.to.index;
        const incoming = videos[incomingIndex];
        const incomingLocal = Math.min(
          Math.max(0, time - transition.to.offset),
          transition.to.length - 0.001,
        );
        await seekVideo(incoming, transition.to.clip.trimStart + incomingLocal);
        compositor.draw(ctx, width, height, {
          from: video,
          to: incoming,
          videoFrame: args.videoFrame,
          type: transition.to.clip.transition.type,
          progress: transition.progress,
        });
        drawLayers(ctx, args.layers, width, height, time, false);
      } else {
        drawFrame(ctx, {
          width,
          height,
          video,
          layers: args.layers,
          time,
          videoFrame: args.videoFrame,
        });
      }

      const blob = await canvasToBlob(canvas, 0.92);
      const res = await fetch(`/api/export/${job.id}/frame?index=${index}`, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
        signal,
      });
      if (!res.ok) throw new Error(await readError(res));

      onProgress({
        stage: "frames",
        frame: index + 1,
        totalFrames,
        encode: 0,
      });
    }

    onProgress({ stage: "encoding", frame: totalFrames, totalFrames, encode: 0 });

    const finishRes = await fetch(`/api/export/${job.id}/finish`, {
      method: "POST",
      signal,
    });
    if (!finishRes.ok) throw new Error(await readError(finishRes));

    const startedAt = Date.now();
    while (true) {
      if (signal.aborted) throw new DOMException("Dibatalkan", "AbortError");
      if (Date.now() - startedAt > 15 * 60 * 1000) {
        throw new Error("Encoding terlalu lama. Coba durasi atau resolusi lebih kecil.");
      }
      await sleep(500);
      const res = await fetch(`/api/export/${job.id}`, {
        cache: "no-store",
        signal,
      });
      if (!res.ok) throw new Error(await readError(res));
      const status = (await res.json()) as {
        status: string;
        progress: number;
        error?: string;
        fileName?: string;
      };

      if (status.status === "error") throw new Error(status.error ?? "Encoding gagal.");
      if (status.status === "done") {
        onProgress({ stage: "done", frame: totalFrames, totalFrames, encode: 1 });
        return {
          downloadUrl: `/api/export/${job.id}/file`,
          fileName: status.fileName ?? "fasttrack.mp4",
          jobId: job.id,
        };
      }
      onProgress({
        stage: "encoding",
        frame: totalFrames,
        totalFrames,
        encode: status.progress ?? 0,
      });
    }
  } catch (error) {
    await cleanup();
    throw error;
  } finally {
    compositor.dispose();
    videos.forEach((video) => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
  }
}
