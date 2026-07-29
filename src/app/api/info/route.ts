import { NextRequest, NextResponse } from "next/server";
import { runTool, YTDLP_COMMON_ARGS } from "@/lib/runtime";
import { sweepExpired } from "@/lib/links";

export async function POST(req: NextRequest) {
  try {
    sweepExpired();

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // --print keeps the response to a few short lines; -J would be megabytes.
    const { stdout } = await runTool("yt-dlp", [
      url,
      "--no-playlist",
      "--skip-download",
      "--no-warnings",
      ...YTDLP_COMMON_ARGS,
      "--print",
      "%(title)s",
      "--print",
      "%(duration)s",
      "--print",
      "%(formats.:.height)j",
    ]);

    const lines = stdout.split(/[\r\n]+/).filter(Boolean);
    const [title, durationRaw, heightsRaw] = lines;

    let heights: number[] = [];
    try {
      const parsed = JSON.parse(heightsRaw ?? "[]") as (number | null)[];
      heights = [...new Set(parsed.filter((h): h is number => !!h))].sort(
        (a, b) => b - a,
      );
    } catch {
      heights = [];
    }

    return NextResponse.json({
      title: title ?? "",
      duration: Number(durationRaw) || 0,
      heights,
    });
  } catch (error: unknown) {
    console.error("Info Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to read video info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
