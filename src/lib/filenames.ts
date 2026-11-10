// How downloads are named on disk. No imports on purpose: plain `node --test` loads this file directly.

/**
 * YouTube titles reach the filename, so anything outside this set (path
 * separators, "..", control characters) must not survive.
 */
export function sanitizeFilename(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");

  // Filesystems cap a name at 255 bytes; leave room for the owner prefix, " (n)" and the extension.
  return cleaned.slice(0, 200) || "clip";
}

/** "discord:123" -> "discord_123". Every file an account makes starts with this. */
function ownerPrefix(owner: string) {
  return owner.replace(/[^A-Za-z0-9]+/g, "_");
}

/** True when the file on disk was made by this account. */
export function ownsFile(owner: string, file: string) {
  return file.startsWith(`${ownerPrefix(owner)}-`);
}

/** The name people see: the file without its owner prefix. */
export function displayName(owner: string, file: string) {
  return ownsFile(owner, file) ? file.slice(ownerPrefix(owner).length + 1) : file;
}

/**
 * Extension-less name for a new download: "<owner>-<name>", or "<owner>-<name> (2)",
 * "(3)"… when that one is taken. `taken` is the current content of the download folder.
 */
export function uniqueBase(owner: string, name: string, taken: string[]) {
  // A base never contains a dot, so cutting at the first one also matches the
  // temp files (name.f137.mp4.part) of a download that is still running.
  const stems = new Set(taken.map((file) => file.split(".")[0]));
  const base = `${ownerPrefix(owner)}-${sanitizeFilename(name || "clip")}`;
  if (!stems.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`;
    if (!stems.has(candidate)) return candidate;
  }
}
