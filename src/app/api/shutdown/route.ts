import { NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST() {
  // Execute shutdown command with a slight delay
  setTimeout(() => {
    // Windows taskkill to ensure tree is killed
    const command =
      process.platform === "win32"
        ? `taskkill /PID ${process.pid} /T /F`
        : `kill -9 ${process.pid}`;

    exec(command, (error) => {
      if (error) console.error("Shutdown error:", error);
    });

    // Fallback if exec fails or as immediate signal
    process.exit(0);
  }, 1000);

  return NextResponse.json({ success: true, message: "Server stopping..." });
}
