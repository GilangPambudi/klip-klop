import path from "path";
import fs from "fs";
import { streamTool, YTDLP_COMMON_ARGS, resolveBinary } from "./runtime";

interface DownloadOptions {
  url: string;
  from: string; // "HH:mm:ss"
  to: string; // "HH:mm:ss"
  filename: string;
  /** Max video height in pixels. Omit for best available. */
  height?: number;
}

export const DOWNLOAD_DIR = path.resolve(process.cwd(), "download");

/**
 * YouTube titles reach the filename, so anything outside this set — path
 * separators, "..", control characters — must not survive.
 */
export function sanitizeFilename(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");

  // Filesystems cap a name at 255 bytes; leave room for the extension.
  return cleaned.slice(0, 200) || "clip";
}

export async function downloadPart({
  url,
  from,
  to,
  filename,
  height,
}: DownloadOptions) {
  const outputFilename = sanitizeFilename(filename || "clip");

  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const outputTemplate = path.join(DOWNLOAD_DIR, `${outputFilename}.%(ext)s`);

  // Case 1 (Start > 0, End > 0): Partial
  // Case 2 (Start > 0, End = 0): Start to End (inf)
  // Case 3 (Start = 0, End = 0): Full
  // Case 4 (Start = 0, End > 0): 0 to End
  const isStartZero = from === "00:00:00" || from === "0" || !from;
  const isEndZero = to === "00:00:00" || to === "0" || !to;

  let downloadSections = "";
  if (isStartZero && isEndZero) {
    console.log("> Mode: Full Download");
  } else if (!isStartZero && isEndZero) {
    downloadSections = `*${from}-inf`;
  } else if (isStartZero && !isEndZero) {
    downloadSections = `*00:00:00-${to}`;
  } else {
    downloadSections = `*${from}-${to}`;
  }

  const format = height
    ? `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`
    : "bestvideo+bestaudio/best";

  const args = [
    url,
    "--no-playlist",
    "-f",
    format,
    "--merge-output-format",
    "mp4",
    // --merge-output-format only applies when a merge happens; a single
    // progressive stream would otherwise stay .webm.
    "--remux-video",
    "mp4",
    "--force-keyframes-at-cuts",
    ...YTDLP_COMMON_ARGS,
    "-o",
    outputTemplate,
    "--print",
    "after_move:filepath",
  ];

  if (height) {
    args.push("-S", `res:${height}`);
  }

  if (downloadSections) {
    args.push("--download-sections", downloadSections);
  }

  // ponytail: resolveBinary already checks platform and falls back to system PATH
  args.push("--ffmpeg-location", resolveBinary("ffmpeg").command);

  console.log(`> Downloading: ${url} [${from} - ${to}] @ ${height ?? "best"}`);

  const { stdout } = await streamTool("yt-dlp", args);

  // Progress output shares stdout with --print, so match the path itself
  // rather than assuming which line it lands on.
  const printedPath = stdout
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(DOWNLOAD_DIR))
    .pop();

  if (!printedPath) {
    throw new Error("yt-dlp finished but reported no output file");
  }

  return path.basename(printedPath);
}
