import { isIP } from "net";

export const MAX_BLOCK_HOURS = 24 * 365;

export function readBlockInput(body: unknown): { ip: string; hours: number; reason: string } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const input = body as Record<string, unknown>;

  const ip = typeof input.ip === "string" ? input.ip.trim() : "";
  if (!isIP(ip)) return { error: "That is not an IP address" };

  const hours = input.hours === undefined ? 24 : input.hours;
  if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 1 || hours > MAX_BLOCK_HOURS) {
    return { error: `Hours must be a whole number from 1 to ${MAX_BLOCK_HOURS}` };
  }

  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 255) : "";
  return { ip, hours, reason };
}
