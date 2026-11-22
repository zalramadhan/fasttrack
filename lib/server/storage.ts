import { promises as fs } from "node:fs";
import path from "node:path";
import {
  deleteRemoteAsset,
  persistAssetMeta,
  readRemoteUsage,
  removeRemoteUsage,
  restoreAssetFile,
  restoreAssetMeta,
} from "./media-storage";

export const TMP_ROOT = path.join(process.cwd(), ".tmp");
export const UPLOADS_DIR = path.join(TMP_ROOT, "uploads");
export const EXPORTS_DIR = path.join(TMP_ROOT, "exports");

const GB = 1024 * 1024 * 1024;
export const UPLOAD_QUOTA_FREE = 2 * GB;
export const UPLOAD_QUOTA_LIFETIME = 10 * GB;

export function userUploadQuota(plan: "free" | "lifetime") {
  return plan === "lifetime" ? UPLOAD_QUOTA_LIFETIME : UPLOAD_QUOTA_FREE;
}

export type AssetMeta = {
  id: string;
  kind: "video" | "audio";
  name: string;
  mime: string;
  ext: string;
  size: number;
  createdAt: number;
  ownerId?: string;
  pinnedBy?: string;
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
    const remote = await restoreAssetMeta(id);
    if (!remote) return null;
    await ensureDir(assetDir(id));
    await writeJson(path.join(assetDir(id), "meta.json"), remote);
    return remote;
  }
}

export async function assetFilePath(meta: AssetMeta) {
  const target = path.join(assetDir(meta.id), `file.${meta.ext}`);
  try {
    await fs.access(target);
    return target;
  } catch {
    await restoreAssetFile(meta, target);
    return target;
  }
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

export async function pinAsset(id: string, userId: string) {
  const meta = await readAsset(id);
  if (!meta) return null;
  if (meta.ownerId && meta.ownerId !== userId) return null;
  if (meta.pinnedBy && meta.pinnedBy !== userId) return null;
  const next: AssetMeta = { ...meta, ownerId: meta.ownerId ?? userId, pinnedBy: userId };
  await writeJson(path.join(assetDir(id), "meta.json"), next);
  try {
    await persistAssetMeta(next);
  } catch (error) {
    console.error("Gagal menyimpan status media ke storage:", error);
    return null;
  }
  return next;
}

export async function unpinAsset(id: string, userId: string) {
  const meta = await readAsset(id);
  if (!meta || meta.pinnedBy !== userId) return;
  const next: AssetMeta = { ...meta };
  delete next.pinnedBy;
  await writeJson(path.join(assetDir(id), "meta.json"), next);
  await persistAssetMeta(next).catch((error) => {
    console.error("Gagal memperbarui metadata media di storage:", error);
  });
}

/** Opportunistic cleanup so .tmp does not grow unbounded. */
async function directorySize(dir: string): Promise<{ bytes: number; files: number }> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let bytes = 0;
    let files = 0;
    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const nested = await directorySize(target);
          bytes += nested.bytes;
          files += nested.files;
        } else if (entry.isFile()) {
          const stat = await fs.stat(target).catch(() => null);
          if (stat) {
            bytes += stat.size;
            files += 1;
          }
        }
      }),
    );
    return { bytes, files };
  } catch {
    return { bytes: 0, files: 0 };
  }
}

export async function userUploadBytes(userId: string) {
  const remote = await readRemoteUsage(userId);
  if (remote) return remote.bytes;
  try {
    const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    let bytes = 0;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const target = path.join(UPLOADS_DIR, entry.name);
      const meta = await readJson<AssetMeta>(path.join(target, "meta.json"));
      if (meta?.ownerId !== userId) continue;
      bytes += (await directorySize(target)).bytes;
    }
    return bytes;
  } catch {
    return 0;
  }
}

export async function storageUsage() {
  const [uploads, exports] = await Promise.all([
    directorySize(UPLOADS_DIR),
    directorySize(EXPORTS_DIR),
  ]);
  return {
    uploadsBytes: uploads.bytes,
    uploadsFiles: uploads.files,
    exportsBytes: exports.bytes,
    exportsFiles: exports.files,
    totalBytes: uploads.bytes + exports.bytes,
  };
}

export async function cleanupOld(dir: string, maxAgeMs = 6 * 60 * 60 * 1000) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const now = Date.now();
    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory()) return;
        const target = path.join(dir, entry.name);
        let meta: AssetMeta | null = null;
        if (dir === UPLOADS_DIR) {
          meta = await readJson<AssetMeta>(path.join(target, "meta.json"));
          if (meta?.pinnedBy) return;
        }
        const stat = await fs.stat(target).catch(() => null);
        if (stat && now - stat.mtimeMs > maxAgeMs) {
          if (meta) {
            const deleted = await deleteRemoteAsset(meta);
            if (!deleted) {
              console.error("[cleanup] gagal menghapus media remote", meta.id);
              return;
            }
            await removeRemoteUsage(meta).catch((error) => {
              console.error("[cleanup] gagal memperbarui kuota media", error);
            });
          }
          await fs.rm(target, { recursive: true, force: true }).catch(() => {});
        }
      }),
    );
  } catch {
    // ignore
  }
}
