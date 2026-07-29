import { execFile, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

export const YTDLP_COMMON_ARGS = [
  "--js-runtimes",
  "node",
  "--extractor-args",
  "youtube:player_client=android_vr,tv",
];

const INSTALL_HINTS: Record<string, string> = {
  "yt-dlp":
    "Install it with `pipx install yt-dlp` (or `sudo apt install yt-dlp`), or drop the binary into ./bin",
  ffmpeg:
    "Install it with `sudo apt install ffmpeg` (or `brew install ffmpeg`), or drop the binary into ./bin",
};

export interface ResolvedBinary {
  command: string;
  /** .cmd/.bat shims cannot be launched by execFile/spawn without a shell. */
  useShell: boolean;
}

const cache = new Map<string, ResolvedBinary>();

const isWin = process.platform === "win32";

function isExecutable(filePath: string) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function searchPath(name: string): string | null {
  const dirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  const extensions = isWin ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const dir of dirs) {
    for (const ext of extensions) {
      const candidate = path.join(dir, name + ext);
      if (isExecutable(candidate)) return candidate;
    }
  }
  return null;
}

export function resolveBinary(name: "yt-dlp" | "ffmpeg"): ResolvedBinary {
  const cached = cache.get(name);
  if (cached) return cached;

  const local = path.resolve(
    process.cwd(),
    "bin",
    isWin ? `${name}.exe` : name,
  );
  const found = isExecutable(local) ? local : searchPath(name);

  if (!found) {
    throw new Error(`${name} not found. ${INSTALL_HINTS[name]}`);
  }

  const resolved: ResolvedBinary = {
    command: found,
    useShell: /\.(cmd|bat)$/i.test(found),
  };
  cache.set(name, resolved);
  return resolved;
}

/** For short-lived probes. Output is buffered, so keep the output small. */
export async function runTool(name: "yt-dlp" | "ffmpeg", args: string[]) {
  const { command, useShell } = resolveBinary(name);
  const { stdout, stderr } = await execFileAsync(command, args, {
    shell: useShell,
    windowsHide: true,
  });
  return { stdout, stderr };
}

/**
 * For downloads and transcodes. Streams output instead of buffering it, since
 * yt-dlp progress on a long video overflows execFile's maxBuffer.
 */
export function streamTool(
  name: "yt-dlp" | "ffmpeg",
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  const { command, useShell } = resolveBinary(name);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: useShell, windowsHide: true });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${name} exited with code ${code}\n${stderr}`));
    });
  });
}
