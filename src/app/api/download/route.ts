import { NextRequest, NextResponse } from "next/server";
import { downloadPart } from "@/lib/downloader";
import { createLink, sweepExpired } from "@/lib/links";
import { isAudioFormat } from "@/lib/formats";
import { parseLink } from "@/lib/platforms";
import { describeToolError } from "@/lib/runtime";
import { displayName } from "@/lib/filenames";
import { getAccount, refundCredit, takeCredit } from "@/lib/db/accounts";
import { currentAccount } from "@/auth";

export async function POST(req: NextRequest) {
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
  }
}
