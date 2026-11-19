import { NextResponse } from "next/server";
import { appendFrame } from "@/lib/server/export-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const index = Number(new URL(req.url).searchParams.get("index") ?? "-1");

  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Index frame tidak valid." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      return NextResponse.json({ error: "Frame bukan JPEG yang valid." }, { status: 400 });
    }
    const framesWritten = await appendFrame(id, index, buffer);
    return NextResponse.json({ framesWritten });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan frame.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
