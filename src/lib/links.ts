import crypto from "crypto";
import fs from "fs";
import path from "path";
import { and, desc, eq, gt } from "drizzle-orm";
import { DOWNLOAD_DIR } from "./downloader";
import { displayName } from "./filenames";
import { db } from "./db/index";
import { downloads } from "./db/schema";
import { getConfig } from "./db/config";

/** How long a finished download lives, from `retention_hours` in the config table. */
async function retentionMs() {
  return (await getConfig()).retentionHours * 60 * 60 * 1000;
}

interface NewLink {
  /** Name on disk, as returned by downloadPart. */
  file: string;
  owner: string;
  sourceUrl: string;
  start: string;
  end: string;
  format: string;
}

export async function createLink({ file, owner, sourceUrl, start, end, format }: NewLink) {
  const token = crypto.randomBytes(9).toString("base64url");
  const now = Date.now();
  await db().insert(downloads).values({
    token,
    userId: owner,
    file,
    sourceUrl: sourceUrl.slice(0, 512),
    startTime: start,
    endTime: end,
    format,
    createdAt: new Date(now),
    expiresAt: new Date(now + (await retentionMs())),
  });
  return token;
}

export async function resolveLink(token: string) {
  const [row] = await db()
    .select()
    .from(downloads)
    .where(and(eq(downloads.token, token), gt(downloads.expiresAt, new Date())));
  if (!row) return null;

  // The row stores a bare filename, but treat it as untrusted anyway.
  const filePath = path.join(DOWNLOAD_DIR, path.basename(row.file));
  if (!fs.existsSync(filePath)) return null;

  return { filePath, filename: displayName(row.userId, path.basename(row.file)) };
}

export interface ActiveLink {
  token: string;
  /** Name on disk; what /api/video?file= expects. */
  file: string;
  /** Name to show: the file without its owner prefix. */
  name: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

/** The owner's links whose file still exists and whose retention window has not closed. */
export async function listLinks(owner: string): Promise<ActiveLink[]> {
  const rows = await db()
    .select()
    .from(downloads)
    .where(and(eq(downloads.userId, owner), gt(downloads.expiresAt, new Date())))
    .orderBy(desc(downloads.createdAt));

  const links: ActiveLink[] = [];
  for (const row of rows) {
    const file = path.basename(row.file);
    try {
      links.push({
        token: row.token,
        file,
        name: displayName(owner, file),
        createdAt: row.createdAt.getTime(),
        expiresAt: row.expiresAt.getTime(),
        size: fs.statSync(path.join(DOWNLOAD_DIR, file)).size,
      });
    } catch {
      // File is gone; skip it.
    }
  }
  return links;
}

/**
 * Deletes a download now. The file goes; the row stays as history, marked
 * expired. Returns false for an unknown token, someone else's, or one already gone.
 */
export async function deleteLink(token: string, owner: string) {
  const now = new Date();
  const [row] = await db()
    .select()
    .from(downloads)
    .where(
      and(
        eq(downloads.token, token),
        eq(downloads.userId, owner),
        gt(downloads.expiresAt, now),
      ),
    );
  if (!row) return false;

  const file = path.basename(row.file);
  fs.rmSync(path.join(DOWNLOAD_DIR, file), { force: true });
  await db().update(downloads).set({ expiresAt: now }).where(eq(downloads.token, token));
  console.log(`> Deleted download: ${file}`);
  return true;
}

/**
 * Deletes downloaded files older than the retention period. Their rows stay as history.
 * It goes by file age and the current setting, so shortening the retention also
 * removes files made under the longer one.
 */
export async function sweepExpired() {
  if (!fs.existsSync(DOWNLOAD_DIR)) return;

  const cutoff = Date.now() - (await retentionMs());

  for (const name of fs.readdirSync(DOWNLOAD_DIR)) {
    if (name.startsWith(".")) continue;
    const filePath = path.join(DOWNLOAD_DIR, name);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile() && stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        console.log(`> Swept expired file: ${name}`);
      }
    } catch {
      // File vanished mid-sweep; nothing to do.
    }
  }
}
