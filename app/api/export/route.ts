import { NextResponse } from "next/server";
import { createExportJob } from "@/lib/server/export-job";
import type { ExportClip } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rawClips = Array.isArray(body.clips) ? body.clips : [];
    const clips: ExportClip[] = rawClips.map((item) => {
      const clip = item as Record<string, unknown>;
      return {
        sourceId: String(clip.sourceId ?? ""),
        trimStart: Number(clip.trimStart ?? 0),
        duration: Number(clip.duration ?? 0),
      };
    });

    const transitions = Array.isArray(body.transitions)
      ? body.transitions.map((value) => Number(value ?? 0))
      : [];

    const job = await createExportJob({
      clips,
      transitions,
      musicId: body.musicId ? String(body.musicId) : null,
      fps: Number(body.fps ?? 30),
      width: Number(body.width ?? 0),
      height: Number(body.height ?? 0),
      sourceVolume: Number(body.sourceVolume ?? 1),
      musicVolume: Number(body.musicVolume ?? 0),
      musicOffset: Number(body.musicOffset ?? 0),
      bitrateMbps: Number(body.bitrateMbps ?? 7),
    });
    return NextResponse.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memulai export.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
