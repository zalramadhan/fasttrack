import { NextResponse } from "next/server";
import { getExportStatus, removeExport } from "@/lib/server/export-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const status = await getExportStatus(id);
  if (!status) {
    return NextResponse.json({ error: "Export tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await removeExport(id);
  return NextResponse.json({ ok: true });
}
