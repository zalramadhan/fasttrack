import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { fileResponse } from "@/lib/server/file-response";
import {
  previewFilePath,
  type PreviewQuality,
} from "@/lib/server/preview";
import { readAsset } from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseQuality(value: string): PreviewQuality | null {
  return value === "half" || value === "quarter" ? value : null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; quality: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const { id, quality: rawQuality } = await ctx.params;
  const quality = parseQuality(rawQuality);
  if (!quality) {
    return NextResponse.json({ error: "Kualitas preview tidak valid." }, { status: 404 });
  }

  const meta = await readAsset(id);
  if (!meta || (meta.ownerId && meta.ownerId !== user.id)) {
    return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
  }
  if (meta.kind !== "video") {
    return NextResponse.json({ error: "Proxy hanya untuk video." }, { status: 400 });
  }

  return fileResponse(
    req,
    previewFilePath(meta, quality),
    "video/mp4",
    "private, max-age=86400, immutable",
  );
}
