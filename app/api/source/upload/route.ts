import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { startPreview } from "@/lib/server/preview";
import {
  AUDIO_TYPES,
  UPLOADS_DIR,
  VIDEO_TYPES,
  assetDir,
  cleanupOld,
  ensureDir,
  writeJson,
  type AssetMeta,
} from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VIDEO = 400 * 1024 * 1024;
const MAX_AUDIO = 40 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = form.get("kind");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }
    if (kind !== "video" && kind !== "audio") {
      return NextResponse.json({ error: "Jenis file tidak valid." }, { status: 400 });
    }

    const typeMap = kind === "video" ? VIDEO_TYPES : AUDIO_TYPES;
    let ext = typeMap[file.type];
    if (!ext) {
      const fromName = path.extname(file.name).slice(1).toLowerCase();
      if (typeMap[Object.keys(typeMap).find((key) => key.endsWith(`/${fromName}`)) ?? ""]) {
        ext = fromName;
      }
    }
    if (!ext) {
      return NextResponse.json(
        {
          error:
            kind === "video"
              ? "Format video tidak didukung. Pakai MP4, MOV, WEBM, M4V, atau MKV."
              : "Format audio tidak didukung. Pakai MP3, WAV, M4A, AAC, OGG, atau FLAC.",
        },
        { status: 415 },
      );
    }

    const limit = kind === "video" ? MAX_VIDEO : MAX_AUDIO;
    if (file.size > limit) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${Math.round(limit / 1024 / 1024)} MB.` },
        { status: 413 },
      );
    }

    const id = crypto.randomUUID();
    const dir = assetDir(id);
    await ensureDir(dir);

    const target = path.join(dir, `file.${ext}`);
    const stream = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]);
    await pipeline(stream, createWriteStream(target));

    const meta: AssetMeta = {
      id,
      kind,
      name: file.name || `file.${ext}`,
      mime: file.type || (kind === "video" ? "video/mp4" : "audio/mpeg"),
      ext,
      size: file.size,
      createdAt: Date.now(),
      ownerId: user.id,
    };
    await writeJson(path.join(dir, "meta.json"), meta);

    void cleanupOld(UPLOADS_DIR);
    if (kind === "video" && file.size > 20 * 1024 * 1024) {
      // Warm the half-resolution proxy while the user starts editing.
      startPreview(meta, "half");
    }

    return NextResponse.json({
      asset: {
        id,
        url: `/api/media/${id}`,
        name: meta.name,
        kind: meta.kind,
      },
    });
  } catch (error) {
    console.error("[upload]", error);
    return NextResponse.json({ error: "Gagal menyimpan file." }, { status: 500 });
  }
}

