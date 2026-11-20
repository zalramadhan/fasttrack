import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { fileResponse } from "@/lib/server/file-response";
import { assetFilePath, mimeForExt, readAsset } from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  return fileResponse(req, await assetFilePath(meta), mimeForExt(meta.ext));
}
