import fs from "fs";
import type { NextRequest } from "next/server";
import { DOWNLOAD_DIR } from "./downloader";

export type Tier = "guest" | "member" | "unlimited";

const WINDOW_MS = 10 * 60 * 1000;

interface GuardState {
  hits: Map<string, number[]>;
  active: number;
  busyAccounts: Set<string>;
}

const globalGuard = globalThis as typeof globalThis & { __klipKlopGuard?: GuardState };
const state: GuardState = (globalGuard.__klipKlopGuard ??= {
  hits: new Map<string, number[]>(),
  active: 0,
  busyAccounts: new Set<string>(),
});

export function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const last = forwarded
    ?.split(",")
    .map((ip) => ip.trim())
    .filter(Boolean)
    .at(-1);
  return last || "local";
}

export function tierOf(account: { credits: number | null; admin: boolean } | null): Tier {
  if (!account) return "guest";
  return account.credits === null || account.admin ? "unlimited" : "member";
}

export function allowHit(key: string, limit: number) {
  const now = Date.now();
  const recent = (state.hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  const allowed = recent.length < limit;
  if (allowed) recent.push(now);
  state.hits.set(key, recent);

  if (state.hits.size > 10_000) {
    for (const [k, times] of state.hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) state.hits.delete(k);
    }
  }
  return allowed;
}

export function startJob(max: number, ignoreLimit: boolean): (() => void) | null {
  if (!ignoreLimit && state.active >= max) return null;
  state.active += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.active -= 1;
  };
}

export function claimAccount(id: string): (() => void) | null {
  if (state.busyAccounts.has(id)) return null;
  state.busyAccounts.add(id);
  return () => {
    state.busyAccounts.delete(id);
  };
}

export function activeJobs() {
  return state.active;
}

export function freeDiskGb() {
  try {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    const stats = fs.statfsSync(DOWNLOAD_DIR);
    return (stats.bavail * stats.bsize) / 1024 ** 3;
  } catch {
    return Infinity;
  }
}

export const MESSAGES = {
  lowDisk: "The server is short on disk space right now. Try again later.",
  busy: "The server is busy with other videos. Try again in a minute.",
  guestLimit: "You've loaded a lot of videos. Wait a few minutes, or log in to load more.",
  memberLimit: "You've loaded a lot of videos. Wait a few minutes.",
};
