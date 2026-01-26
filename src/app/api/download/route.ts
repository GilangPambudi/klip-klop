import { NextRequest, NextResponse } from "next/server";
import { downloadPart } from "@/lib/downloader";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, start, end, filename } = body;

    if (!url || !start || !end) {
      return NextResponse.json(
        { error: "Missing required fields: url, start, end" },
        { status: 400 },
      );
    }

    // Safety: simple filename sanitization to avoid directory traversal
    const safeFilename = filename?.replace(/[^a-z0-9\-_]/gi, "_") || "clip";

    const result = await downloadPart({
      url,
      from: start,
      to: end,
      filename: safeFilename,
    });

    return NextResponse.json({
      success: true,
      file: result,
      path: `/downloads/${result}`, // We will serve this via safe static serving or just reference it
    });
  } catch (error: unknown) {
    console.error("API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Download failed";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
