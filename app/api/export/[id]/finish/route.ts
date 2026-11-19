import { NextResponse } from "next/server";
import { startEncoding } from "@/lib/server/export-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await startEncoding(id);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memulai encoding.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
