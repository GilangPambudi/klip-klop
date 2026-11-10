"use client";

import { useState } from "react";
import { LogOut, User } from "lucide-react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROVIDER_LABELS } from "@/components/video-editor/LoginDialog";
import { logoutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

export interface SessionUser {
    name: string;
    image: string | null;
    /** "<provider>:<account id>", the key downloads and credits are stored under. */
    id: string;
    /** "discord" or "google". */
    provider: string;
    /** Credits left, or null for an account that is never charged. */
    credits: number | null;
    banned: boolean;
}

function creditsLabel(credits: number | null) {
    if (credits === null) return "Unlimited credits";
    return `${credits} ${credits === 1 ? "credit" : "credits"} left`;
}

// Square like every other control here; the picture fills the tile edge to edge.
function Avatar({ user, className }: { user: SessionUser; className?: string }) {
    return (
        <span className={cn("flex items-center justify-center overflow-hidden rounded-base border-2 border-border bg-secondary-background", className)}>
            {user.image ? (
                // Tiny remote avatar: not worth routing through the image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
            ) : (
                <User className="size-1/2" aria-hidden="true" />
            )}
        </span>
    );
}

/** `credits` is the live balance; `user.credits` is only what it was at page load. */
export function UserMenu({ user, credits }: { user: SessionUser; credits: number | null }) {
    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    // The Avatar draws the border, so the button drops its own.
                    className={cn(buttonVariants({ variant: "neutral", size: "icon" }), "border-0 p-0")}
                    aria-label={`Account: ${user.name}`}
                    title={user.name}
                >
                    <Avatar user={user} className="size-full" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                        {user.name}
                        <span className="block text-xs text-muted-foreground">{creditsLabel(credits)}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                        <User /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void logoutAction()}>
                        <LogOut /> Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={profileOpen} onOpenChange={setProfileOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Profile</AlertDialogTitle>
                        <AlertDialogDescription>
                            Each download uses one credit, and credits do not refill. Your downloads are only visible to you.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center gap-4 rounded-base border-2 border-border bg-secondary-background p-3">
                        <Avatar user={user} className="size-16 flex-none" />
                        <div className="min-w-0">
                            <p className="truncate font-heading">{user.name}</p>
                            <p className="text-sm text-muted-foreground">
                                Signed in with {PROVIDER_LABELS[user.provider] ?? user.provider}
                            </p>
                        </div>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-muted-foreground">Credits</dt>
                        <dd>{user.banned ? "Banned: this account cannot download" : creditsLabel(credits)}</dd>
                        <dt className="text-muted-foreground">Account ID</dt>
                        <dd className="font-mono break-all">{user.id}</dd>
                    </dl>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
