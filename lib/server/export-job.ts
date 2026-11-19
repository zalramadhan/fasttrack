import { promises as fs } from "node:fs";
import path from "node:path";
import { assertMediaFile, runExport, type AudioClip } from "./ffmpeg";
import {
  EXPORTS_DIR,
  assetFilePath,
  cleanupOld,
  ensureDir,
  isSafeId,
  readAsset,
  readJson,
  writeJson,
} from "./storage";
import type { ExportClip } from "@/lib/types";

export type StoredExportConfig = {
  clips: ExportClip[];
  transitions: number[];
  musicId: string | null;
  duration: number;
  fps: number;
  width: number;
  height: number;
  sourceVolume: number;
  musicVolume: number;
  musicOffset: number;
  bitrateMbps: number;
  totalFrames: number;
  fileName: string;
};

export type StoredStatus = {
  status: "receiving" | "encoding" | "done" | "error";
  framesWritten: number;
  totalFrames: number;
  progress: number;
  error?: string;
  fileName?: string;
  updatedAt: number;
};

export function exportDir(id: string) {
  return path.join(EXPORTS_DIR, id);
}

async function readConfig(id: string) {
  if (!isSafeId(id)) return null;
  return readJson<StoredExportConfig>(path.join(exportDir(id), "config.json"));
}

async function readStatus(id: string) {
  if (!isSafeId(id)) return null;
  return readJson<StoredStatus>(path.join(exportDir(id), "status.json"));
}

async function writeStatus(id: string, status: StoredStatus) {
  status.updatedAt = Date.now();
  await writeJson(path.join(exportDir(id), "status.json"), status);
}

export async function createExportJob(input: {
  clips: ExportClip[];
  transitions?: number[];
  musicId: string | null;
  fps: number;
  width: number;
  height: number;
  sourceVolume: number;
  musicVolume: number;
  musicOffset: number;
  bitrateMbps: number;
}) {
  if (!Array.isArray(input.clips) || input.clips.length === 0) {
    throw new Error("Tidak ada video untuk diexport.");
  }
  if (input.clips.length > 6) throw new Error("Maksimal 6 video per export.");

  const clips: ExportClip[] = [];
  for (const clip of input.clips) {
    const source = await readAsset(clip.sourceId);
    if (!source || source.kind !== "video") {
      throw new Error("Salah satu video sumber tidak ditemukan, upload ulang.");
    }
    const duration = Math.min(180, Number(clip.duration));
    if (!Number.isFinite(duration) || duration < 0.1) {
      throw new Error("Durasi klip tidak valid.");
    }
    clips.push({
      sourceId: clip.sourceId,
      trimStart: Math.max(0, Number(clip.trimStart) || 0),
      duration,
    });
  }

  const rawDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
  const transitions = clips.slice(1).map((_, index) => {
    const raw = Number(input.transitions?.[index] ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    const limit = Math.min(clips[index].duration, clips[index + 1].duration) / 2;
    return Math.max(0, Math.round(Math.min(1.5, raw, limit) * 1000) / 1000);
  });
  const totalDuration = rawDuration - transitions.reduce((sum, value) => sum + value, 0);
  if (totalDuration < 0.4) throw new Error("Durasi total terlalu pendek.");
  if (rawDuration > 180) throw new Error("Durasi total maksimal 180 detik.");

  if (input.musicId) {
    const music = await readAsset(input.musicId);
    if (!music || music.kind !== "audio") throw new Error("File musik tidak ditemukan.");
  }

  const fps = input.fps === 24 ? 24 : 30;
  const width = Math.round(input.width);
  const height = Math.round(input.height);
  if (width < 240 || height < 240 || width > 1920 || height > 1920) {
    throw new Error("Resolusi export tidak valid.");
  }
  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new Error("Resolusi export harus genap.");
  }

  const totalFrames = Math.round(totalDuration * fps);
  if (totalFrames < 1 || totalFrames > 6000) throw new Error("Durasi export tidak valid.");

  const id = crypto.randomUUID();
  const dir = exportDir(id);
  await ensureDir(dir);

  const config: StoredExportConfig = {
    clips,
    transitions,
    musicId: input.musicId,
    duration: totalDuration,
    fps,
    width,
    height,
    sourceVolume: Math.min(1, Math.max(0, input.sourceVolume)),
    musicVolume: Math.min(1, Math.max(0, input.musicVolume)),
    musicOffset: Math.max(0, input.musicOffset),
    bitrateMbps: input.bitrateMbps >= 12 ? 12 : 7,
    totalFrames,
    fileName: `fasttrack-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.mp4`,
  };

  await writeJson(path.join(dir, "config.json"), config);
  await fs.writeFile(path.join(dir, "frames.mjpeg"), "");
  await writeStatus(id, {
    status: "receiving",
    framesWritten: 0,
    totalFrames,
    progress: 0,
    updatedAt: Date.now(),
  });

  void cleanupOld(EXPORTS_DIR, 3 * 60 * 60 * 1000);
  return { id, totalFrames };
}

