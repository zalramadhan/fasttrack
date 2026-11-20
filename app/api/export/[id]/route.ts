import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getExportOwner, getExportStatus, removeExport } from "@/lib/server/export-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }
  if ((await getExportOwner(id)) !== user.id) {
    return NextResponse.json({ error: "Export tidak ditemukan." }, { status: 404 });
  }
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }
  if ((await getExportOwner(id)) !== user.id) {
    return NextResponse.json({ error: "Export tidak ditemukan." }, { status: 404 });
  }
  await removeExport(id);
  return NextResponse.json({ ok: true });
}
