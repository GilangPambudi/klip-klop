import path from "path";
import fs from "fs";
import { streamTool } from "./runtime";

/**
 * Scans the download directory for files matching 'part*.mp4',
 * generates a 'mylist.txt' for ffmpeg, and concatenates them into 'final.mp4'.
 */
export async function concatenateParts() {
  const downloadDir = path.resolve(process.cwd(), "download");

  if (!fs.existsSync(downloadDir)) {
    throw new Error("Download directory does not exist");
  }

  // Find all part*.mp4 files
  const files = fs
    .readdirSync(downloadDir)
    .filter((file) => /^part.*\.mp4$/.test(file))
    .sort(); // Ensure order

  if (files.length === 0) {
    console.log("No part files found to concatenate.");
    return;
  }

  // Generate mylist.txt content
  // Format: file 'filename'
  const listContent = files.map((f) => `file '${f}'`).join("\n");
  const listPath = path.join(downloadDir, "mylist.txt");

  fs.writeFileSync(listPath, listContent, "utf8");

  const outputFilename = path.join(downloadDir, "final.mp4");

  const args = [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-copyts",
    "-y",
    outputFilename,
  ];

  console.log("Extracted file list:");
  console.log(listContent);

  try {
    await streamTool("ffmpeg", args);
    console.log(`> Concatenation complete: ${outputFilename}`);

    return "final.mp4";
  } catch (error) {
    console.error("Concat failed:", error);
    throw error;
  }
}
