import { NextResponse } from "next/server";
import open from "open";
import path from "path";
import fs from "fs";

export async function POST() {
  const downloadDir = path.resolve(process.cwd(), "download");

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  try {
    await open(downloadDir);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Open Folder Error:", error);
    return NextResponse.json(
      { error: "Failed to open folder" },
      { status: 500 },
    );
  }
}
