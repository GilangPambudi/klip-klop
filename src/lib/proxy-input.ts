import { isProxyUrl, parsePlatforms } from "./proxies";

interface ProxyValues {
  name?: string;
  url?: string;
  enabled?: boolean;
  platforms?: string;
}

export function readProxyInput(
  body: unknown,
  creating: boolean,
): { values: ProxyValues } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const input = body as Record<string, unknown>;
  const values: ProxyValues = {};

  if ("name" in input || creating) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name || name.length > 60) return { error: "Name must be 1 to 60 characters" };
    values.name = name;
  }

  if ("url" in input || creating) {
    const url = typeof input.url === "string" ? input.url.trim() : "";
    if (!isProxyUrl(url) || url.length > 255) {
      return { error: "Proxy must look like http://host:port" };
    }
    values.url = url;
  }

  if ("enabled" in input) {
    if (typeof input.enabled !== "boolean") return { error: "enabled must be true or false" };
    values.enabled = input.enabled;
  }

  if ("platforms" in input || creating) {
    const list = Array.isArray(input.platforms) ? input.platforms : ["youtube"];
    const platforms = parsePlatforms(list.filter((p) => typeof p === "string").join(","));
    if (platforms.length === 0) return { error: "Pick at least one platform" };
    values.platforms = platforms.join(",");
  }

  return { values };
}
