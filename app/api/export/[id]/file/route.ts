import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { exportDir, getExportOwner, getExportStatus } from "@/lib/server/export-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }
  if ((await getExportOwner(id)) !== user.id) {
    return NextResponse.json({ error: "File export tidak ditemukan." }, { status: 404 });
  }
  const status = await getExportStatus(id);
  if (!status || status.status !== "done" || !status.fileName) {
    return NextResponse.json({ error: "File export belum siap." }, { status: 404 });
  }

  const filePath = path.join(exportDir(id), status.fileName);
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat) {
    return NextResponse.json({ error: "File export tidak ditemukan." }, { status: 404 });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${status.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
