import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { previewPath } from "@/lib/preview";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const filePath = previewPath(token);
  if (!filePath) {
    return new NextResponse("Preview not found or expired", { status: 404 });
  }

  const fileSize = fs.statSync(filePath).size;
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Content-Type": "video/mp4",
    "Cache-Control": "private, no-store",
  };

  if (!range || (!range[1] && !range[2])) {
    const body = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
    return new Response(body, {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": String(fileSize) },
    });
  }

  const start = range[1] ? Number(range[1]) : Math.max(0, fileSize - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), fileSize - 1) : fileSize - 1;
  if (start > end || start >= fileSize) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  const body = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream;
  return new Response(body, {
    status: 206,
    headers: {
      ...baseHeaders,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": String(end - start + 1),
    },
  });
}