const writeQueues = new Map<string, Promise<unknown>>();

export function appendFrame(id: string, index: number, data: Buffer) {
  const previous = writeQueues.get(id) ?? Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(async () => {
      const config = await readConfig(id);
      const status = await readStatus(id);
      if (!config || !status) throw new Error("Export tidak ditemukan.");
      if (status.status !== "receiving") throw new Error("Export sudah diproses.");
      if (index !== status.framesWritten) {
        throw new Error(`Urutan frame tidak sesuai (diharapkan ${status.framesWritten}).`);
      }
      if (!data.length) throw new Error("Frame kosong.");
      await fs.appendFile(path.join(exportDir(id), "frames.mjpeg"), data);
      status.framesWritten += 1;
      await writeStatus(id, status);
      return status.framesWritten;
    });

  writeQueues.set(
    id,
    task.catch(() => {}),
  );
  return task;
}

export async function startEncoding(id: string) {
  const config = await readConfig(id);
  const status = await readStatus(id);
  if (!config || !status) throw new Error("Export tidak ditemukan.");
  if (status.status !== "receiving") throw new Error("Export sudah diproses.");
  if (status.framesWritten !== config.totalFrames) {
    throw new Error(`Frame belum lengkap (${status.framesWritten}/${config.totalFrames}).`);
  }

  const audioClips: AudioClip[] = [];
  for (const clip of config.clips) {
    const asset = await readAsset(clip.sourceId);
    if (!asset) throw new Error("Video sumber hilang, upload ulang.");
    const clipPath = await assetFilePath(asset);
    await assertMediaFile(clipPath);
    audioClips.push({ path: clipPath, trimStart: clip.trimStart, duration: clip.duration });
  }

  const music = config.musicId ? await readAsset(config.musicId) : null;
  const musicPath = music ? await assetFilePath(music) : null;
  if (musicPath) await assertMediaFile(musicPath);

  const framesPath = path.join(exportDir(id), "frames.mjpeg");
  const outputPath = path.join(exportDir(id), config.fileName);

  status.status = "encoding";
  status.progress = 0;
  status.fileName = config.fileName;
  await writeStatus(id, status);

  let lastWrite = 0;
  runExport(
    {
      clips: audioClips,
      transitions: config.transitions,
      musicPath,
      framesPath,
      outputPath,
      duration: config.duration,
      fps: config.fps,
      sourceVolume: config.sourceVolume,
      musicVolume: config.musicVolume,
      musicOffset: config.musicOffset,
      bitrateMbps: config.bitrateMbps,
    },
    (ratio) => {
      const now = Date.now();
      if (now - lastWrite < 400) return;
      lastWrite = now;
      status.progress = ratio;
      void writeStatus(id, status);
    },
    (error) => {
      if (error) {
        status.status = "error";
        status.error = error.message;
        void writeStatus(id, status);
        return;
      }
      status.status = "done";
      status.progress = 1;
      void writeStatus(id, status);
      void fs.rm(framesPath, { force: true }).catch(() => {});
    },
  );

  return { ok: true };
}

export async function getExportStatus(id: string) {
  return readStatus(id);
}

export async function getExportConfig(id: string) {
  return readConfig(id);
}

export async function removeExport(id: string) {
  if (!isSafeId(id)) return;
  await fs.rm(exportDir(id), { recursive: true, force: true }).catch(() => {});
}
