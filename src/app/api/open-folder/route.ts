import { NextResponse } from "next/server";
import open from "open";
import fs from "fs";
import { authEnabled } from "@/auth";
import { DOWNLOAD_DIR } from "@/lib/downloader";

export async function POST() {
  if (authEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  try {
    await open(DOWNLOAD_DIR);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Open Folder Error:", error);
    return NextResponse.json(
      { error: "Failed to open folder" },
      { status: 500 },
    );
  }
}
