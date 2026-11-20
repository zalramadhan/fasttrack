import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { downloadVideo } from "@/lib/server/ytdlp";
import { downloadThreadsVideo, isThreadsUrl } from "@/lib/server/threads";
import {
  UPLOADS_DIR,
  assetDir,
  cleanupOld,
  ensureDir,
  mimeForExt,
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
  let url = "";
  try {
    const body = (await req.json()) as { url?: string };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL tidak valid." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Hanya URL http/https yang didukung." }, { status: 400 });
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

    const stat = await fs.stat(file);

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
    const message = error instanceof Error ? error.message : "Gagal mengambil video dari link.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
