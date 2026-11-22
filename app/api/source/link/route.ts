import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { consumeRateLimit } from "@/lib/server/db";
import { LINK_IP_LIMIT, LINK_USER_LIMIT, LINK_WINDOW_MS, clientIp, tooManyRequests } from "@/lib/server/rate-limit";
import { downloadVideo } from "@/lib/server/ytdlp";
import {
  deleteRemoteAsset,
  persistAsset,
  removeRemoteUsage,
} from "@/lib/server/media-storage";
import { downloadThreadsVideo, isThreadsUrl } from "@/lib/server/threads";
import { assertSafeSourceUrl } from "@/lib/server/url-safety";
import {
  UPLOADS_DIR,
  assetDir,
  cleanupOld,
  ensureDir,
  mimeForExt,
  userUploadBytes,
  userUploadQuota,
  writeJson,
  type AssetMeta,
} from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const retryAfter = Math.max(
    await consumeRateLimit(`link:user:${user.id}`, LINK_USER_LIMIT, LINK_WINDOW_MS),
    await consumeRateLimit(`link:ip:${clientIp(req)}`, LINK_IP_LIMIT, LINK_WINDOW_MS),
  );
  if (retryAfter) return tooManyRequests(retryAfter);

  let url = "";
  try {
    const body = (await req.json()) as { url?: string };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = await assertSafeSourceUrl(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "URL tidak valid." },
      { status: 400 },
    );
  }

  await cleanupOld(UPLOADS_DIR);
  if ((await userUploadBytes(user.id)) >= userUploadQuota(user.plan)) {
    return NextResponse.json(
      { error: "Kuota media akunmu sudah penuh. Hapus project lama dulu." },
      { status: 413 },
    );
  }

  const id = crypto.randomUUID();
  const dir = assetDir(id);

  try {
    await ensureDir(dir);
    let file = "";
    let ext = "mp4";

    if (isThreadsUrl(parsed.toString())) {
      try {
        const result = await downloadThreadsVideo(parsed.toString(), dir);
        file = result.file;
        ext = result.ext;
      } catch (threadsError) {
        try {
          const fallback = await downloadVideo(parsed.toString(), dir);
          file = fallback.file;
          ext = fallback.ext;
        } catch {
          throw threadsError;
        }
      }
    } else {
      const result = await downloadVideo(parsed.toString(), dir);
      file = result.file;
      ext = result.ext;
    }

    const stat = await fs.stat(/* turbopackIgnore: true */ file);
    if ((await userUploadBytes(user.id)) + stat.size > userUploadQuota(user.plan)) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
      return NextResponse.json(
        { error: "Kuota media akunmu tidak cukup untuk video ini." },
        { status: 413 },
      );
    }

    const meta: AssetMeta = {
      id,
      kind: "video",
      name: path.basename(file),
      mime: mimeForExt(ext),
      ext,
      size: stat.size,
      createdAt: Date.now(),
      ownerId: user.id,
    };
    await writeJson(path.join(dir, "meta.json"), meta);
    try {
      await persistAsset(meta, file);
    } catch (storageError) {
      console.error("[source/link/storage]", storageError);
      if (await deleteRemoteAsset(meta)) {
        await removeRemoteUsage(meta).catch(() => {});
      }
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
      return NextResponse.json(
        { error: "Gagal menyimpan video ke penyimpanan permanen." },
        { status: 503 },
      );
    }
    void cleanupOld(UPLOADS_DIR);

    return NextResponse.json({
      asset: {
        id,
        url: `/api/media/${id}`,
        name: meta.name,
        kind: meta.kind,
      },
    });
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    const detail = error instanceof Error ? error.message : "";
    console.error("[source/link]", detail || error);
    // yt-dlp errors can contain internal paths and request details. Only our
    // own user-facing Threads messages are safe to return.
    const safe =
      detail.startsWith("Video Threads") ||
      detail.startsWith("File video Threads") ||
      detail.startsWith("Gagal mengunduh video Threads") ||
      detail.startsWith("Butuh Chromium")
        ? detail
        : "Gagal mengambil video dari link.";
    return NextResponse.json({ error: safe }, { status: 502 });
  }
}
