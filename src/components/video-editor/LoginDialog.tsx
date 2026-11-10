"use client";

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
    /** Runs right before the redirect to the provider, to stash the clip settings. */
    onBeforeLogin: () => void;
}

export function LoginDialog({ open, onOpenChange, providers, onBeforeLogin }: LoginDialogProps) {
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
                        <form key={id} action={loginAction.bind(null, id)} onSubmit={onBeforeLogin}>
                            <Button type="submit" className="w-full">
                                Continue with {PROVIDER_LABELS[id] ?? id}
                            </Button>
                        </form>
                    ))}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
