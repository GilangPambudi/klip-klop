import { NextRequest, NextResponse } from "next/server";
import { runTool } from "@/lib/runtime";
import { sweepExpired } from "@/lib/links";

export async function POST(req: NextRequest) {
  try {
    sweepExpired();

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // One yt-dlp call fetches info AND the preview stream URL. -g prints the
    // resolved URL on its own line after the --print output.
    // The default client is much faster than android_vr/tv (which each run a
    // JS challenge solver); skip YTDLP_COMMON_ARGS here.
    const { stdout } = await runTool("yt-dlp", [
      url,
      "--no-playlist",
      "--no-warnings",
      "-g",
      "-f",
      "best[ext=mp4][vcodec!=none][acodec!=none]/best",
      "--print",
      "%(title)s",
      "--print",
      "%(duration)s",
      "--print",
      "%(formats.:.height)j",
    ]);

    const lines = stdout.split(/[\r\n]+/).filter(Boolean);
    const [title, durationRaw, heightsRaw, ...streamLines] = lines;

    let heights: number[] = [];
    try {
      const parsed = JSON.parse(heightsRaw ?? "[]") as (number | null)[];
      heights = [...new Set(parsed.filter((h): h is number => !!h))].sort(
        (a, b) => b - a,
      );
    } catch {
      heights = [];
    }

    // Only a direct mp4 plays in <video>. The `best` fallback can resolve to
    // an HLS manifest (m3u8), which a native <video> cannot play.
    const directUrl =
      streamLines.find(
        (l) =>
          /^https?:\/\//.test(l) &&
          /(videoplayback|googlevideo).*(itag=\d+)/.test(l) &&
          !l.includes("manifest.googlevideo"),
      ) ?? "";

    return NextResponse.json({
      title: title ?? "",
      duration: Number(durationRaw) || 0,
      heights,
      directUrl,
    });
  } catch (error: unknown) {
    console.error("Info Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to read video info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
