import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { FREE_BITRATE_MBPS, FREE_MAX_SIDE } from "@/lib/server/config";
import { createExportJob } from "@/lib/server/export-job";
import type { ExportClip } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampFreeSize(width: number, height: number) {
  const safeWidth = Math.max(2, Math.round(width));
  const safeHeight = Math.max(2, Math.round(height));
  const scale = Math.min(1, FREE_MAX_SIDE / Math.min(safeWidth, safeHeight));
  return {
    width: Math.max(2, Math.round((safeWidth * scale) / 2) * 2),
    height: Math.max(2, Math.round((safeHeight * scale) / 2) * 2),
  };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }
  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Verifikasi email dulu sebelum export." },
      { status: 403 },
    );
  }

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

    const isPaid = user.plan === "lifetime";
    const requestedWidth = Number(body.width ?? 0);
    const requestedHeight = Number(body.height ?? 0);
    const size = isPaid
      ? { width: requestedWidth, height: requestedHeight }
      : clampFreeSize(requestedWidth, requestedHeight);

    const job = await createExportJob({
      clips,
      transitions,
      musicId: body.musicId ? String(body.musicId) : null,
      fps: Number(body.fps ?? 30),
      width: size.width,
      height: size.height,
      watermark: !isPaid,
      ownerId: user.id,
      sourceVolume: Number(body.sourceVolume ?? 1),
      musicVolume: Number(body.musicVolume ?? 0),
      musicOffset: Number(body.musicOffset ?? 0),
      bitrateMbps: isPaid ? Number(body.bitrateMbps ?? 7) : FREE_BITRATE_MBPS,
    });
    return NextResponse.json({
      ...job,
      plan: user.plan,
      width: size.width,
      height: size.height,
      watermark: !isPaid,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memulai export.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
