import { NextRequest, NextResponse } from "next/server";
import { downloadPart } from "@/lib/downloader";
import { createLink, sweepExpired } from "@/lib/links";
import { isAudioFormat } from "@/lib/formats";
import { parseLink } from "@/lib/platforms";
import { describeToolError } from "@/lib/runtime";
import { displayName } from "@/lib/filenames";
import { getAccount, refundCredit, takeCredit } from "@/lib/db/accounts";
import { getConfig } from "@/lib/db/config";
import { claimAccount, freeDiskGb, MESSAGES, startJob, tierOf } from "@/lib/guard";
import { currentAccount } from "@/auth";

const TIME = /^(\d{1,3}):(\d{2}):(\d{2})$/;

function seconds(time: string) {
  const match = time.match(TIME);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export async function POST(req: NextRequest) {
  const releases: (() => void)[] = [];
  try {
    const account = await currentAccount();
    if (!account) {
      return NextResponse.json(
        { error: "Log in to download" },
        { status: 401 },
      );
    }
    if (account.banned) {
      return NextResponse.json(
        { error: "This account is banned" },
        { status: 403 },
      );
    }
    const owner = account.id;
    const limited = tierOf(account) !== "unlimited";

    await sweepExpired();

    const body = await req.json();
    const { start, end, filename, height, format } = body;

    if (
      typeof body.url !== "string" || !body.url ||
      typeof start !== "string" || !start ||
      typeof end !== "string" || !end
    ) {
      return NextResponse.json(
        { error: "Missing required fields: url, start, end" },
        { status: 400 },
      );
    }

    const startSec = seconds(start);
    const endSec = seconds(end);
    if (startSec === null || endSec === null) {
      return NextResponse.json(
        { error: "Start and End must look like HH:MM:SS" },
        { status: 400 },
      );
    }
    if (endSec !== 0 && endSec <= startSec) {
      return NextResponse.json(
        { error: "End must be after Start" },
        { status: 400 },
      );
    }

    const link = parseLink(body.url);
    if (!link?.platform || !link.key) {
      return NextResponse.json(
        { error: "This link is not supported" },
        { status: 400 },
      );
    }
    const url = link.url;

    if (format !== undefined && format !== "mp4" && !isAudioFormat(format)) {
      return NextResponse.json(
        { error: `Unsupported format: ${format}` },
        { status: 400 },
      );
    }

    const config = await getConfig();
    if (freeDiskGb() < config.minFreeDiskGb) {
      return NextResponse.json({ error: MESSAGES.lowDisk }, { status: 503 });
    }

    const maxClip = config.maxClipMinutes * 60;
    if (limited && endSec !== 0 && endSec - startSec > maxClip) {
      return NextResponse.json(
        { error: `Clips can be at most ${config.maxClipMinutes} minutes long` },
        { status: 400 },
      );
    }

    if (limited) {
      const releaseAccount = claimAccount(owner);
      if (!releaseAccount) {
        return NextResponse.json(
          { error: "You already have a download running. Wait for it to finish." },
          { status: 429 },
        );
      }
      releases.push(releaseAccount);
    }
    const releaseJob = startJob(config.maxJobs, !limited);
    if (!releaseJob) {
      return NextResponse.json({ error: MESSAGES.busy }, { status: 503 });
    }
    releases.push(releaseJob);

    if (!(await takeCredit(owner))) {
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
        owner,
        filename: typeof filename === "string" ? filename : "",
        height: Number.isFinite(parsedHeight) && parsedHeight > 0
          ? parsedHeight
          : undefined,
        audio: isAudioFormat(format) ? format : undefined,
        ...(limited && {
          matchFilter:
            endSec === 0 ? `!is_live & duration <= ${startSec + maxClip}` : "!is_live",
          maxMb: config.downloadMaxMb,
          run: {
            signal: req.signal,
            timeoutMs: config.downloadTimeoutMinutes * 60 * 1000,
          },
        }),
      });
      token = await createLink({
        file,
        owner,
        sourceUrl: url,
        start: start.slice(0, 8),
        end: end.slice(0, 8),
        format: format ?? "mp4",
      });
    } catch (error) {
      // Only a download that actually produced a file costs a credit.
      await refundCredit(owner);
      throw error;
    }

    return NextResponse.json({
      success: true,
      file,
      name: displayName(owner, file),
      downloadUrl: `/api/d/${token}`,
      credits: (await getAccount(owner))?.credits ?? null,
    });
  } catch (error: unknown) {
    console.error("API Error:", error);
    const errorMessage = describeToolError(error, "Download failed");

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    for (const release of releases) release();
  }
}
