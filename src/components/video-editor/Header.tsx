import React from "react";
import { Link, LogIn } from "lucide-react";
import { UserMenu, type SessionUser } from "@/components/video-editor/UserMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS, platformLabel, type PlatformId } from "@/lib/platforms";
import type { PlatformChoice } from "@/components/video-editor/useVideoEditor";

interface HeaderProps {
    videoUrl: string;
    setVideoUrl: (url: string) => void;
    platformChoice: PlatformChoice;
    setPlatformChoice: (choice: PlatformChoice) => void;
    detectedPlatform: PlatformId | null;
    linkUnsupported: boolean;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
    /** False on the local launcher, where there is no sign-in at all. */
    authEnabled: boolean;
    user: SessionUser | null;
    /** Live credit balance; null when the account is never charged. */
    credits: number | null;
    onLogin: () => void;
}

const supportedNames = PLATFORMS.map((p) => p.label).join(", ");

export function Header({ videoUrl, setVideoUrl, platformChoice, setPlatformChoice, detectedPlatform, linkUnsupported, onInputFocus, authEnabled, user, credits, onLogin }: HeaderProps) {
    const choiceLabel =
        platformChoice !== "auto"
            ? platformLabel(platformChoice)
            : detectedPlatform
              ? `Auto · ${platformLabel(detectedPlatform)}`
              : "Auto detect";
    const placeholder =
        platformChoice === "auto"
            ? `Paste a ${supportedNames.replace(/, ([^,]*)$/, ", or $1")} link`
            : `Paste a ${platformLabel(platformChoice)} link`;

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

                <div className="order-last flex w-full min-w-0 flex-wrap items-center gap-2 lg:order-none lg:w-auto lg:flex-1">
                    <Select value={platformChoice} onValueChange={(v) => setPlatformChoice(v as PlatformChoice)}>
                        <SelectTrigger className="w-36 flex-none" aria-label="Platform">
                            <SelectValue>{choiceLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="auto">Auto detect</SelectItem>
                            {PLATFORMS.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative min-w-0 flex-1">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder={placeholder}
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            onFocus={onInputFocus}
                            aria-invalid={linkUnsupported}
                        />
                    </div>
                    {linkUnsupported && (
                        <p role="alert" className="w-full text-xs text-muted-foreground">
                            This site is not supported yet. Supported: {supportedNames}.
                        </p>
                    )}
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
