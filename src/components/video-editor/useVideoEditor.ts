import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AUTH_CHANNEL } from "@/lib/utils";
import { formatClock, linkStartSeconds } from "@/lib/youtube";
import { isAudioFormat, type MediaFormat } from "@/lib/formats";
import { parseLink, type PlatformId } from "@/lib/platforms";

export type PlatformChoice = "auto" | PlatformId;

export interface ActiveLink {
  token: string;
  /** Name on disk, used to play it back. */
  file: string;
  /** Name to show. */
  name: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

// Clip settings parked here while the visitor is away at the sign-in provider.
const DRAFT_KEY = "klip-klop-draft";

export function useVideoEditor(
  needsLogin: boolean,
  initialCredits: number | null,
  defaultHeight: number | null,
) {
  const router = useRouter();
  // The balance from the page load, until a download reports a newer one.
  // null = an account that is never charged (or sign-in is off).
  const [latestCredits, setCredits] = useState<number | undefined>();
  const credits = latestCredits ?? initialCredits;
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [platformChoice, setPlatformChoice] = useState<PlatformChoice>("auto");
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
  const [format, setFormat] = useState<MediaFormat>("mp4");
  const [isProbing, setIsProbing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [recentLinks, setRecentLinks] = useState<ActiveLink[]>([]);
  const [customFilename, setCustomFilename] = useState<string | null>(null);

  // Refs
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  // Resolution to re-select once the restored video has been probed again.
  const pendingHeightRef = useRef<string | null>(null);

  const [loginOpen, setLoginOpen] = useState(false);

  const saveDraft = () => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          videoUrl,
          start: [startH, startM, startS],
          end: [endH, endM, endS],
          customFilename,
          selectedHeight,
          format,
        }),
      );
    } catch {
      // Storage blocked: the visitor just sets the clip up again after signing in.
    }
  };

  // Back from signing in: put the clip settings back where they were.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(DRAFT_KEY);
      const draft = JSON.parse(raw);

      pendingHeightRef.current = draft.selectedHeight || null;
      // The draft already holds the Start the visitor chose; don't offer the link's again.
      handleUrlChange(draft.videoUrl, false);
      setStartH(draft.start[0]);
      setStartM(draft.start[1]);
      setStartS(draft.start[2]);
      setEndH(draft.end[0]);
      setEndM(draft.end[1]);
      setEndS(draft.end[2]);
      setCustomFilename(draft.customFilename);
      setFormat(draft.format);
    } catch {
      // Unreadable draft; start clean.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const refreshLinks = () =>
    fetch("/api/links")
      .then((res) => res.json())
      .then((data) => setRecentLinks(data.links || []))
      .catch(() => {
        // Non-critical; the list just stays as-is.
      });

  // The sign-in popup finished: pick up the session without reloading, so the
  // video and every field stay exactly as they were.
  useEffect(() => {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.onmessage = () => {
      setLoginOpen(false);
      router.refresh();
      void refreshLinks();
    };
    return () => channel.close();
  }, [router]);

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

  // Start and End as they are right now, for toast buttons: those are clicked
  // long after the render that created them.
  const timesRef = useRef({ start: ["0", "0", "0"], end: ["0", "0", "0"] });
  useEffect(() => {
    timesRef.current = {
      start: [startH, startM, startS],
      end: [endH, endM, endS],
    };
  });

  const applyTimes = (start: string[], end: string[]) => {
    setStartH(start[0]);
    setStartM(start[1]);
    setStartS(start[2]);
    setEndH(end[0]);
    setEndM(end[1]);
    setEndS(end[2]);
  };

  // A link's t= is often just where someone stopped watching, not where they
  // want the clip to begin. So it is offered, never applied on its own.
  const offerLinkStart = (seconds: number) => {
    toast(`This link starts at ${formatClock(seconds)}`, {
      duration: 12000,
      action: {
        label: "Use as Start",
        onClick: () => {
          const before = timesRef.current;
          const [bh, bm, bs] = before.end;
          const endSeconds = getSeconds(bh, bm, bs);
          applyTimes(
            [
              String(Math.floor(seconds / 3600)),
              String(Math.floor((seconds % 3600) / 60)),
              String(seconds % 60),
            ],
            // An End at or before the new Start would be an empty clip; 0 means "to the end".
            endSeconds !== 0 && endSeconds <= seconds ? ["0", "0", "0"] : before.end,
          );
          toast.success(`Start set to ${formatClock(seconds)}`, {
            duration: 8000,
            action: {
              label: "Undo",
              onClick: () => applyTimes(before.start, before.end),
            },
          });
        },
      },
    });
  };

  // Auto-Load
  const handleUrlChange = (url: string, offerStart = true) => {
    setVideoUrl(url);
    const link = parseLink(url);
    if (link?.platform && link.key) {
      if (platformChoice !== "auto" && platformChoice !== link.platform) {
        setPlatformChoice(link.platform);
      }
      if (link.key !== videoId) {
        setVideoId(link.key);
        setDownloadedFilename(null);
        setDownloadUrl(null);
        setCustomFilename(null);
        probeVideo(link.url);

        const linkStart = link.platform === "youtube" ? linkStartSeconds(url) : 0;
        if (offerStart && linkStart > 0) offerLinkStart(linkStart);

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
    const restoredHeight = pendingHeightRef.current;
    pendingHeightRef.current = null;
    setIsProbing(true);
    setPreviewUrl("");
    setHeights([]);
    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to read video info");

      setTitle(data.title || "");
      setHeights(data.heights || []);
      // Heights come sorted high to low. Preselect the site default, or the
      // closest one below it; a video with nothing that low gets its lowest.
      const heights: number[] = data.heights || [];
      const preferred =
        defaultHeight === null
          ? heights[0]
          : (heights.find((h) => h <= defaultHeight) ?? heights.at(-1));
      setSelectedHeight(
        restoredHeight ?? (preferred ? String(preferred) : "best"),
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


  const parsedLink = parseLink(videoUrl);
  const detectedPlatform = parsedLink?.platform ?? null;
  const linkUnsupported = !!parsedLink && !parsedLink.platform && parsedLink.hasPath;

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

  // Title_With_Underscores-75s-1080p (audio: Title_With_Underscores-75s-audio)
  const buildFilename = () => {
    if (!title) return "";

    const startSec = getSeconds(startH, startM, startS);
    const endSec = getSeconds(endH, endM, endS);
    const clipLength = endSec > startSec ? endSec - startSec : 0;

    const duration = clipLength > 0 ? `${clipLength}s` : "full";
    const res = isAudioFormat(format)
      ? "audio"
      : selectedHeight && selectedHeight !== "best"
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

    // Cutting and previewing are open to everyone; the download itself is not.
    // The server enforces this too (401 from /api/download).
    if (needsLogin) {
      setLoginOpen(true);
      return;
    }

    setIsDownloading(true);
    setDownloadUrl(null);
    const finalFilename = filename.trim() || `clip-${Date.now()}`;
    const startStr = getformattedTime(startH, startM, startS);
    const endStr = getformattedTime(endH, endM, endS);

    const promise = fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: parsedLink?.url ?? videoUrl,
        start: startStr,
        end: endStr,
        filename: finalFilename,
        height: selectedHeight === "best" ? undefined : Number(selectedHeight),
        format,
      }),
    }).then(async (res) => {
      const data = await res.json();
      // The server reports the balance on success and when it has run out.
      if (typeof data.credits === "number") setCredits(data.credits);
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    });

    toast.promise(promise, {
      loading: "Downloading...",
      success: (data) => {
        setIsDownloading(false);
        if (data.file) setDownloadedFilename(data.file);
        if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
        refreshLinks();
        return typeof data.credits === "number"
          ? `Download complete: ${data.name} (${data.credits} ${data.credits === 1 ? "credit" : "credits"} left)`
          : `Download complete: ${data.name}`;
      },
      error: (err) => {
        setIsDownloading(false);
        return `Error: ${err.message}`;
      },
    });
  };

  const handlePreview = () => {
    const player = playerRef.current;
    if (player) {
      player.currentTime = getSeconds(startH, startM, startS);
      void player.play();
    }
  };

  // Plays a past download in the main player, scrolled into view on mobile.
  const handlePreviewFile = (file: string) => {
    setDownloadedFilename(file);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleDeleteFile = async (link: ActiveLink) => {
    try {
      const res = await fetch("/api/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: link.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      // Don't leave the player or the share box pointing at a deleted file.
      if (downloadedFilename === link.file) setDownloadedFilename(null);
      if (downloadUrl === `/api/d/${link.token}`) setDownloadUrl(null);
      toast.success(`Deleted ${link.name}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
    void refreshLinks();
  };

  const handleOpenFolder = async () => {
    await fetch("/api/open-folder", { method: "POST" });
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    e.target.select();

  return {
    state: {
      videoUrl,
      videoId,
      platformChoice,
      detectedPlatform,
      linkUnsupported,
      previewUrl,
      isPlaying,
      downloadedFilename,
      isDownloading,
      filename,
      heights,
      selectedHeight,
      format,
      isProbing,
      downloadUrl,
      recentLinks,
      isLocalhost,
      loginOpen,
      credits,
      time: {
        start: { h: startH, m: startM, s: startS },
        end: { h: endH, m: endM, s: endS },
      },
      trim: {
        start: getSeconds(startH, startM, startS),
        end: getSeconds(endH, endM, endS),
      },
    },
    setters: {
      setVideoUrl: handleUrlChange,
      setPlatformChoice,
      setDownloadedFilename,
      setFilename: handleFilenameChange,
      setSelectedHeight,
      setFormat,
      setLoginOpen,
      setStartH,
      setStartM,
      setStartS,
      setEndH,
      setEndM,
      setEndS,
    },
    actions: {
      handleDownload,
      saveDraft,
      handlePreview,
      handlePreviewFile,
      handleDeleteFile,
      handleOpenFolder,
      handleInputFocus,
      syncCurrentTime,
      handlePlayer,
    },
    contentRef,
  };
}
