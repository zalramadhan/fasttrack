import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.");
  process.exit(1);
}

const bucket = process.env.SUPABASE_STORAGE_BUCKET || "media";
const admin = createClient(url, key, { auth: { persistSession: false } });
const root = path.join(process.cwd(), ".tmp", "uploads");

const { data: existing } = await admin.storage.getBucket(bucket);
if (!existing) {
  const { error } = await admin.storage.createBucket(bucket, { public: false });
  if (error && !/already/i.test(error.message)) {
    console.error("Gagal membuat bucket:", error.message);
    process.exit(1);
  }
}

async function readUsage(userId) {
  const { data, error } = await admin.storage
    .from(bucket)
    .download(`users/${userId}/usage.json`);
  if (error || !data) return null;
  try {
    const parsed = JSON.parse(await data.text());
    if (typeof parsed.bytes !== "number" || !parsed.assets) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeUsage(userId, usage) {
  const { error } = await admin.storage
    .from(bucket)
    .upload(`users/${userId}/usage.json`, Buffer.from(JSON.stringify(usage)), {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });
  if (error) throw new Error(error.message);
}

const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
const usageByOwner = new Map();
let migrated = 0;
let failed = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(entry.name)) continue;

  const dir = path.join(root, entry.name);
  const metaPath = path.join(dir, "meta.json");
  const raw = await fs.readFile(metaPath, "utf8").catch(() => null);
  if (!raw) continue;

  let meta;
  try {
    meta = JSON.parse(raw);
  } catch {
    console.warn("Lewati metadata rusak:", metaPath);
    continue;
  }
  if (
    !/^[A-Za-z0-9_-]{6,80}$/.test(meta.id ?? "") ||
    !/^[a-z0-9]{1,8}$/i.test(meta.ext ?? "")
  ) {
    console.warn("Lewati metadata tidak valid:", metaPath);
    continue;
  }

  const filePath = path.join(dir, `file.${meta.ext}`);
  const file = await fs.readFile(filePath).catch(() => null);
  if (!file) {
    console.warn("File tidak ditemukan:", filePath);
    failed += 1;
    continue;
  }

  const [fileResult, metaResult] = await Promise.all([
    admin.storage.from(bucket).upload(`assets/${meta.id}/file.${meta.ext}`, file, {
      contentType: meta.mime || "application/octet-stream",
      upsert: true,
    }),
    admin.storage.from(bucket).upload(
      `assets/${meta.id}/meta.json`,
      Buffer.from(JSON.stringify(meta)),
      { contentType: "application/json", cacheControl: "0", upsert: true },
    ),
  ]);

  if (fileResult.error || metaResult.error) {
    console.error(
      `Gagal migrasi ${meta.id}:`,
      fileResult.error?.message ?? metaResult.error?.message,
    );
    failed += 1;
  } else {
    migrated += 1;
    if (meta.ownerId) {
      const list = usageByOwner.get(meta.ownerId) ?? [];
      list.push(meta);
      usageByOwner.set(meta.ownerId, list);
    }
  }
}

for (const [ownerId, metas] of usageByOwner) {
  try {
    const usage = (await readUsage(ownerId)) ?? {
      bytes: 0,
      assets: {},
      updatedAt: Date.now(),
    };
    for (const meta of metas) {
      if (usage.assets[meta.id] !== undefined) continue;
      usage.assets[meta.id] = meta.size;
      usage.bytes += meta.size;
    }
    usage.updatedAt = Date.now();
    await writeUsage(ownerId, usage);
  } catch (error) {
    console.error(`Gagal menyimpan kuota ${ownerId}:`, error.message);
    failed += 1;
  }
}

console.log(`Media dimigrasikan: ${migrated}, gagal: ${failed}.`);
if (failed > 0) process.exit(1);
