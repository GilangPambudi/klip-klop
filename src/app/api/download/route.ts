import { NextRequest, NextResponse } from "next/server";
import { downloadPart } from "@/lib/downloader";
import { createLink, sweepExpired } from "@/lib/links";
import { isAudioFormat } from "@/lib/formats";
import { currentUserId } from "@/auth";
import { creditsLeft, refundCredit, takeCredit } from "@/lib/credits";

export async function POST(req: NextRequest) {
  try {
    const owner = await currentUserId();
    if (!owner) {
      return NextResponse.json(
        { error: "Log in to download" },
        { status: 401 },
      );
    }

    sweepExpired();

    const body = await req.json();
    const { url, start, end, filename, height, format } = body;

    if (!url || !start || !end) {
      return NextResponse.json(
        { error: "Missing required fields: url, start, end" },
        { status: 400 },
      );
    }

    if (format !== undefined && format !== "mp4" && !isAudioFormat(format)) {
      return NextResponse.json(
        { error: `Unsupported format: ${format}` },
        { status: 400 },
      );
    }

    if (!takeCredit(owner)) {
      return NextResponse.json(
        { error: "No credits left", credits: 0 },
        { status: 402 },
      );
    }

    const parsedHeight = Number(height);
    let file: string;
    let token: string;
    try {
      file = await downloadPart({
        url,
        from: start,
        to: end,
        filename,
        height: Number.isFinite(parsedHeight) && parsedHeight > 0
          ? parsedHeight
          : undefined,
        audio: isAudioFormat(format) ? format : undefined,
      });
      token = createLink(file, owner);
    } catch (error) {
      // Only a download that actually produced a file costs a credit.
      refundCredit(owner);
      throw error;
    }

    return NextResponse.json({
      success: true,
      file,
      downloadUrl: `/api/d/${token}`,
      credits: creditsLeft(owner),
    });
  } catch (error: unknown) {
    console.error("API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Download failed";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
