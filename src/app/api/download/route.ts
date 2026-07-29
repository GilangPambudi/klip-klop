import { NextRequest, NextResponse } from "next/server";
import { downloadPart } from "@/lib/downloader";
import { createLink, sweepExpired } from "@/lib/links";

export async function POST(req: NextRequest) {
  try {
    sweepExpired();

    const body = await req.json();
    const { url, start, end, filename, height } = body;

    if (!url || !start || !end) {
      return NextResponse.json(
        { error: "Missing required fields: url, start, end" },
        { status: 400 },
      );
    }

    const parsedHeight = Number(height);
    const file = await downloadPart({
      url,
      from: start,
      to: end,
      filename,
      height: Number.isFinite(parsedHeight) && parsedHeight > 0
        ? parsedHeight
        : undefined,
    });

    const token = createLink(file);

    return NextResponse.json({
      success: true,
      file,
      downloadUrl: `/api/d/${token}`,
    });
  } catch (error: unknown) {
    console.error("API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Download failed";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
