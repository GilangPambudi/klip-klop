import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

export interface ActiveLink {
  token: string;
  file: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

interface YouTubePlayer {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getVideoUrl: () => string;
}

declare global {
  interface Window {
    YT: {
      Player: new (id: string, options: object) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export function useVideoEditor() {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

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

  // Refs
  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const refreshLinks = () =>
    fetch("/api/links")
      .then((res) => res.json())
      .then((data) => setRecentLinks(data.links || []))
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

  const onPlayerStateChange = (event: { data: number }) => {
    setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
  };

  // Load YouTube API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => setPlayerReady(true);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlayerReady(true);
    }
    return () => clearInterval(intervalRef.current!);
  }, []);

  // Initialize Player
  useEffect(() => {
    const createPlayer = () => {
      setTimeout(() => {
        if (!document.getElementById("youtube-player")) return;
        playerRef.current = new window.YT.Player("youtube-player", {
          videoId: videoId,
          events: {
            onStateChange: onPlayerStateChange,
            onError: () => toast.error("Error loading video"),
          },
          playerVars: { autoplay: 1, controls: 1 },
        });
      }, 100);
    };

    if (playerReady && videoId && !downloadedFilename) {
      if (playerRef.current && playerRef.current.loadVideoById) {
        try {
          playerRef.current.loadVideoById(videoId);
        } catch (e: unknown) {
          console.error(e);
          createPlayer();
        }
      } else {
        createPlayer();
      }
    } else if (downloadedFilename) {
      // If we are showing the downloaded video, the YouTube player iframe is unmounted.
      // We must invalidate the ref so it can be re-created when we switch back.
      playerRef.current = null;
    }
  }, [playerReady, videoId, downloadedFilename]);

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
        toast.success("Video loaded!");
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

  const probeVideo = async (url: string) => {
    setIsProbing(true);
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
      setSelectedHeight(
        data.heights?.length ? String(data.heights[0]) : "best",
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Probe failed";
      toast.error(`Could not read video info: ${message}`);
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
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const currentTime = playerRef.current.getCurrentTime();
          const outSeconds = getSeconds(endH, endM, endS);
          if (outSeconds > 0 && currentTime >= outSeconds) {
            playerRef.current.pauseVideo();
            setIsPlaying(false);
          }
        }
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current!);
  }, [isPlaying, endH, endM, endS, downloadedFilename]);

  const syncCurrentTime = (isStart: boolean) => {
    if (downloadedFilename) return;
    if (playerRef.current && playerRef.current.getCurrentTime) {
      const curr = Math.floor(playerRef.current.getCurrentTime());
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

    const promise = fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: videoUrl,
        start: startStr,
        end: endStr,
        filename: finalFilename,
        height: selectedHeight === "best" ? undefined : Number(selectedHeight),
      }),
    }).then(async (res) => {
      const data = await res.json();
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
        return `Download complete: ${data.file}`;
      },
      error: (err) => {
        setIsDownloading(false);
        return `Error: ${err.message}`;
      },
    });
  };

  const handlePreview = () => {
    if (playerRef.current && playerRef.current.seekTo) {
      const startSec = getSeconds(startH, startM, startS);
      playerRef.current.seekTo(startSec);
      playerRef.current.playVideo();
    }
  };

  const handleStopServer = async () => {
    toast.info("Stopping server...");

    // Fire and forget shutdown request
    fetch("/api/shutdown", { method: "POST" }).catch((err) =>
      console.error("Shutdown request failed (expected):", err),
    );

    // Replace body with offline UI
    setTimeout(() => {
      document.body.innerHTML = `
            <div class="fixed inset-0 bg-background flex flex-col items-center justify-center space-y-4 text-center p-4 animate-in fade-in duration-300">
              <div class="rounded-full bg-destructive/10 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-12 w-12 text-destructive"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77 0"/></svg>
              </div>
              <h1 class="text-2xl font-bold">Server Stopped</h1>
              <p class="text-muted-foreground">The server has been stopped. You can now close this tab.</p>
            </div>
        `;
    }, 500);
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
    },
    actions: {
      handleStopServer,
      handleDownload,
      handlePreview,
      handleOpenFolder,
      handleInputFocus,
      syncCurrentTime,
    },
    contentRef,
  };
}
