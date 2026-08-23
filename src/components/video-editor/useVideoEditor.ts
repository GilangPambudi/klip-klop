import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import * as client from "@/lib/client";

export interface ActiveLink {
  token: string;
  file: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

export function useVideoEditor() {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  // Direct stream URL (no YouTube iframe) for the preview player.
  const [previewUrl, setPreviewUrl] = useState("");

  // Downloaded File path (just filename)
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(
    null,
  );

  // Split Time State
  const [startH, setStartH] = useState("0");
  const [startM, setStartM] = useState("0");
  const [startS, setStartS] = useState("0");
  const [endH, setEndH] = useState("0");
  const [endM, setEndM] = useState("0");
  const [endS, setEndS] = useState("0");

  const [isDownloading, setIsDownloading] = useState(false);

  // Video info from yt-dlp probe
  const [title, setTitle] = useState("");
  const [heights, setHeights] = useState<number[]>([]);
  const [selectedHeight, setSelectedHeight] = useState<string>("");
  const [isProbing, setIsProbing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [recentLinks, setRecentLinks] = useState<ActiveLink[]>([]);
  const [customFilename, setCustomFilename] = useState<string | null>(null);

  // Native-only "Advanced" session cookies (name=value; ...). Not persisted
  // (per-session, per PRD OQ3) — cleared on app restart.
  const [advancedCookies, setAdvancedCookies] = useState("");

  // Native (APK) vs web: drive UI deltas (hide desktop-only controls, etc.)
  const isNative = client.isNative();

  // Native download progress (yt-dlp / trim / save), surfaced from the plugin.
  const [downloadProgress, setDownloadProgress] = useState<{
    phase: string;
    percent?: number;
    message?: string;
  } | null>(null);

  // Refs
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const refreshLinks = () =>
    client
      .listDownloads()
      .then((links) => setRecentLinks(links))
      .catch(() => {
        // Non-critical; the list just stays as-is.
      });

  // Opening the download folder only makes sense on the machine running the
  // server, so hide it when the app is reached over the network.
  const isLocalhost = useSyncExternalStore(
    () => () => {},
    () => ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname),
    () => true,
  );

  useEffect(() => {
    void refreshLinks();
  }, []);

  // Receive the native <video> element from the <VideoPlayer> component.
  const handlePlayer = (player: HTMLVideoElement | null) => {
    playerRef.current = player;
    if (!player) return;

    // Track play/pause so the trim end-time auto-pause works for both
    // streamed YouTube and local mp4 playback.
    player.removeEventListener("playing", handlePlayerPlaying);
    player.removeEventListener("pause", handlePlayerPaused);
    player.addEventListener("playing", handlePlayerPlaying);
    player.addEventListener("pause", handlePlayerPaused);
  };

  const handlePlayerPlaying = () => setIsPlaying(true);
  const handlePlayerPaused = () => setIsPlaying(false);

  // Auto-Load
  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      const newId = match[2];
      if (newId !== videoId) {
        setVideoId(newId);
        setDownloadedFilename(null);
        setDownloadUrl(null);
        setCustomFilename(null);
        probeVideo(url);

        // On mobile the header pushes the player off-screen, so dismiss the
        // keyboard and bring the video and its controls into view.
        if (window.matchMedia("(max-width: 1023px)").matches) {
          (document.activeElement as HTMLElement | null)?.blur();
          requestAnimationFrame(() =>
            contentRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          );
        }
      }
    }
  };

  // One round-trip: validates the URL, reads video info, and resolves the
  // preview stream URL. Runs when a (new) URL is pasted.
  const probeVideo = async (url: string) => {
    setIsProbing(true);
    setPreviewUrl("");
    setHeights([]);
    try {
      const data = await client.probe(url);

      setTitle(data.title || "");
      setHeights(data.heights || []);
      setSelectedHeight(
        data.heights?.length ? String(data.heights[0]) : "best",
      );
      setPreviewUrl(data.directUrl || "");
      // Only announce success once info + preview are actually ready.
      toast.success("Video loaded!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Probe failed";
      toast.error(`Could not load video: ${message}`);
      setSelectedHeight("best");
    } finally {
      setIsProbing(false);
    }
  };


  const getSeconds = (h: string, m: string, s: string) => {
    return (
      (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0)
    );
  };

  const getformattedTime = (h: string, m: string, s: string) => {
    const hh = (parseInt(h) || 0).toString().padStart(2, "0");
    const mm = (parseInt(m) || 0).toString().padStart(2, "0");
    const ss = (parseInt(s) || 0).toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const toUnderscore = (text: string) =>
    text
      .trim()
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_+|_+$/g, "");

  // Title_With_Underscores-75s-1080p
  const buildFilename = () => {
    if (!title) return "";

    const startSec = getSeconds(startH, startM, startS);
    const endSec = getSeconds(endH, endM, endS);
    const clipLength = endSec > startSec ? endSec - startSec : 0;

    const duration = clipLength > 0 ? `${clipLength}s` : "full";
    const res = selectedHeight && selectedHeight !== "best"
      ? `${selectedHeight}p`
      : "best";

    return `${toUnderscore(title)}-${duration}-${res}`;
  };

  // Derived during render: the generated name tracks the title, trim range and
  // resolution until the user types their own.
  const filename = customFilename ?? buildFilename();

  const handleFilenameChange = (value: string) => {
    setCustomFilename(value);
  };


  // Auto-pause
  useEffect(() => {
    if (isPlaying && !downloadedFilename) {
      intervalRef.current = setInterval(() => {
        const player = playerRef.current;
        if (!player) return;
        const currentTime = player.currentTime;
        const outSeconds = getSeconds(endH, endM, endS);
        if (outSeconds > 0 && currentTime >= outSeconds) {
          player.pause();
          setIsPlaying(false);
        }
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current!);
  }, [isPlaying, endH, endM, endS, downloadedFilename]);

  const syncCurrentTime = (isStart: boolean) => {
    if (downloadedFilename) return;
    const player = playerRef.current;
    if (!player) return;
    const curr = Math.floor(player.currentTime);
    const h = Math.floor(curr / 3600).toString();
    const m = Math.floor((curr % 3600) / 60).toString();
    const s = Math.floor(curr % 60).toString();
    if (isStart) {
      setStartH(h);
      setStartM(m);
      setStartS(s);
    } else {
      setEndH(h);
      setEndM(m);
      setEndS(s);
    }
  };

  const handleDownload = async () => {
    if (!videoId) {
      toast.error("Load a video first!");
      return;
    }

    setIsDownloading(true);
    setDownloadUrl(null);
    const finalFilename = filename.trim() || `clip-${Date.now()}`;
    const startStr = getformattedTime(startH, startM, startS);
    const endStr = getformattedTime(endH, endM, endS);

    const promise = client
      .downloadClip({
        url: videoUrl,
        start: startStr,
        end: endStr,
        filename: finalFilename,
        height:
          selectedHeight === "best" ? undefined : Number(selectedHeight),
        // Native only; web ignores it.
        cookies: advancedCookies,
      })
      .then((data) => {
        if (!data.success && data.error) throw new Error(data.error);
        return data;
      });

    toast.promise(promise, {
      loading: "Downloading...",
      success: (data) => {
        setIsDownloading(false);
        setDownloadProgress(null);
        if (data.file) setDownloadedFilename(data.file);
        if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
        refreshLinks();
        return `Download complete: ${data.file}`;
      },
      error: (err) => {
        setIsDownloading(false);
        setDownloadProgress(null);
        return `Error: ${err.message}`;
      },
    });
  };

  /** Cancel an in-flight download (native). */
  const handleCancelDownload = async () => {
    await client.cancelDownload();
    setIsDownloading(false);
    setDownloadProgress(null);
    toast.info("Download cancelled");
  };

  // Native-only: subscribe to progress events from the KlipKlop plugin.
  useEffect(() => {
    if (!isNative) return;
    const cap = (globalThis as Record<string, unknown>).Capacitor as {
      Plugins: {
        KlipKlop: {
          addListener?: (
            name: string,
            cb: (e: {
              phase: string;
              percent?: number;
              message?: string;
            }) => void,
          ) => { remove: () => void };
        };
      };
    };
    const plugin = cap.Plugins.KlipKlop;
    if (!plugin?.addListener) return;
    const h = plugin.addListener("progress", (e) =>
      setDownloadProgress({
        phase: e.phase,
        percent: e.percent,
        message: e.message,
      }),
    );
    return () => h.remove();
  }, [isNative]);

  const handlePreview = () => {
    const player = playerRef.current;
    if (player) {
      player.currentTime = getSeconds(startH, startM, startS);
      void player.play();
    }
  };

  const handleStopServer = async () => {
    // Native: there is no server to stop; the control is hidden anyway.
    if (isNative) return;
    toast.info("Stopping server...");

    // Fire and forget shutdown request
    fetch("/api/shutdown", { method: "POST" }).catch((err) =>
      console.error("Shutdown request failed (expected):", err),
    );

    // Replace body with offline UI
    setTimeout(() => {
      document.body.innerHTML = `
            <div class="fixed inset-0 bg-background flex flex-col items-center justify-center space-y-4 text-center p-4 animate-in fade-in duration-300">
              <div class="rounded-base border-2 border-border bg-secondary-background shadow-shadow p-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-12 w-12 text-main"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77 0"/></svg>
              </div>
              <h1 class="text-2xl font-bold">Server Stopped</h1>
              <p class="text-foreground/50">The server has been stopped. You can now close this tab.</p>
            </div>
        `;
    }, 500);
  };

  const handleOpenFolder = async () => {
    // Native: files live in the Android Gallery/MediaStore, not a folder.
    if (isNative) return;
    await fetch("/api/open-folder", { method: "POST" });
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    e.target.select();

  return {
    state: {
      videoUrl,
      videoId,
      previewUrl,
      isPlaying,
      downloadedFilename,
      isDownloading,
      filename,
      heights,
      selectedHeight,
      isProbing,
      downloadUrl,
      recentLinks,
      isLocalhost,
      isNative,
      downloadProgress,
      advancedCookies,
      time: {
        start: { h: startH, m: startM, s: startS },
        end: { h: endH, m: endM, s: endS },
      },
    },
    setters: {
      setVideoUrl: handleUrlChange,
      setDownloadedFilename,
      setFilename: handleFilenameChange,
      setSelectedHeight,
      setStartH,
      setStartM,
      setStartS,
      setEndH,
      setEndM,
      setEndS,
      setAdvancedCookies,
    },
    actions: {
      handleStopServer,
      handleDownload,
      handlePreview,
      handleOpenFolder,
      handleInputFocus,
      syncCurrentTime,
      handlePlayer,
      handleCancelDownload,
    },
    contentRef,
  };
}
