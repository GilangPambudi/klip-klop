import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DOWNLOAD_DIR } from "./downloader";

const REGISTRY_PATH = path.join(DOWNLOAD_DIR, ".links.json");
const TTL_MS =
  Number(process.env.DOWNLOAD_RETENTION_HOURS ?? 24) * 60 * 60 * 1000;

if (!Number.isFinite(TTL_MS) || TTL_MS <= 0) {
  throw new Error("DOWNLOAD_RETENTION_HOURS must be a positive number");
}

interface LinkEntry {
  file: string;
  createdAt: number;
}

type Registry = Record<string, LinkEntry>;

function readRegistry(): Registry {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")) as Registry;
  } catch {
    return {};
  }
}

function writeRegistry(registry: Registry) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

export function createLink(file: string) {
  const token = crypto.randomBytes(9).toString("base64url");
  const registry = readRegistry();
  registry[token] = { file, createdAt: Date.now() };
  writeRegistry(registry);
  return token;
}

export function resolveLink(token: string) {
  const entry = readRegistry()[token];
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) return null;

  // The registry stores a bare filename, but treat it as untrusted anyway.
  const filePath = path.join(DOWNLOAD_DIR, path.basename(entry.file));
  if (!fs.existsSync(filePath)) return null;

  return { filePath, filename: path.basename(entry.file) };
}

export interface ActiveLink {
  token: string;
  file: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

/** Links whose file still exists and whose retention window has not closed. */
export function listLinks(): ActiveLink[] {
  const cutoff = Date.now() - TTL_MS;
  const links: ActiveLink[] = [];

  for (const [token, entry] of Object.entries(readRegistry())) {
    if (entry.createdAt < cutoff) continue;

    const filePath = path.join(DOWNLOAD_DIR, path.basename(entry.file));
    try {
      links.push({
        token,
        file: path.basename(entry.file),
        createdAt: entry.createdAt,
        expiresAt: entry.createdAt + TTL_MS,
        size: fs.statSync(filePath).size,
      });
    } catch {
      // File is gone; skip it.
    }
  }

  return links.sort((a, b) => b.createdAt - a.createdAt);
}

/** Deletes downloads and link entries after the configured retention period. */
export function sweepExpired() {
  if (!fs.existsSync(DOWNLOAD_DIR)) return;

  const cutoff = Date.now() - TTL_MS;

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

  const registry = readRegistry();
  const kept: Registry = {};
  for (const [token, entry] of Object.entries(registry)) {
    const stillThere = fs.existsSync(
      path.join(DOWNLOAD_DIR, path.basename(entry.file)),
    );
    if (entry.createdAt >= cutoff && stillThere) kept[token] = entry;
  }
  if (Object.keys(kept).length !== Object.keys(registry).length) {
    writeRegistry(kept);
  }
}
