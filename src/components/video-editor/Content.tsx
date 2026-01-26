import React from "react";
import { Play, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ContentProps {
    downloadedFilename: string | null;
    videoId: string;
    onClosePreview: () => void;
}

export function Content({ downloadedFilename, videoId, onClosePreview }: ContentProps) {
    return (
        <Card className="flex-1 overflow-hidden bg-black p-0 border-0 flex items-center justify-center relative rounded-lg">
            {downloadedFilename ? (
                <video
                    src={`/api/video?file=${downloadedFilename}`}
                    controls
                    autoPlay
                    className="w-full h-full max-h-full object-contain"
                />
            ) : (
                <div className="aspect-video w-full h-full max-h-full">
                    <div id="youtube-player" className="w-full h-full" />
                    {!videoId && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                            <Play className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg font-medium">Load video to start</p>
                        </div>
                    )}
                </div>
            )}

            {downloadedFilename && (
                <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-4 right-4 opacity-90 hover:opacity-100 shadow-md"
                    onClick={onClosePreview}
                >
                    <X className="w-4 h-4 mr-2" /> Close Preview
                </Button>
            )}
        </Card>
    );
}
