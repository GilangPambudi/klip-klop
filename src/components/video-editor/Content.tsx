"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoPlayer, type PlayerHandle } from "@/components/video-editor/VideoPlayer";
import { resolveLocalVideo } from "@/lib/client";

interface ContentProps {
    downloadedFilename: string | null;
    /** Direct stream URL (yt-dlp -g), no YouTube iframe. */
    previewUrl: string;
    /** True while the video info + preview stream are being resolved. */
    isProbing: boolean;
    onClosePreview: () => void;
    onPlayer?: (player: PlayerHandle | null) => void;
}

export function Content({ downloadedFilename, previewUrl, isProbing, onClosePreview, onPlayer }: ContentProps) {
    // Resolve the <video> source:
    //  - Web: `/api/video?file=<name>` (server streams the local mp4).
    //  - Native: a content:// URI from the plugin (async, hence the state).
    const [localVideoUri, setLocalVideoUri] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        setLocalVideoUri(null);
        if (downloadedFilename) {
            resolveLocalVideo(downloadedFilename)
                .then((uri) => { if (!cancelled) setLocalVideoUri(uri); })
                .catch(() => { /* fall back to preview if resolve fails */ });
        }
        return () => { cancelled = true; };
    }, [downloadedFilename]);

    const src = downloadedFilename ? (localVideoUri ?? "") : previewUrl;

    return (
        <Card className="aspect-video w-full overflow-hidden bg-black p-0 border-0 flex items-center justify-center relative lg:aspect-auto lg:flex-1">
            {isProbing ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p className="text-sm font-medium">Loading video…</p>
                </div>
            ) : src ? (
                <VideoPlayer src={src} className="absolute inset-0 h-full w-full" onPlayer={onPlayer} />
            ) : (
                <div className="aspect-video w-full h-full max-h-full">
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/50 pointer-events-none">
                        <Play className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Load video to start</p>
                    </div>
                </div>
            )}

            {downloadedFilename && (
                <Button
                    size="sm"
                    variant="neutral"
                    className="absolute top-4 right-4 opacity-90 hover:opacity-100 shadow-shadow"
                    onClick={onClosePreview}
                >
                    <X className="w-4 h-4 mr-2" /> Close Preview
                </Button>
            )}
        </Card>
    );
}
