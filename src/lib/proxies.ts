import { asc, eq } from "drizzle-orm";
import { db } from "./db/index";
import { proxies } from "./db/schema";
import { parseLink, PLATFORMS, type PlatformId } from "./platforms";

export type Proxy = typeof proxies.$inferSelect;

const PROXY_URL = /^(https?|socks5h?):\/\/([^\s/@]+@)?[^\s/:@]+(:\d{1,5})?\/?$/i;

const RETRYABLE =
  /403|Forbidden|proxy|Unable to connect|Connection (refused|reset)|timed out|Tunnel connection failed|not a bot|Sign in to confirm|ffmpeg exited with code 8|Network is unreachable|Temporary failure in name resolution/i;

export function isProxyUrl(url: string) {
  return PROXY_URL.test(url.trim());
}

export function parsePlatforms(value: string): PlatformId[] {
  const ids = PLATFORMS.map((p) => p.id);
  return value
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is PlatformId => (ids as string[]).includes(p));
}

export async function listProxies() {
  return db().select().from(proxies).orderBy(asc(proxies.position), asc(proxies.id));
}

async function chainFor(platform: PlatformId) {
  try {
    const rows = await db()
      .select()
      .from(proxies)
      .where(eq(proxies.enabled, true))
      .orderBy(asc(proxies.position), asc(proxies.id));
    return rows.filter((row) => parsePlatforms(row.platforms).includes(platform));
  } catch (error) {
    console.error("Proxies unavailable, going direct:", error);
    return [];
  }
}

export async function withProxies<T>(
  url: string,
  run: (proxyArgs: string[]) => Promise<T>,
): Promise<T> {
  const platform = parseLink(url)?.platform;
  const chain = platform ? await chainFor(platform) : [];
  if (chain.length === 0) return run([]);

  let lastError: unknown;
  for (const proxy of chain) {
    try {
      return await run(["--proxy", proxy.url]);
    } catch (error) {
      lastError = error;
      const text = error instanceof Error ? error.message : String(error);
      if (!RETRYABLE.test(text)) throw error;
      console.error(`Proxy "${proxy.name}" failed, trying the next one`);
    }
  }
  throw lastError;
}
