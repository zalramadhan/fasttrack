import { openAsBlob, promises as fs } from "node:fs";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AssetMeta } from "./storage";

export const MEDIA_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";

let bucketReady = false;

export async function ensureMediaBucket() {
  if (bucketReady) return;
  const admin = createAdminClient();
  const { data } = await admin.storage.getBucket(MEDIA_BUCKET);
  if (!data) {
    const { error } = await admin.storage.createBucket(MEDIA_BUCKET, {
      public: false,
    });
    if (error && !/already/i.test(error.message)) throw error;
  }
  bucketReady = true;
}

function safeExt(meta: AssetMeta) {
  return /^[a-z0-9]{1,8}$/i.test(meta.ext) ? meta.ext : "mp4";
}

export function assetStoragePath(meta: AssetMeta) {
  return `assets/${meta.id}/file.${safeExt(meta)}`;
}

export function assetMetaStoragePath(id: string) {
  return `assets/${id}/meta.json`;
}

export type UsageManifest = {
  bytes: number;
  assets: Record<string, number>;
  updatedAt: number;
};

function usageStoragePath(userId: string) {
  return `users/${userId}/usage.json`;
}

export async function readRemoteUsage(userId: string): Promise<UsageManifest | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(MEDIA_BUCKET)
      .download(usageStoragePath(userId));
    if (error || !data) return null;
    const parsed = JSON.parse(await data.text()) as Partial<UsageManifest>;
    if (typeof parsed.bytes !== "number" || !parsed.assets) return null;
    return {
      bytes: parsed.bytes,
      assets: parsed.assets as Record<string, number>,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function writeRemoteUsage(userId: string, usage: UsageManifest) {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(usageStoragePath(userId), Buffer.from(JSON.stringify(usage)), {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });
  if (error) throw new Error(`Gagal menyimpan kuota media: ${error.message}`);
}

const usageLocks = new Map<string, Promise<void>>();

function withUsageLock(userId: string, task: () => Promise<void>) {
  const previous = usageLocks.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  usageLocks.set(userId, next);
  return next.finally(() => {
    if (usageLocks.get(userId) === next) usageLocks.delete(userId);
  });
}

/** Add an asset to the durable per-user quota manifest exactly once. */
export async function recordRemoteUsage(meta: AssetMeta) {
  if (!meta.ownerId) return;
  const userId = meta.ownerId;
  await withUsageLock(userId, async () => {
    const usage = (await readRemoteUsage(userId)) ?? {
      bytes: 0,
      assets: {},
      updatedAt: Date.now(),
    };
    if (usage.assets[meta.id] !== undefined) return;
    usage.assets[meta.id] = meta.size;
    usage.bytes += meta.size;
    usage.updatedAt = Date.now();
    await writeRemoteUsage(userId, usage);
  });
}

export async function removeRemoteUsage(meta: AssetMeta) {
  if (!meta.ownerId) return;
  const userId = meta.ownerId;
  await withUsageLock(userId, async () => {
    const usage = await readRemoteUsage(userId);
    const size = usage?.assets[meta.id];
    if (!usage || size === undefined) return;
    delete usage.assets[meta.id];
    usage.bytes = Math.max(0, usage.bytes - size);
    usage.updatedAt = Date.now();
    await writeRemoteUsage(userId, usage);
  });
}

export async function persistAsset(meta: AssetMeta, filePath: string) {
  await ensureMediaBucket();
  const admin = createAdminClient();
  const file = await openAsBlob(/* turbopackIgnore: true */ filePath, { type: meta.mime });

  const { error: fileError } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(assetStoragePath(meta), file, {
      contentType: meta.mime,
      upsert: true,
    });
  if (fileError) {
    throw new Error(`Gagal menyimpan media ke storage: ${fileError.message}`);
  }

  await persistAssetMeta(meta);
  await recordRemoteUsage(meta);
}

export async function persistAssetMeta(meta: AssetMeta) {
  await ensureMediaBucket();
  const admin = createAdminClient();
  const body = Buffer.from(JSON.stringify(meta));
  const { error } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(assetMetaStoragePath(meta.id), body, {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });
  if (error) {
    throw new Error(`Gagal menyimpan metadata media: ${error.message}`);
  }
}

export async function restoreAssetMeta(id: string): Promise<AssetMeta | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(MEDIA_BUCKET)
      .download(assetMetaStoragePath(id));
    if (error || !data) return null;
    return JSON.parse(await data.text()) as AssetMeta;
  } catch {
    return null;
  }
}

export async function restoreAssetFile(meta: AssetMeta, targetPath: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(MEDIA_BUCKET)
      .download(assetStoragePath(meta));
    if (error || !data) return false;
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, Buffer.from(await data.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

export async function deleteRemoteAsset(meta: AssetMeta) {
  try {
    await ensureMediaBucket();
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(MEDIA_BUCKET)
      .remove([assetStoragePath(meta), assetMetaStoragePath(meta.id)]);
    return !error;
  } catch {
    return false;
  }
}
