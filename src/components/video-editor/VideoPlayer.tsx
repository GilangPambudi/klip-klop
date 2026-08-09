"use client";

import { useEffect, useRef } from "react";

export type PlayerHandle = HTMLVideoElement;

interface VideoPlayerProps {
  /** Direct stream URL (yt-dlp -g) or mp4 file path served by this app. */
  src: string;
  className?: string;
  onPlayer?: (player: PlayerHandle | null) => void;
}

/**
 * Native <video> player — no YouTube iframe, no player library, same as
 * clipscutter.com. Control bar is the browser's native one.
 */
export function VideoPlayer({ src, className, onPlayer }: VideoPlayerProps) {
  const onPlayerRef = useRef(onPlayer);
  onPlayerRef.current = onPlayer;

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Expose the element to the parent (for seek/pause). Re-fires whenever the
  // source changes so the parent re-attaches its listeners to the new load.
  useEffect(() => {
    const video = videoRef.current;
    if (video) onPlayerRef.current?.(video);
    return () => onPlayerRef.current?.(null);
  }, [src]);

  if (!src) return <div className={className} />;

  return (
    <div className={className}>
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="auto"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
