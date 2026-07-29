import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveLink, sweepExpired } from "@/lib/links";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  sweepExpired();

  const { token } = await params;
  const entry = resolveLink(token);

  if (!entry) {
    return new NextResponse("Link not found or expired", { status: 404 });
  }

  const stat = fs.statSync(entry.filePath);
  const file = fs.createReadStream(entry.filePath);

  // @ts-expect-error: Node stream is a valid Response body in the Next runtime
  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${path.basename(entry.filename)}"`,
    },
  });
}
