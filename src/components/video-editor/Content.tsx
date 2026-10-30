"use client";

import React from "react";
import { Loader2, Play, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoPlayer, type PlayerHandle } from "@/components/video-editor/VideoPlayer";

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
    const src = downloadedFilename
        ? `/api/video?file=${downloadedFilename}`
        : previewUrl;

    // Black only behind an actual video; empty/loading states follow the theme.
    const playing = !isProbing && !!src;

    return (
        <Card className={`aspect-video w-full overflow-hidden p-0 flex items-center justify-center relative lg:aspect-auto lg:flex-1 ${playing ? "bg-black border-0" : "bg-secondary-background"}`}>
            {isProbing ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p className="text-sm font-medium">Loading video…</p>
                </div>
            ) : src ? (
                <VideoPlayer src={src} className="absolute inset-0 h-full w-full" onPlayer={onPlayer} />
            ) : (
                <div className="aspect-video w-full h-full max-h-full">
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                        <Play className="w-10 h-10 mb-2 opacity-50 lg:w-16 lg:h-16 lg:mb-4" />
                        <p className="text-sm font-medium lg:text-lg">Load video to start</p>
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
