import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { cookieArgs } from "./cookies";
import { parseLink } from "./platforms";
import { withProxies } from "./proxies";
import { INFO_FORMAT_ARGS, resolveBinary, runTool, YTDLP_COMMON_ARGS } from "./runtime";

const execFileAsync = promisify(execFile);

export type YtdlpChannel = "stable" | "nightly";

export interface YtdlpStatus {
  path: string;
  version: string | null;
  channel: YtdlpChannel | null;
  backupVersion: string | null;
  latestStable: string | null;
}

export interface YtdlpTestResult {
  ok: boolean;
  title: string | null;
  ms: number;
  error: string | null;
  warnings: string[];
  hint: string | null;
}

const binary = () => resolveBinary("yt-dlp").command;
const backupOf = (bin: string) => `${bin}.bak`;

const channelOf = (version: string): YtdlpChannel => (version.split(".").length > 3 ? "nightly" : "stable");

async function versionOf(bin: string) {
  try {
    const { stdout } = await execFileAsync(bin, ["--version"], { timeout: 30_000, windowsHide: true });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function latestStable() {
  try {
    const res = await fetch("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const data = await res.json();
    return typeof data?.tag_name === "string" ? data.tag_name : null;
  } catch {
    return null;
  }
}

export async function ytdlpStatus(): Promise<YtdlpStatus> {
  const bin = binary();
  const backup = backupOf(bin);
  const [version, backupVersion, latest] = await Promise.all([
    versionOf(bin),
    fs.existsSync(backup) ? versionOf(backup) : null,
    latestStable(),
  ]);
  return {
    path: bin,
    version,
    channel: version ? channelOf(version) : null,
    backupVersion,
    latestStable: latest,
  };
}

function canWrite(dir: string) {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function privileged(bin: string, command: string, args: string[]) {
  const [cmd, argv] = canWrite(path.dirname(bin)) ? [command, args] : ["sudo", ["-n", command, ...args]];
  try {
    const { stdout, stderr } = await execFileAsync(cmd, argv, { timeout: 180_000, windowsHide: true });
    return `${stdout}${stderr}`.trim();
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() || err.message || String(error);
    throw new Error(/a password is required|sudo:/i.test(output)
      ? `The app cannot write ${bin}: it needs passwordless sudo for this.`
      : output);
  }
}

let busy = false;

async function exclusive<T>(work: () => Promise<T>) {
  if (busy) throw new Error("Another yt-dlp update or rollback is still running.");
  busy = true;
  try {
    return await work();
  } finally {
    busy = false;
  }
}

export function updateYtdlp(channel: YtdlpChannel) {
  return exclusive(async () => {
    if (process.platform === "win32") throw new Error("Updating from /config only works on the Linux server.");
    const bin = binary();
    const current = await versionOf(bin);
    if (channel === "stable" && current && current === (await latestStable())) {
      return `Already on the newest stable (${current}).`;
    }
    await privileged(bin, "cp", ["-p", bin, backupOf(bin)]);
    return privileged(bin, bin, ["--update-to", channel]);
  });
}

export function rollbackYtdlp() {
  return exclusive(async () => {
    if (process.platform === "win32") throw new Error("Rollback from /config only works on the Linux server.");
    const bin = binary();
    const backup = backupOf(bin);
    if (!fs.existsSync(backup)) throw new Error("There is no previous version to go back to.");
    const swap = `${bin}.swap`;
    await privileged(bin, "cp", ["-p", bin, swap]);
    await privileged(bin, "mv", ["-f", backup, bin]);
    await privileged(bin, "mv", ["-f", swap, backup]);
    return "Swapped the current and previous versions.";
  });
}

export function hintFor(text: string): string | null {
  if (/n challenge|signature|Requested format is not available|nsig/i.test(text)) {
    return "yt-dlp cannot read this player yet. Update to stable; if that is already the newest, try nightly.";
  }
  if (/Sign in to confirm|not a bot|cookies|login required/i.test(text)) {
    return "The platform wants a login. Replace the YouTube cookies above.";
  }
  if (/403|Forbidden|timed out|Unable to connect|Connection (refused|reset)|Tunnel connection failed|proxy/i.test(text)) {
    return "The server or proxy is refused or unreachable. Test the proxies in the Proxies tab.";
  }
  return null;
}

const TEST_TIMEOUT_MS = 2 * 60 * 1000;

export async function testYtdlp(rawUrl: string): Promise<YtdlpTestResult> {
  const link = parseLink(rawUrl);
  if (!link?.platform || !link.key) throw new Error("This link is not supported");
  const url = link.url;
  const started = Date.now();
  try {
    const cookies = await cookieArgs(url);
    const { stdout, stderr } = await withProxies(url, (proxyArgs) =>
      runTool("yt-dlp", [
        ...YTDLP_COMMON_ARGS,
        url,
        ...cookies,
        ...proxyArgs,
        "--no-playlist",
        ...INFO_FORMAT_ARGS,
        "--print",
        "%(title)s",
      ], { timeoutMs: TEST_TIMEOUT_MS }),
    );
    const warnings = stderr.split(/\r?\n/).filter((l) => l.startsWith("WARNING:")).slice(0, 5);
    return {
      ok: true,
      title: stdout.split(/\r?\n/).find(Boolean) ?? null,
      ms: Date.now() - started,
      error: null,
      warnings,
      hint: warnings.length ? hintFor(warnings.join("\n")) : null,
    };
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const lines = text.split(/\r?\n/);
    return {
      ok: false,
      title: null,
      ms: Date.now() - started,
      error: lines.filter((l) => l.startsWith("ERROR:")).at(-1) ?? lines[0],
      warnings: lines.filter((l) => l.startsWith("WARNING:")).slice(0, 5),
      hint: hintFor(text),
    };
  }
}
