import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { cookieArgs } from "@/lib/cookies";
import { parseLink } from "@/lib/platforms";
import { withProxies } from "@/lib/proxies";
import {
  describeToolError,
  resolveBinary,
  runTool,
  YTDLP_COMMON_ARGS,
} from "@/lib/runtime";

const MAX_SIZE = "200M";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4a": "audio/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".opus": "audio/ogg",
};

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function authorized(req: NextRequest) {
  const expected = process.env.INTERNAL_API_TOKEN?.trim();
  if (!expected || expected.length < 32) return false;
  if (req.headers.has("x-forwarded-for")) return false;

  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return notFound();

  let body: { url?: unknown; audio?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const link = typeof body.url === "string" ? parseLink(body.url) : null;
  if (!link?.platform || !link.key) {
    return NextResponse.json({ error: "This link is not supported" }, { status: 400 });
  }
  const url = link.url;
  const audio = body.audio === true;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klip-klop-internal-"));
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });

  try {
    const cookies = await cookieArgs(url);
    const formatArgs = audio
      ? ["-f", "bestaudio[ext=m4a]/bestaudio/best"]
      : [
          "-f",
          "best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/best",
          "-S",
          "vcodec:h264",
          "--remux-video",
          "mp4",
        ];

    const { stdout } = await withProxies(url, (proxyArgs) => runTool("yt-dlp", [
      ...YTDLP_COMMON_ARGS,
      ...cookies,
      ...proxyArgs,
      url,
      "--no-playlist",
      "--no-warnings",
      "--no-simulate",
      ...formatArgs,
      "--max-filesize",
      MAX_SIZE,
      "--ffmpeg-location",
      resolveBinary("ffmpeg").command,
      "-o",
      path.join(dir, "media.%(ext)s"),
      "--print",
      "%(.{title,duration})j",
    ]));

    const file = fs.readdirSync(dir).find((name) => name.startsWith("media."));
    if (!file) {
      cleanup();
      return NextResponse.json(
        { error: `No file was downloaded (over ${MAX_SIZE}?)` },
        { status: 422 },
      );
    }

    const info = JSON.parse(stdout.split(/[\r\n]+/).find(Boolean) ?? "{}") as {
      title?: string;
      duration?: number;
    };
    const filePath = path.join(dir, file);
    const ext = path.extname(file).toLowerCase();
    const stream = fs.createReadStream(filePath);
    stream.on("close", cleanup);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Content-Length": String(fs.statSync(filePath).size),
        "Content-Disposition": `attachment; filename="media${ext}"`,
        "X-Platform": link.platform,
        "X-Title": encodeURIComponent(info.title ?? ""),
        "X-Duration": String(Number(info.duration) || 0),
      },
    });
  } catch (error) {
    cleanup();
    console.error("Internal fetch failed:", error);
    return NextResponse.json(
      { error: describeToolError(error, "Download failed") },
      { status: 502 },
    );
  }
}
