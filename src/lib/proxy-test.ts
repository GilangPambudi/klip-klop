import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { cookieArgs } from "./cookies";
import { describeToolError, resolveBinary, runTool, YTDLP_COMMON_ARGS } from "./runtime";

const execFileAsync = promisify(execFile);

const TEST_VIDEO = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

export interface ProxyTestResult {
  ok: boolean;
  ip: string | null;
  ms: number;
  error: string | null;
}

async function exitIp(proxyUrl: string) {
  try {
    const { stdout } = await execFileAsync(
      "curl",
      ["-s", "--max-time", "10", "-x", proxyUrl, "https://api.ipify.org"],
      { windowsHide: true },
    );
    const ip = stdout.trim();
    return /^[\d.:a-f]+$/i.test(ip) ? ip : null;
  } catch {
    return null;
  }
}

export async function testProxy(proxyUrl: string): Promise<ProxyTestResult> {
  const started = Date.now();
  const ip = await exitIp(proxyUrl);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klip-klop-proxy-"));
  try {
    await runTool("yt-dlp", [
      ...YTDLP_COMMON_ARGS,
      TEST_VIDEO,
      ...(await cookieArgs(TEST_VIDEO)),
      "--proxy",
      proxyUrl,
      "--no-playlist",
      "--no-warnings",
      "--no-progress",
      "-f",
      "bestaudio[ext=m4a]/bestaudio/best",
      "--download-sections",
      "*00:00:01-00:00:03",
      "--ffmpeg-location",
      resolveBinary("ffmpeg").command,
      "-o",
      path.join(dir, "test.%(ext)s"),
    ]);
    return { ok: true, ip, ms: Date.now() - started, error: null };
  } catch (error) {
    return {
      ok: false,
      ip,
      ms: Date.now() - started,
      error: describeToolError(error, "Test failed"),
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
