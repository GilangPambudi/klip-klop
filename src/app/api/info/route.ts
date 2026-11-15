import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/auth";
import { cookieArgs } from "@/lib/cookies";
import { getConfig } from "@/lib/db/config";
import { allowHit, clientIp, freeDiskGb, MESSAGES, startJob, tierOf } from "@/lib/guard";
import { describeToolError, runTool, YTDLP_COMMON_ARGS } from "@/lib/runtime";
import { sweepExpired } from "@/lib/links";
import { parseLink } from "@/lib/platforms";
import { probeWithPreview } from "@/lib/preview";
import { withProxies } from "@/lib/proxies";

const INFO_TIMEOUT_MS = 3 * 60 * 1000;

export async function POST(req: NextRequest) {
  let release: (() => void) | null = null;
  try {
    await sweepExpired();

    const body = await req.json();
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const link = parseLink(body.url);
    if (!link?.platform || !link.key) {
      return NextResponse.json(
        { error: "This link is not supported" },
        { status: 400 },
      );
    }
    const url = link.url;

    const account = await currentAccount();
    const tier = tierOf(account);
    const config = await getConfig();

    if (freeDiskGb() < config.minFreeDiskGb) {
      return NextResponse.json({ error: MESSAGES.lowDisk }, { status: 503 });
    }
    if (tier === "guest" && !allowHit(`info:ip:${clientIp(req)}`, config.infoPer10minGuest)) {
      return NextResponse.json({ error: MESSAGES.guestLimit }, { status: 429 });
    }
    if (tier === "member" && account && !allowHit(`info:user:${account.id}`, config.infoPer10minMember)) {
      return NextResponse.json({ error: MESSAGES.memberLimit }, { status: 429 });
    }

    release = startJob(config.maxJobs, tier === "unlimited");
    if (!release) {
      return NextResponse.json({ error: MESSAGES.busy }, { status: 503 });
    }

    const run = {
      signal: req.signal,
      timeoutMs: tier === "unlimited" ? undefined : INFO_TIMEOUT_MS,
    };

    if (link.platform !== "youtube") {
      return NextResponse.json(
        await probeWithPreview(url, {
          ...run,
          maxMb:
            tier === "guest" ? config.previewMaxMbGuest
            : tier === "member" ? config.previewMaxMb
            : null,
          dirMaxMb: config.previewDirMaxMb,
        }),
      );
    }

    const cookies = await cookieArgs(url);
    const { stdout } = await withProxies(url, (proxyArgs) => runTool("yt-dlp", [
      ...YTDLP_COMMON_ARGS,
      url,
      ...cookies,
      ...proxyArgs,
      "--no-playlist",
      "--no-warnings",
      "--extractor-args",
      "youtube:player_client=default,web_embedded",
      "-g",
      "-f",
      "best[ext=mp4][vcodec!=none][acodec!=none][protocol=https]/best",
      "--print",
      "%(title)s",
      "--print",
      "%(duration)s",
      "--print",
      "%(formats.:.height)j",
    ], run));

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
    const message = describeToolError(error, "Failed to read video info");
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    release?.();
  }
}
