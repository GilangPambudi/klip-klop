import React from "react";
import { Activity, Play, Download, Loader2, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TimeState {
    h: string;
    m: string;
    s: string;
}

interface ControlsProps {
    start: TimeState;
    end: TimeState;
    setStart: { h: (v: string) => void; m: (v: string) => void; s: (v: string) => void; };
    setEnd: { h: (v: string) => void; m: (v: string) => void; s: (v: string) => void; };
    filename: string;
    setFilename: (v: string) => void;
    isDownloading: boolean;
    videoId: string;
    downloadedFilename: string | null;
    onPreview: () => void;
    onDownload: () => void;
    onOpenFolder: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function Controls({
    start, end, setStart, setEnd,
    filename, setFilename, isDownloading, videoId, downloadedFilename,
    onPreview, onDownload, onOpenFolder, onInputFocus
}: ControlsProps) {
    return (
        <Card className="h-full">
            <CardContent className="p-5 space-y-5">

                <div className="space-y-1 border-b pb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5" /> Trim Controls
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        Set Start/End to 00:00:00 to ignore/full download.
                    </p>
                </div>

                {/* Times */}
                <div className="grid grid-cols-1 gap-5">
                    {/* Start */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-muted-foreground">Start Time</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input onFocus={onInputFocus} type="number" min="0" value={start.h} onChange={(e) => setStart.h(e.target.value)} className="text-center font-mono" placeholder="HH" />
                            <span className="text-muted-foreground font-bold">:</span>
                            <Input onFocus={onInputFocus} type="number" min="0" max="59" value={start.m} onChange={(e) => setStart.m(e.target.value)} className="text-center font-mono" placeholder="MM" />
                            <span className="text-muted-foreground font-bold">:</span>
                            <Input onFocus={onInputFocus} type="number" min="0" max="59" value={start.s} onChange={(e) => setStart.s(e.target.value)} className="text-center font-mono" placeholder="SS" />
                        </div>
                    </div>

                    {/* End */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-muted-foreground">End Time</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input onFocus={onInputFocus} type="number" min="0" value={end.h} onChange={(e) => setEnd.h(e.target.value)} className="text-center font-mono" placeholder="HH" />
                            <span className="text-muted-foreground font-bold">:</span>
                            <Input onFocus={onInputFocus} type="number" min="0" max="59" value={end.m} onChange={(e) => setEnd.m(e.target.value)} className="text-center font-mono" placeholder="MM" />
                            <span className="text-muted-foreground font-bold">:</span>
                            <Input onFocus={onInputFocus} type="number" min="0" max="59" value={end.s} onChange={(e) => setEnd.s(e.target.value)} className="text-center font-mono" placeholder="SS" />
                        </div>
                    </div>
                </div>

                {/* Filename */}
                <div className="space-y-2 pt-2">
                    <Label className="text-muted-foreground">Filename (Optional)</Label>
                    <Input
                        placeholder="Auto-generated"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                    />
                </div>

                {/* Actions */}
                <div className="pt-3 space-y-3 mt-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={onPreview} disabled={!!downloadedFilename}>
                            <Play className="mr-2 h-4 w-4" /> Preview
                        </Button>
                        <Button onClick={onDownload} disabled={isDownloading || !videoId}>
                            {isDownloading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Download
                        </Button>
                    </div>

                    <Button variant="secondary" className="w-full" onClick={onOpenFolder}>
                        <FolderOpen className="mr-2 h-4 w-4" /> Open Folder
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
}
