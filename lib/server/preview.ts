import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { assetDir, assetFilePath, type AssetMeta } from "./storage";

export type PreviewQuality = "half" | "quarter";

const SHORT_SIDE: Record<PreviewQuality, number> = {
  half: 540,
  quarter: 360,
};

const MAX_JOBS = 2;
const jobs = new Map<string, Promise<void>>();
const errors = new Map<string, { message: string; at: number }>();
const waiting: Array<() => void> = [];
let active = 0;

function jobKey(meta: AssetMeta, quality: PreviewQuality) {
  return `${meta.id}:${quality}`;
}

export function previewFilePath(meta: AssetMeta, quality: PreviewQuality) {
  return path.join(assetDir(meta.id), `preview-${quality}.mp4`);
}

export function previewUrl(meta: AssetMeta, quality: PreviewQuality) {
  return `/api/media/${meta.id}/proxy/${quality}`;
}

async function exists(file: string) {
  try {
    const stat = await fs.stat(file);
    return stat.size > 0;
  } catch {
    return false;
  }
}

async function acquire() {
  if (active < MAX_JOBS) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  active += 1;
}

function release() {
  active -= 1;
  const next = waiting.shift();
  next?.();
}

async function withSlot<T>(task: () => Promise<T>) {
  await acquire();
  try {
    return await task();
  } finally {
    release();
  }
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 12_000) stderr = stderr.slice(-12_000);
    });

    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("ffmpeg tidak ditemukan di PATH."));
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const tail = stderr.trim().split("\n").slice(-4).join(" ");
      reject(new Error(`ffmpeg gagal (exit ${code})${tail ? `: ${tail}` : ""}`));
    });
  });
}

async function transcode(
  meta: AssetMeta,
  quality: PreviewQuality,
  target: string,
) {
  const source = await assetFilePath(meta);
  const short = SHORT_SIDE[quality];
  const crf = quality === "quarter" ? 32 : 30;
  // Keep the short side at 540/360 and the other side proportional/even.
  const filter = `scale=if(gt(iw\\,ih)\\,-2\\,${short}):if(gt(iw\\,ih)\\,${short}\\,-2)`;
  const temp = `${target}.${process.pid}.${Date.now()}.tmp.mp4`;

  await fs.mkdir(path.dirname(target), { recursive: true });
  try {
    await runFfmpeg([
      "-y",
      "-hide_banner",
      "-nostdin",
      "-loglevel",
      "error",
      "-i",
      source,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      String(crf),
      "-tune",
      "fastdecode",
      "-g",
      "30",
      "-keyint_min",
      "30",
      "-sc_threshold",
      "0",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      "-sn",
      "-dn",
      "-threads",
      "2",
      temp,
    ]);
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

async function ensurePreview(meta: AssetMeta, quality: PreviewQuality) {
  const target = previewFilePath(meta, quality);
  if (await exists(target)) return target;

  const key = jobKey(meta, quality);
  const running = jobs.get(key);
  if (running) {
    await running;
    return target;
  }

  errors.delete(key);
  const job = withSlot(() => transcode(meta, quality, target))
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Gagal membuat preview.";
      errors.set(key, { message, at: Date.now() });
      throw error;
    })
    .finally(() => {
      jobs.delete(key);
    });

  jobs.set(key, job);
  await job;
  return target;
}

export function startPreview(meta: AssetMeta, quality: PreviewQuality) {
  const key = jobKey(meta, quality);
  if (jobs.has(key)) return;
  void ensurePreview(meta, quality).catch(() => {});
}

export async function getPreviewState(meta: AssetMeta, quality: PreviewQuality) {
  const target = previewFilePath(meta, quality);
  if (await exists(target)) {
    return { status: "ready" as const, url: previewUrl(meta, quality) };
  }

  const key = jobKey(meta, quality);
  if (jobs.has(key)) return { status: "working" as const };

  const failure = errors.get(key);
  if (failure) {
    if (Date.now() - failure.at < 60_000) {
      return { status: "error" as const, error: failure.message };
    }
    errors.delete(key);
  }

  return { status: "idle" as const };
}
