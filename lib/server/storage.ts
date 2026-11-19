import { promises as fs } from "node:fs";
import path from "node:path";

export const TMP_ROOT = path.join(process.cwd(), ".tmp");
export const UPLOADS_DIR = path.join(TMP_ROOT, "uploads");
export const EXPORTS_DIR = path.join(TMP_ROOT, "exports");

export type AssetMeta = {
  id: string;
  kind: "video" | "audio";
  name: string;
  mime: string;
  ext: string;
  size: number;
  createdAt: number;
};

export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
  "video/x-matroska": "mkv",
};

export const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

export function isSafeId(id: string) {
  return /^[A-Za-z0-9_-]{6,80}$/.test(id);
}

export function mimeForExt(ext: string) {
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function assetDir(id: string) {
  return path.join(UPLOADS_DIR, id);
}

export async function readAsset(id: string): Promise<AssetMeta | null> {
  if (!isSafeId(id)) return null;
  try {
    const raw = await fs.readFile(path.join(assetDir(id), "meta.json"), "utf8");
    return JSON.parse(raw) as AssetMeta;
  } catch {
    return null;
  }
}

export async function assetFilePath(meta: AssetMeta) {
  return path.join(assetDir(meta.id), `file.${meta.ext}`);
}

export async function writeJson(file: string, value: unknown) {
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

export async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Opportunistic cleanup so .tmp does not grow unbounded. */
export async function cleanupOld(dir: string, maxAgeMs = 6 * 60 * 60 * 1000) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const now = Date.now();
    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory()) return;
        const target = path.join(dir, entry.name);
        const stat = await fs.stat(target).catch(() => null);
        if (stat && now - stat.mtimeMs > maxAgeMs) {
          await fs.rm(target, { recursive: true, force: true }).catch(() => {});
        }
      }),
    );
  } catch {
    // ignore
  }
}
