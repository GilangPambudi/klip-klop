import path from "path";
import fs from "fs";
import { streamTool, YTDLP_COMMON_ARGS, resolveBinary } from "./runtime";
import type { AudioFormat } from "./formats";
import { uniqueBase } from "./filenames";

interface DownloadOptions {
  url: string;
  from: string; // "HH:mm:ss"
  to: string; // "HH:mm:ss"
  /** Account the file belongs to; becomes the filename prefix. */
  owner: string;
  /** Name the user asked for, unsanitized. */
  filename: string;
  /** Max video height in pixels. Omit for best available. Ignored for audio. */
  height?: number;
  /** Extract audio only in this format. Omit for an MP4 video. */
  audio?: AudioFormat;
}

// Always cut from the m4a stream: --download-sections ignores the start time on
// YouTube's webm/opus audio (a 10s–13s clip came out as 0s–13s). Only m4a skips re-encoding.
const AUDIO_SOURCE = "bestaudio[ext=m4a]/bestaudio/best";
const AUDIO_CODEC: Record<AudioFormat, string> = {
  mp3: "mp3",
  m4a: "m4a",
  ogg: "vorbis",
  opus: "opus",
};

export const DOWNLOAD_DIR = path.resolve(process.cwd(), "download");

export async function downloadPart({
  url,
  from,
  to,
  owner,
  filename,
  height,
  audio,
}: DownloadOptions) {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  // Sanitized, prefixed with the owner, and numbered " (2)" when the name is taken,
  // so one account never overwrites another's file or its own earlier one.
  // ponytail: two same-name downloads starting in the same instant can still pick
  // the same name; reserve it with a placeholder file if that ever happens.
  const outputFilename = uniqueBase(owner, filename, fs.readdirSync(DOWNLOAD_DIR));

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

  const formatArgs = audio
    ? [
        "-f",
        AUDIO_SOURCE,
        "-x",
        "--audio-format",
        AUDIO_CODEC[audio],
        "--audio-quality",
        "0",
      ]
    : [
        "-f",
        height
          ? `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`
          : "bestvideo+bestaudio/best",
        "--merge-output-format",
        "mp4",
        // --merge-output-format only applies when a merge happens; a single
        // progressive stream would otherwise stay .webm.
        "--remux-video",
        "mp4",
        "--force-keyframes-at-cuts",
        ...(height ? ["-S", `res:${height}`] : []),
      ];

  const args = [
    url,
    "--no-playlist",
    ...formatArgs,
    ...YTDLP_COMMON_ARGS,
    "-o",
    outputTemplate,
    "--print",
    "after_move:filepath",
  ];

  if (downloadSections) {
    args.push("--download-sections", downloadSections);
  }

  // ponytail: resolveBinary already checks platform and falls back to system PATH
  args.push("--ffmpeg-location", resolveBinary("ffmpeg").command);

  console.log(`> Downloading: ${url} [${from} - ${to}] @ ${audio ?? height ?? "best"}`);

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
