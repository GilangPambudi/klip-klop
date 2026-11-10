export type PlatformId = "youtube" | "tiktok" | "instagram";

interface Platform {
  id: PlatformId;
  label: string;
  hosts: string[];
  key: (url: URL, host: string) => string | null;
}

const first = (text: string, pattern: RegExp) => text.match(pattern)?.[1] ?? null;

export const PLATFORMS: Platform[] = [
  {
    id: "youtube",
    label: "YouTube",
    hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
    key: (url, host) =>
      host === "youtu.be"
        ? first(url.pathname, /^\/([A-Za-z0-9_-]{11})(?:\/|$)/)
        : (first(url.search, /[?&]v=([A-Za-z0-9_-]{11})(?:&|$)/) ??
          first(url.pathname, /^\/(?:v|embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/)),
  },
  {
    id: "tiktok",
    label: "TikTok",
    hosts: ["tiktok.com"],
    key: (url, host) =>
      host === "vm.tiktok.com" || host === "vt.tiktok.com"
        ? first(url.pathname, /^\/([A-Za-z0-9]{8,})\/?$/)
        : (first(url.pathname, /\/video\/(\d{15,})(?:\/|$)/) ??
          first(url.pathname, /^\/t\/([A-Za-z0-9]{8,})\/?$/)),
  },
  {
    id: "instagram",
    label: "Instagram",
    hosts: ["instagram.com"],
    key: (url) =>
      first(url.pathname, /\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})(?:\/|$)/),
  },
];

export const platformLabel = (id: PlatformId) =>
  PLATFORMS.find((p) => p.id === id)!.label;

export interface ParsedLink {
  platform: PlatformId | null;
  key: string | null;
  url: string;
  hasPath: boolean;
}

export function parseLink(input: string): ParsedLink | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!url.hostname.includes(".")) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const hasPath = url.pathname.length > 1 || url.search.length > 1;
  const platform = PLATFORMS.find((p) =>
    p.hosts.some((h) => host === h || host.endsWith(`.${h}`)),
  );
  if (!platform) return { platform: null, key: null, url: url.href, hasPath };

  const key = platform.key(url, host);
  return {
    platform: platform.id,
    key: key ? `${platform.id}:${key}` : null,
    url: url.href,
    hasPath,
  };
}
