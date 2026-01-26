import React from "react";
import { Scissors, Link, Power } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

interface HeaderProps {
    videoUrl: string;
    setVideoUrl: (url: string) => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
    onStopServer: () => void;
}

export function Header({ videoUrl, setVideoUrl, onInputFocus, onStopServer }: HeaderProps) {
    return (
        <Card className="shadow-sm flex-none">
            <CardContent className="p-5 flex items-center gap-3">
                <div className="flex items-center gap-2 flex-none">
                    <Scissors className="h-6 w-6 text-primary" />
                    <h3 className="font-bold text-xl">Ngeklip Video</h3>
                </div>

                <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Paste YouTube Video ID or URL"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        onFocus={onInputFocus}
                    />
                </div>

                <div className="flex items-center gap-2 flex-none">
                    <ModeToggle />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" title="Stop Server">
                                <Power className="h-5 w-5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Stop Server?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will shut down the local server and close the application window. Are you sure?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onStopServer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Stop Server
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}
