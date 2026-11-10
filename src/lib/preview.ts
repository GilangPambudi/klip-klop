import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DOWNLOAD_DIR } from "./downloader";
import { resolveBinary, runTool, YTDLP_COMMON_ARGS } from "./runtime";

const PREVIEW_DIR = path.join(DOWNLOAD_DIR, ".preview");
const PREVIEW_TTL_MS = 60 * 60 * 1000;
const PREVIEW_MAX_SIZE = "200M";

export function previewPath(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const filePath = path.join(PREVIEW_DIR, `${token}.mp4`);
  return fs.existsSync(filePath) ? filePath : null;
}

function sweepPreviews() {
  const cutoff = Date.now() - PREVIEW_TTL_MS;
  for (const name of fs.readdirSync(PREVIEW_DIR)) {
    const filePath = path.join(PREVIEW_DIR, name);
    try {
      if (fs.statSync(filePath).mtimeMs < cutoff) fs.unlinkSync(filePath);
    } catch {}
  }
}

export async function probeWithPreview(url: string) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  sweepPreviews();

  const token = crypto.randomBytes(16).toString("hex");

  const { stdout } = await runTool("yt-dlp", [
    ...YTDLP_COMMON_ARGS,
    url,
    "--no-playlist",
    "--no-warnings",
    "--no-simulate",
    "-f",
    "best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/best",
    "-S",
    "vcodec:h264",
    "--max-filesize",
    PREVIEW_MAX_SIZE,
    "--remux-video",
    "mp4",
    "--ffmpeg-location",
    resolveBinary("ffmpeg").command,
    "-o",
    path.join(PREVIEW_DIR, `${token}.%(ext)s`),
    "--print",
    "%(.{title,duration})j",
    "--print",
    "%(formats.:.height)j",
  ]);

  const [infoRaw, heightsRaw] = stdout.split(/[\r\n]+/).filter(Boolean);
  const info = JSON.parse(infoRaw ?? "{}") as {
    title?: string;
    duration?: number;
  };
  const parsed = JSON.parse(heightsRaw ?? "[]") as (number | null)[];
  const heights = [...new Set(parsed.filter((h): h is number => !!h))].sort(
    (a, b) => b - a,
  );

  return {
    title: info.title ?? "",
    duration: Number(info.duration) || 0,
    heights,
    directUrl: previewPath(token) ? `/api/preview/${token}` : "",
  };
}
