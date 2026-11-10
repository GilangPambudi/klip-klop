import React from "react";
import { Link, LogIn } from "lucide-react";
import { UserMenu, type SessionUser } from "@/components/video-editor/UserMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

interface HeaderProps {
    videoUrl: string;
    setVideoUrl: (url: string) => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
    /** False on the local launcher, where there is no sign-in at all. */
    authEnabled: boolean;
    user: SessionUser | null;
    /** Live credit balance; null when the account is never charged. */
    credits: number | null;
    onLogin: () => void;
}

export function Header({ videoUrl, setVideoUrl, onInputFocus, authEnabled, user, credits, onLogin }: HeaderProps) {
    return (
        <Card className="flex-none p-1">
            {/* Mobile: logo + buttons on row 1, URL wraps to row 2. Desktop: one row. */}
            <CardContent className="p-3 lg:p-5 flex flex-wrap items-center gap-3 lg:flex-nowrap">
                <div className="flex items-center gap-2 flex-1 lg:flex-none">
                    {/* Trim Brackets logo; tile and glyph swap with the theme. */}
                    <svg viewBox="0 0 110 110" aria-hidden="true" className="h-6 w-6 sm:h-7 sm:w-7">
                        <rect x="7" y="7" width="96" height="96" rx="12" className="fill-foreground" />
                        <path d="M37 34 H28 V76 H37 M73 34 H82 V76 H73" fill="none" strokeWidth="8" className="stroke-background" />
                        <path d="M48 42 L66 55 L48 68 Z" strokeWidth="3" strokeLinejoin="round" className="fill-background stroke-background" />
                    </svg>
                    <h3 className="font-bold text-base lg:text-lg">Klip-Klop</h3>
                </div>

                <div className="relative order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1">
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
                    {/* With accounts on, the theme picker lives in the profile dialog. The local launcher has no profile, so it keeps the button. */}
                    {!authEnabled && <ModeToggle />}
                    {authEnabled && (user ? (
                        <UserMenu user={user} credits={credits} />
                    ) : (
                        <Button variant="neutral" size="icon" title="Log in" aria-label="Log in" onClick={onLogin}>
                            <LogIn className="h-5 w-5" />
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
