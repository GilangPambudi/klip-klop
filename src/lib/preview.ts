import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cookieArgs } from "./cookies";
import { DOWNLOAD_DIR } from "./downloader";
import { withProxies } from "./proxies";
import { resolveBinary, runTool, YTDLP_COMMON_ARGS, type RunOptions } from "./runtime";

const PREVIEW_DIR = path.join(DOWNLOAD_DIR, ".preview");
const PREVIEW_TTL_MS = 60 * 60 * 1000;

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

const IN_USE_MS = 2 * 60 * 1000;

export function markPreviewWatched(filePath: string) {
  try {
    const now = new Date();
    fs.utimesSync(filePath, now, now);
  } catch {}
}

function capPreviews(maxMb: number, keep: string) {
  const inUseSince = Date.now() - IN_USE_MS;
  const files = fs.readdirSync(PREVIEW_DIR).flatMap((name) => {
    if (name.startsWith(keep) || /\.(part|ytdl)$/.test(name)) return [];
    const filePath = path.join(PREVIEW_DIR, name);
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs > inUseSince) return [];
      return stat.isFile() ? [{ filePath, size: stat.size, mtime: stat.mtimeMs }] : [];
    } catch {
      return [];
    }
  });
  files.sort((a, b) => a.mtime - b.mtime);

  let total = files.reduce((sum, f) => sum + f.size, 0);
  const max = maxMb * 1024 * 1024;
  for (const file of files) {
    if (total <= max) break;
    try {
      fs.unlinkSync(file.filePath);
      total -= file.size;
    } catch {}
  }
}

interface PreviewOptions extends RunOptions {
  maxMb: number | null;
  dirMaxMb: number;
}

export async function probeWithPreview(url: string, { maxMb, dirMaxMb, ...run }: PreviewOptions) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  sweepPreviews();

  const token = crypto.randomBytes(16).toString("hex");

  const cookies = await cookieArgs(url);
  try {
    const { stdout } = await withProxies(url, (proxyArgs) => runTool("yt-dlp", [
      ...YTDLP_COMMON_ARGS,
      ...cookies,
      ...proxyArgs,
      url,
      "--no-playlist",
      "--no-warnings",
      "--no-simulate",
      "-f",
      "best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/best",
      "-S",
      "vcodec:h264",
      ...(maxMb === null ? [] : ["--max-filesize", `${maxMb}M`]),
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
    ], run));

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
  } catch (error) {
    for (const name of fs.readdirSync(PREVIEW_DIR)) {
      if (name.startsWith(token)) fs.rmSync(path.join(PREVIEW_DIR, name), { force: true });
    }
    throw error;
  } finally {
    capPreviews(dirMaxMb, token);
  }
}
