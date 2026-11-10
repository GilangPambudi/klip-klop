import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { contentTypeFor } from "@/lib/formats";
import { ownsFile } from "@/lib/filenames";
import { currentAccount } from "@/auth";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filename = searchParams.get("file");

  if (!filename) {
    return new NextResponse("Filename required", { status: 400 });
  }

  // Security: Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(process.cwd(), "download", safeFilename);

  // Previews are private: only the account whose prefix the file carries may
  // play it. Anyone else gets the same answer as for a missing file.
  const account = await currentAccount();
  if (!account || !ownsFile(account.id, safeFilename) || !fs.existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize.toString(),
      "Content-Type": contentTypeFor(safeFilename),
    };

    // return new NextResponse(file as any, { status: 206, headers });
    // Next.js NextResponse body types are tricky with streams in App Router
    // Using standard Response for stream
    // @ts-expect-error: Node stream is compatible with Response body in Next.js runtime
    return new Response(file, { status: 206, headers });
  } else {
    const headers = {
      "Content-Length": fileSize.toString(),
      "Content-Type": contentTypeFor(safeFilename),
    };
    const file = fs.createReadStream(filePath);
    // @ts-expect-error: Node stream is compatible with Response body in Next.js runtime
    return new Response(file, { status: 200, headers });
  }
}
