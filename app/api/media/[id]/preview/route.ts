import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import {
  getPreviewState,
  startPreview,
  type PreviewQuality,
} from "@/lib/server/preview";
import { readAsset } from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseQuality(value: string | null): PreviewQuality | null {
  return value === "half" || value === "quarter" ? value : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const meta = await readAsset(id);
  if (!meta || (meta.ownerId && meta.ownerId !== user.id)) {
    return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
  }
  if (meta.kind !== "video") {
    return NextResponse.json({ error: "Proxy hanya untuk video." }, { status: 400 });
  }

  const quality = parseQuality(new URL(req.url).searchParams.get("quality"));
  if (!quality) {
    return NextResponse.json({ error: "Kualitas preview tidak valid." }, { status: 400 });
  }

  const state = await getPreviewState(meta, quality);
  if (state.status === "ready") {
    return NextResponse.json(state);
  }
  if (state.status === "error") {
    return NextResponse.json(state, { status: 422 });
  }
  if (state.status === "working") {
    return NextResponse.json(state, { status: 202 });
  }

  startPreview(meta, quality);
  return NextResponse.json({ status: "working" }, { status: 202 });
}
