/**
 * Client adapter — the single seam between the UI and the backend.
 *
 * Two backends:
 *  - Web  (`npm run dev` / `npm start`): calls the Next.js API routes
 *    under `/api/*`. The web app is a server app, so these routes exist.
 *  - Native (Android APK via Capacitor): calls the `KlipKlop` Capacitor
 *    plugin, which runs yt-dlp/Media3 on-device. There is no server, so
 *    `/api/*` does not exist in the WebView.
 *
 * The UI components must go through this module (not `fetch("/api/...")`)
 * so the same React tree runs unchanged on both targets.
 *
 * TypeScript note: `@capacitor/core` is only installed for the native
 * build. Guard every Capacitor access behind `isNative()` / the
 * `Capacitor` global so the web build type-checks without it.
 */

// ---------------------------------------------------------------------------
// Types — mirror the API route response shapes (see src/app/api/*)
// ---------------------------------------------------------------------------

export interface ProbeResult {
  title: string;
  duration: number;
  heights: number[];
  /** Direct mp4 stream URL for the preview player. */
  directUrl: string;
}

export interface DownloadParams {
  url: string;
  start: string; // "HH:mm:ss"
  end: string; // "HH:mm:ss"
  filename: string;
  height?: number;
  /** Optional session cookies (native "Advanced" menu). */
  cookies?: string;
}

export interface DownloadResult {
  file: string;
  /** Share URL (web) or content:// URI (native). */
  downloadUrl?: string;
  success?: boolean;
  error?: string;
}

export interface DownloadItem {
  token: string;
  file: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/** True when running inside the Capacitor Android app. */
export function isNative(): boolean {
  // Guard: in the web build `Capacitor` is undefined.
  const Capacitor = (
    globalThis as Record<string, unknown>
  ).Capacitor as
    | { isNativePlatform?: () => boolean }
    | undefined;
  return Boolean(Capacitor?.isNativePlatform?.());
}

// ---------------------------------------------------------------------------
// Plugin access — only touched on native; web path never calls it.
// ---------------------------------------------------------------------------

type KlipKlopCall = {
  probe: (opts: { url: string }) => Promise<ProbeResult>;
  downloadClip: (opts: DownloadParams) => Promise<DownloadResult>;
  listDownloads: () => Promise<{ downloads: DownloadItem[] }>;
  updateYtDlp: () => Promise<{ updated: boolean; version?: string }>;
  cancelDownload: () => Promise<{ cancelled: boolean }>;
  resolveLocalVideo: (opts: { filename: string }) => Promise<{ uri: string }>;
  shareFile: (opts: { filename: string }) => Promise<void>;
};

/** Capacitor plugin proxy; only defined on native. */
function plugin(): KlipKlopCall | null {
  if (!isNative()) return null;
  const cap = (globalThis as Record<string, unknown>).Capacitor as {
    Plugins: Record<string, KlipKlopCall>;
  };
  return cap.Plugins.KlipKlop ?? null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Read video info + resolve the direct stream URL for the preview. */
export async function probe(url: string): Promise<ProbeResult> {
  const p = plugin();
  if (p) return p.probe({ url });

  // Web: POST /api/info
  const res = await fetch("/api/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to read video info");
  return data as ProbeResult;
}

/** Download + clip a segment, then save the result. */
export async function downloadClip(
  params: DownloadParams,
): Promise<DownloadResult> {
  const p = plugin();
  if (p) return p.downloadClip(params);

  // Web: POST /api/download
  const res = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: params.url,
      start: params.start,
      end: params.end,
      filename: params.filename,
      height: params.height,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data as DownloadResult;
}

/** List recent downloads. */
export async function listDownloads(): Promise<DownloadItem[]> {
  const p = plugin();
  if (p) {
    const r = await p.listDownloads();
    return r.downloads;
  }

  // Web: GET /api/links
  const res = await fetch("/api/links");
  const data = await res.json();
  return (data.links || []) as DownloadItem[];
}

/** Check for a yt-dlp update and apply it (native only; web is a no-op). */
export async function updateYtDlp(): Promise<{
  updated: boolean;
  version?: string;
}> {
  const p = plugin();
  if (p) return p.updateYtDlp();
  return { updated: false };
}

/** Cancel an in-flight download (native only; web is a no-op). */
export async function cancelDownload(): Promise<boolean> {
  const p = plugin();
  if (p) return (await p.cancelDownload()).cancelled;
  return false;
}

/**
 * Resolve a <video> src for a downloaded file.
 *  - Native: a content:// URI the WebView can play directly.
 *  - Web: the range-serving API route.
 */
export async function resolveLocalVideo(
  filename: string,
): Promise<string> {
  const p = plugin();
  if (p) {
    const r = await p.resolveLocalVideo({ filename });
    return r.uri;
  }
  return `/api/video?file=${encodeURIComponent(filename)}`;
}

/** Share a downloaded file (native only; web uses the link route). */
export async function shareFile(filename: string): Promise<void> {
  const p = plugin();
  if (!p) return; // web: handled by the /api/d link instead
  await p.shareFile({ filename });
}
