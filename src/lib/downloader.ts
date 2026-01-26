import path from "path";
import fs from "fs";
import { execAsync } from "./runtime";

interface DownloadOptions {
  url: string;
  from: string; // "HH:mm:ss"
  to: string; // "HH:mm:ss"
  filename: string;
}

export async function downloadPart({
  url,
  from,
  to,
  filename,
}: DownloadOptions) {
  const outputFilename = filename
    ? filename.replace(/\s/g, "-").toLowerCase()
    : "part";

  // Resolve directories
  const downloadDir = path.resolve(process.cwd(), "download");
  const binDir = path.resolve(process.cwd(), "bin");
  const localYtDlp = path.join(binDir, "yt-dlp.exe");

  // Use local binary if exists, else fallback to global 'yt-dlp'
  const isWin = process.platform === "win32";
  const ytDlpCommand =
    isWin && fs.existsSync(localYtDlp) ? `"${localYtDlp}"` : "yt-dlp";

  // Ensure download directory exists
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const fullOutputFilename = path.join(downloadDir, outputFilename);

  console.log(`> Downloading with yt-dlp: ${ytDlpCommand}`);
  console.log(`> URL: ${url}`);
  console.log(`> Range: ${from} - ${to}`);

  // Logic Determination
  // Case 1 (Start > 0, End > 0): Partial
  // Case 2 (Start > 0, End = 0): Start to End (inf)
  // Case 3 (Start = 0, End = 0): Full
  // Case 4 (Start = 0, End > 0): 0 to End

  const isStartZero = from === "00:00:00" || from === "0" || !from;
  const isEndZero = to === "00:00:00" || to === "0" || !to;

  let downloadSections = "";

  if (isStartZero && isEndZero) {
    // Case 3: Full Download -> No section flag needed
    console.log("> Mode: Full Download");
  } else if (!isStartZero && isEndZero) {
    // Case 2: Start to End
    downloadSections = `*${from}-inf`;
    console.log("> Mode: Start to End (inf)");
  } else if (isStartZero && !isEndZero) {
    // Case 4: 0 to End
    downloadSections = `*00:00:00-${to}`;
    console.log("> Mode: Start to Custom End");
  } else {
    // Case 1: Partial
    downloadSections = `*${from}-${to}`;
    console.log("> Mode: Partial Range");
  }

  // Check for local ffmpeg
  const localFfmpeg = path.join(binDir, "ffmpeg.exe");
  const hasLocalFfmpeg = isWin && fs.existsSync(localFfmpeg);

  // Command construction matching legacy flags EXACTLY
  // Legacy: -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best[ext=mp4]/best" -S "res:1080"
  let command = `${ytDlpCommand} "${url}" \
    -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best[ext=mp4]/best" \
    -S "res:1080" \
    --merge-output-format mp4 \
    --force-keyframes-at-cuts \
    -o "${fullOutputFilename}.%(ext)s"`;

  if (hasLocalFfmpeg) {
    command += ` --ffmpeg-location "${binDir}"`;
  }

  if (downloadSections) {
    command += ` --download-sections "${downloadSections}"`;
  }

  try {
    const { stdout, stderr } = await execAsync(command);
    console.log(stdout);
    if (stderr) console.error(stderr);

    return `${outputFilename}.mp4`;
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}
