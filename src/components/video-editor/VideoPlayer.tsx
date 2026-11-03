"use client";

import { useEffect, useRef, useState } from "react";
import { FastForward, Maximize, Minimize, Pause, Play, Rewind, Square, Volume2, VolumeX } from "lucide-react";

export type PlayerHandle = HTMLVideoElement;

interface VideoPlayerProps {
  /** Direct stream URL (yt-dlp -g) or a file served by this app. */
  src: string;
  className?: string;
  onPlayer?: (player: PlayerHandle | null) => void;
  /** Trim range in seconds, highlighted on the progress bar. end = 0 means to the end. */
  range?: { start: number; end: number };
}

const SKIP_SECONDS = 5;

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

const pct = (value: number, total: number) =>
  total > 0 ? `${Math.min(100, Math.max(0, (value / total) * 100))}%` : "0%";

/**
 * Native <video> with our own controls (layout borrowed from clipscutter.com,
 * which overlays custom controls on a YouTube embed). Native so the same player
 * can also play finished downloads, which a YouTube embed cannot.
 */
export function VideoPlayer({ src, className, onPlayer, range }: VideoPlayerProps) {
  const onPlayerRef = useRef(onPlayer);
  useEffect(() => {
    onPlayerRef.current = onPlayer;
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Expose the element to the parent (for seek/pause) and mirror its state.
  // Re-runs per source so the parent re-attaches its listeners to the new load.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    onPlayerRef.current?.(video);

    const sync = () => {
      setPaused(video.paused);
      setTime(video.currentTime);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setMuted(video.muted);
    };
    const events = ["play", "pause", "timeupdate", "durationchange", "loadedmetadata", "volumechange", "ended"];
    events.forEach((e) => video.addEventListener(e, sync));
    sync();

    return () => {
      events.forEach((e) => video.removeEventListener(e, sync));
      onPlayerRef.current?.(null);
    };
  }, [src]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!src) return <div className={className} />;

  const video = () => videoRef.current;
  const togglePlay = () => {
    const v = video();
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  const seek = (to: number) => {
    const v = video();
    if (v) v.currentTime = Math.min(Math.max(0, to), v.duration || to);
  };
  const stop = () => {
    const v = video();
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };
  const toggleMute = () => {
    const v = video();
    if (v) v.muted = !v.muted;
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (wrapRef.current?.requestFullscreen) void wrapRef.current.requestFullscreen();
    // iOS Safari only allows fullscreen on the <video> itself.
    else (video() as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)?.webkitEnterFullscreen?.();
  };

  const rangeEnd = range && (range.end > range.start ? range.end : duration);
  const showRange = !!range && duration > 0 && (range.start > 0 || range.end > 0);

  const iconButton = "flex size-9 items-center justify-center rounded-base text-white/90 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <div ref={wrapRef} className={`${className ?? ""} group bg-black text-white select-none`}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        onClick={togglePlay}
        className="h-full w-full cursor-pointer object-contain"
      />

      {paused && (
        <button
          type="button"
          aria-label="Play"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:size-16"
        >
          <Play className="ml-1 size-7 fill-current lg:size-8" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8">
        {/* Track: base, trim range, played; a transparent range input on top handles seeking. */}
        <div className="relative h-1.5 rounded-full bg-white/25">
          {showRange && rangeEnd !== undefined && (
            <div
              className="absolute inset-y-0 bg-white/50"
              style={{ left: pct(range.start, duration), width: pct(rangeEnd - range.start, duration) }}
              aria-hidden="true"
            >
              <span className="absolute -top-1 -left-px h-3.5 w-0.5 bg-white" />
              <span className="absolute -top-1 -right-px h-3.5 w-0.5 bg-white" />
            </div>
          )}
          <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: pct(time, duration) }} aria-hidden="true" />
          <input
            type="range"
            aria-label="Seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            className="absolute -inset-y-2 inset-x-0 w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="mt-1 flex items-center gap-0.5 text-xs">
          <button type="button" aria-label={paused ? "Play" : "Pause"} onClick={togglePlay} className={iconButton}>
            {paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
          </button>
          <button type="button" aria-label={`Back ${SKIP_SECONDS} seconds`} onClick={() => seek(time - SKIP_SECONDS)} className={iconButton}>
            <Rewind className="size-4 fill-current" />
          </button>
          <button type="button" aria-label="Stop" onClick={stop} className={iconButton}>
            <Square className="size-3.5 fill-current" />
          </button>
          <button type="button" aria-label={`Forward ${SKIP_SECONDS} seconds`} onClick={() => seek(time + SKIP_SECONDS)} className={iconButton}>
            <FastForward className="size-4 fill-current" />
          </button>
          <span className="ml-2 tabular-nums text-white/90">
            {formatTime(time)} / {formatTime(duration)}
          </span>
          <span className="flex-1" />
          <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute} className={iconButton}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen} className={iconButton}>
            {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
