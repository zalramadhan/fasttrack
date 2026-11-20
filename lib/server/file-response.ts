import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

export async function fileResponse(
  req: Request,
  filePath: string,
  mime: string,
  cacheControl = "private, max-age=3600",
): Promise<Response> {
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }

  const range = req.headers.get("range");
  const baseHeaders: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : stat.size - 1;
      if (start >= stat.size || end >= stat.size || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { ...baseHeaders, "Content-Range": `bytes */${stat.size}` },
        });
      }
      const stream = createReadStream(filePath, { start, end });
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
  }

  const stream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(stat.size) },
  });
}
