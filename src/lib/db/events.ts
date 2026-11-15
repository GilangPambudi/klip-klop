import { and, count, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "./index";
import { blockedIps, events } from "./schema";

export type EventType = "load" | "login" | "signup" | "download" | "download_failed" | "rate_limited";

const RETENTION_DAYS = 30;

export async function logEvent(type: EventType, ip: string, userId: string | null, detail?: string) {
  try {
    await db().insert(events).values({
      type,
      ip: ip.slice(0, 45),
      userId,
      detail: detail?.slice(0, 255) ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Could not log event:", error);
  }
}

export async function pruneEvents() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db().delete(events).where(lt(events.createdAt, cutoff));
}

export async function lastLoginIps(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  try {
    const rows = await db()
      .select({ userId: events.userId, ip: events.ip })
      .from(events)
      .where(and(inArray(events.type, ["login", "signup"]), inArray(events.userId, userIds)))
      .orderBy(desc(events.createdAt));
    const result: Record<string, string> = {};
    for (const row of rows) {
      if (row.userId && !(row.userId in result)) result[row.userId] = row.ip;
    }
    return result;
  } catch (error) {
    console.error("Could not read login IPs:", error);
    return {};
  }
}

async function countByIp(type: EventType, since: Date, atLeast: number) {
  const total = count();
  return db()
    .select({ ip: events.ip, count: total })
    .from(events)
    .where(and(eq(events.type, type), gte(events.createdAt, since)))
    .groupBy(events.ip)
    .having(sql`${total} >= ${atLeast}`)
    .orderBy(desc(total));
}

async function countType(type: EventType, since: Date) {
  const [row] = await db()
    .select({ count: count() })
    .from(events)
    .where(and(eq(events.type, type), gte(events.createdAt, since)));
  return row?.count ?? 0;
}

export interface Thresholds {
  windowMinutes: number;
  signupsPerIp: number;
  loadsPerIp: number;
  failedDownloads: number;
}

export async function findAnomalies(t: Thresholds) {
  const now = Date.now();
  const window = new Date(now - t.windowMinutes * 60 * 1000);
  const day = new Date(now - 24 * 60 * 60 * 1000);

  const [signups, loads, rateLimited, failed] = await Promise.all([
    countByIp("signup", day, t.signupsPerIp),
    countByIp("load", window, t.loadsPerIp),
    countByIp("rate_limited", window, 1),
    countType("download_failed", window),
  ]);
  return { signups, loads, rateLimited, failed };
}

export async function isBlocked(ip: string) {
  try {
    const [row] = await db()
      .select({ ip: blockedIps.ip })
      .from(blockedIps)
      .where(and(eq(blockedIps.ip, ip), gt(blockedIps.expiresAt, new Date())));
    return Boolean(row);
  } catch (error) {
    console.error("Could not check blocked IPs:", error);
    return false;
  }
}

export async function listBlockedIps() {
  return db()
    .select()
    .from(blockedIps)
    .where(gt(blockedIps.expiresAt, new Date()))
    .orderBy(desc(blockedIps.createdAt));
}

export async function blockIp(ip: string, hours: number, reason: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
  await db()
    .insert(blockedIps)
    .values({ ip, reason, createdAt: now, expiresAt })
    .onDuplicateKeyUpdate({ set: { reason, createdAt: now, expiresAt } });
}

export async function unblockIp(ip: string) {
  await db().delete(blockedIps).where(eq(blockedIps.ip, ip));
}
