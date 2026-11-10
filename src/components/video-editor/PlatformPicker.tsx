"use client";

import { Check, Globe, Instagram, Youtube } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PLATFORMS, platformLabel, type PlatformId } from "@/lib/platforms";
import type { PlatformChoice } from "@/components/video-editor/useVideoEditor";

function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
    );
}

function PlatformIcon({ platform, className }: { platform: PlatformId | null; className?: string }) {
    if (platform === "youtube") return <Youtube className={className} aria-hidden="true" />;
    if (platform === "instagram") return <Instagram className={className} aria-hidden="true" />;
    if (platform === "tiktok") return <TikTokIcon className={className} />;
    return <Globe className={className} aria-hidden="true" />;
}

interface PlatformPickerProps {
    choice: PlatformChoice;
    onChoice: (choice: PlatformChoice) => void;
    detected: PlatformId | null;
}

export function PlatformPicker({ choice, onChoice, detected }: PlatformPickerProps) {
    const shown = choice === "auto" ? detected : choice;
    const title =
        choice !== "auto"
            ? `Platform: ${platformLabel(choice)}`
            : detected
              ? `Platform: ${platformLabel(detected)} (auto)`
              : "Platform: auto detect";
    const options: { value: PlatformChoice; label: string; platform: PlatformId | null }[] = [
        { value: "auto", label: "Auto detect", platform: null },
        ...PLATFORMS.map((p) => ({ value: p.id, label: p.label, platform: p.id })),
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={buttonVariants({ variant: "neutral", size: "icon" })}
                aria-label={title}
                title={title}
            >
                <PlatformIcon platform={shown} className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Platform</DropdownMenuLabel>
                {options.map((option) => (
                    <DropdownMenuItem key={option.value} onSelect={() => onChoice(option.value)}>
                        <PlatformIcon platform={option.platform} />
                        {option.label}
                        {option.value === choice && <Check className="ml-auto" aria-hidden="true" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
