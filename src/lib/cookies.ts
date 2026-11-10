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

export async function cookieArgs(url: string): Promise<string[]> {
  if (parseLink(url)?.platform !== "instagram") return [];

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
