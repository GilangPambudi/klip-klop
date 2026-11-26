import fs from "fs";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "./db/index";
import { config } from "./db/schema";
import { parseLink } from "./platforms";

const COOKIE_FILE = path.join(os.tmpdir(), "klip-klop-instagram-cookies.txt");
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

async function instagramSessionId() {
  try {
    const rows = await db()
      .select()
      .from(config)
      .where(eq(config.name, "instagram_sessionid"));
    const value = rows[0]?.value.trim() ?? "";
    return /^[\w%:.-]+$/.test(value) ? value : "";
  } catch (error) {
    console.error("Instagram session unavailable:", error);
    return "";
  }
}

const youtubeCookieFile = () => process.env.YT_DLP_COOKIES?.trim() || "";

export const YOUTUBE_COOKIES_MAX_BYTES = 100_000;

export interface YoutubeCookieStatus {
  configured: boolean;
  exists: boolean;
  updatedAt: string | null;
  cookies: number;
  expiresAt: string | null;
}

const youtubeLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/^#HttpOnly_/, "").split("\t"))
    .filter((cols) => cols.length >= 7 && /(^|\.)youtube\.com$/.test(cols[0]));

export function youtubeCookieStatus(): YoutubeCookieStatus {
  const file = youtubeCookieFile();
  if (!file || !fs.existsSync(file)) {
    return { configured: !!file, exists: false, updatedAt: null, cookies: 0, expiresAt: null };
  }
  const lines = youtubeLines(fs.readFileSync(file, "utf8"));
  const login = lines.filter((cols) => /^(__Secure-[13]PSID|SID|SAPISID)$/.test(cols[5]));
  const expiry = login.map((cols) => Number(cols[4])).filter((n) => n > 0);
  return {
    configured: true,
    exists: true,
    updatedAt: fs.statSync(file).mtime.toISOString(),
    cookies: lines.length,
    expiresAt: expiry.length ? new Date(Math.min(...expiry) * 1000).toISOString() : null,
  };
}

export function saveYoutubeCookies(text: string) {
  const file = youtubeCookieFile();
  if (!file) throw new Error("YT_DLP_COOKIES is not set in .env, so there is no cookie file to write.");
  if (Buffer.byteLength(text) > YOUTUBE_COOKIES_MAX_BYTES) throw new Error("That file is too big for a cookie file.");
  if (youtubeLines(text).length === 0) {
    throw new Error("No youtube.com cookies found. Export cookies.txt (Netscape format) while signed in to YouTube.");
  }
  const body = text.startsWith("# Netscape HTTP Cookie File") ? text : `# Netscape HTTP Cookie File\n${text}`;
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, body.endsWith("\n") ? body : `${body}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

export async function cookieArgs(url: string): Promise<string[]> {
  const platform = parseLink(url)?.platform;
  if (platform === "youtube") {
    const file = youtubeCookieFile();
    return file && fs.existsSync(file) ? ["--cookies", file] : [];
  }
  if (platform !== "instagram") return [];

  const sessionId = await instagramSessionId();
  if (!sessionId) return [];

  const expires = Math.floor(Date.now() / 1000) + ONE_YEAR_SECONDS;
  fs.writeFileSync(
    COOKIE_FILE,
    `# Netscape HTTP Cookie File\n.instagram.com\tTRUE\t/\tTRUE\t${expires}\tsessionid\t${sessionId}\n`,
    { mode: 0o600 },
  );
  return ["--cookies", COOKIE_FILE];
}
