// No imports on purpose: plain `node --test` loads this file directly.

/**
 * The start position a YouTube link carries, in seconds, or 0 when it has none.
 * Reads `t` and `start`, in the query or after the #: 181, 181s, 3m1s, 1h2m3s.
 */
export function linkStartSeconds(url: string) {
  const match = url.match(/[?&#](?:t|start)=([0-9hms]+)/i);
  if (!match) return 0;
  const value = match[1].toLowerCase();

  if (/^\d+s?$/.test(value)) return parseInt(value, 10);

  const parts = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!parts) return 0;
  return (
    Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0)
  );
}

/** 181 -> "3:01", 3723 -> "1:02:03". */
export function formatClock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
