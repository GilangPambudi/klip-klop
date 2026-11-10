"use client";

import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/lib/auth-actions";

export const PROVIDER_LABELS: Record<string, string> = { discord: "Discord", google: "Google" };

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    providers: string[];
    /** Stashes the clip settings; only needed when the popup is blocked and the whole page has to leave. */
    onBeforeRedirect: () => void;
}

export function LoginDialog({ open, onOpenChange, providers, onBeforeRedirect }: LoginDialogProps) {
    // Sign in happens in a popup so this page never unloads: the video keeps
    // playing and nothing typed is lost. The popup ends on /login/done, which
    // pings the editor (see useVideoEditor).
    const login = async (provider: string) => {
        // Must open before the first await, or the browser blocks it as unrequested.
        const popup = window.open("", "klip-klop-login", "popup,width=520,height=760");
        if (!popup) {
            onBeforeRedirect();
            await loginAction(provider);
            return;
        }
        try {
            const res = await signIn(provider, { redirect: false, redirectTo: "/login/done" });
            if (!res?.url) throw new Error("No sign-in URL");
            popup.location.href = res.url;
        } catch {
            popup.close();
            toast.error("Could not start the login. Try again.");
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Log in</AlertDialogTitle>
                    <AlertDialogDescription>
                        Downloading needs an account. Your clip settings are kept, and your downloads are only visible to you.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    {providers.map((id) => (
                        <Button key={id} onClick={() => void login(id)}>
                            Continue with {PROVIDER_LABELS[id] ?? id}
                        </Button>
                    ))}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
