import React from "react";
import {
  Activity,
  Play,
  Download,
  Loader2,
  FolderOpen,
  Copy,
  ExternalLink,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeState {
  h: string;
  m: string;
  s: string;
}

interface ActiveLink {
  token: string;
  file: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

interface ControlsProps {
  start: TimeState;
  end: TimeState;
  setStart: {
    h: (v: string) => void;
    m: (v: string) => void;
    s: (v: string) => void;
  };
  setEnd: {
    h: (v: string) => void;
    m: (v: string) => void;
    s: (v: string) => void;
  };
  filename: string;
  setFilename: (v: string) => void;
  heights: number[];
  selectedHeight: string;
  setSelectedHeight: (v: string) => void;
  isProbing: boolean;
  downloadUrl: string | null;
  recentLinks: ActiveLink[];
  isLocalhost: boolean;
  isDownloading: boolean;
  videoId: string;
  downloadedFilename: string | null;
  onPreview: () => void;
  onDownload: () => void;
  onOpenFolder: () => void;
  onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
}

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

function formatRemaining(expiresAt: number) {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m`;
}

export function Controls({
  start,
  end,
  setStart,
  setEnd,
  filename,
  setFilename,
  heights,
  selectedHeight,
  setSelectedHeight,
  isProbing,
  downloadUrl,
  recentLinks,
  isLocalhost,
  isDownloading,
  videoId,
  downloadedFilename,
  onPreview,
  onDownload,
  onOpenFolder,
  onInputFocus,
}: ControlsProps) {
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(new URL(url, window.location.origin).href);
    toast.success("Link copied to clipboard");
  };

  return (
    <Card className="flex flex-col overflow-hidden p-4 lg:h-full">
      <Tabs defaultValue="trim" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-2 flex-none">
          <TabsTrigger value="trim" className="text-xs sm:text-sm">
            <Activity className="size-4" /> Controls
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-xs sm:text-sm">
            <History className="size-4" /> Downloads
          </TabsTrigger>
        </TabsList>

        {/* Both panels take the same height so switching tabs never resizes the card. */}
        <TabsContent value="trim" className="h-96 min-h-0 lg:h-auto lg:flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-5 py-4">
              <p className="text-foreground/50 text-xs">
                Set Start/End to 00:00:00 to ignore/full download.
              </p>

              <div className="space-y-2">
                <Label className="text-foreground/50 text-xs sm:text-sm">Start Time</Label>
                <div className="flex items-center gap-2">
                  <Input
                    onFocus={onInputFocus}
                    type="number"
                    min="0"
                    value={start.h}
                    onChange={(e) => setStart.h(e.target.value)}
                    className="text-center"
                    placeholder="HH"
                  />
                  <span className="text-foreground/50 font-bold">:</span>
                  <Input
                    onFocus={onInputFocus}
                    type="number"
                    min="0"
                    max="59"
                    value={start.m}
                    onChange={(e) => setStart.m(e.target.value)}
                    className="text-center"
                    placeholder="MM"
                  />
                  <span className="text-foreground/50 font-bold">:</span>
                  <Input
                    onFocus={onInputFocus}
                    type="number"
                    min="0"
                    max="59"
                    value={start.s}
                    onChange={(e) => setStart.s(e.target.value)}
                    className="text-center"
                    placeholder="SS"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground/50 text-xs sm:text-sm">End Time</Label>
                <div className="flex items-center gap-2">
                  <Input
                    onFocus={onInputFocus}
                    type="number"
                    min="0"
                    value={end.h}
                    onChange={(e) => setEnd.h(e.target.value)}
                    className="text-center"
                    placeholder="HH"
                  />
                  <span className="text-foreground/50 font-bold">:</span>
                  <Input
                    onFocus={onInputFocus}
                    type="number"
                    min="0"
                    max="59"
                    value={end.m}
                    onChange={(e) => setEnd.m(e.target.value)}
                    className="text-center"
                    placeholder="MM"
                  />
                  <span className="text-foreground/50 font-bold">:</span>
                  <Input
                    onFocus={onInputFocus}
                    type="number"
                    min="0"
                    max="59"
                    value={end.s}
                    onChange={(e) => setEnd.s(e.target.value)}
                    className="text-center"
                    placeholder="SS"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground/50 text-xs sm:text-sm">Filename</Label>
                <Input
                  placeholder="Auto-generated from video title"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground/50 text-xs sm:text-sm">Resolution</Label>
                <Select
                  value={selectedHeight}
                  onValueChange={setSelectedHeight}
                  disabled={isProbing || !videoId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        isProbing ? "Loading..." : "Select resolution"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Best available</SelectItem>
                    {heights.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h}p
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {downloadUrl && (
                <div className="space-y-2 rounded-base border-2 border-border p-3">
                  <Label className="text-foreground/50 text-xs sm:text-xs">
                    Share link (temporary)
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="neutral"
                      size="sm"
                      className="flex-1"
                      onClick={() => copyLink(downloadUrl)}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                    <Button
                      variant="neutral"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <a href={downloadUrl} download>
                        <ExternalLink className="mr-2 h-4 w-4" /> Download
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="neutral"
                    onClick={onPreview}
                    disabled={!!downloadedFilename}
                  >
                    <Play className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  <Button
                    onClick={onDownload}
                    disabled={isDownloading || !videoId}
                  >
                    {isDownloading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                </div>

                {isLocalhost && (
                  <Button
                    variant="neutral"
                    className="w-full"
                    onClick={onOpenFolder}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" /> Open Folder
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="recent"
          className="h-96 min-h-0 lg:h-auto lg:flex-1"
        >
          <ScrollArea className="h-full">
            <div className="py-4">
              {recentLinks.length === 0 ? (
                <div className="text-foreground/50 flex flex-col items-center justify-center py-16 text-center">
                  <History className="mb-3 h-10 w-10 opacity-40" />
                  <p className="text-sm">No downloads yet</p>
                  <p className="text-xs">
                    Links use the configured retention period.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentLinks.map((link) => (
                    <div
                      key={link.token}
                      className="space-y-1.5 rounded-base border-2 border-border p-3"
                    >
                      <p className="font-mono text-sm leading-snug break-all">
                        {link.file}
                      </p>
                      <p className="text-foreground/50 text-xs">
                        {formatSize(link.size)} &middot; expires in{" "}
                        {formatRemaining(link.expiresAt)}
                      </p>
                      <div className="flex gap-2 pt-0.5">
                        <Button
                          variant="neutral"
                          size="sm"
                          className="h-7 flex-1 text-xs"
                          onClick={() => copyLink(`/api/d/${link.token}`)}
                        >
                          <Copy className="mr-1.5 h-3 w-3" /> Copy
                        </Button>
                        <Button
                          variant="neutral"
                          size="sm"
                          className="h-7 flex-1 text-xs"
                          asChild
                        >
                          <a href={`/api/d/${link.token}`} download>
                            <ExternalLink className="mr-1.5 h-3 w-3" /> Get
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
