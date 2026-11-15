"use client";

import { RotateCw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/lib/auth-actions";

interface MaintenancePageProps {
    message: string;
    /** Sign-in provider for the admin button; null hides it. */
    provider: string | null;
}

export function MaintenancePage({ message, provider }: MaintenancePageProps) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-3 py-10">
            <div className="flex w-full max-w-[440px] flex-col gap-3 rounded-base border-2 border-border bg-background p-4 lg:gap-4 lg:p-6">
                <div className="flex items-center gap-2">
                    <Logo />
                    <span className="font-heading text-base">Klip-Klop</span>
                </div>
                <span className="self-start rounded-base border-2 border-border bg-secondary-background px-2 py-0.5 text-xs text-muted-foreground">
                    ● Maintenance
                </span>
                <h1 className="text-xl">Back in a bit</h1>
                <p className="text-sm leading-relaxed">{message}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    Cutting, previews and downloads are paused until then.
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => window.location.reload()}>
                        <RotateCw /> Try again
                    </Button>
                    {provider && (
                        <Button variant="neutral" onClick={() => void loginAction(provider)}>
                            Admin log in
                        </Button>
                    )}
                </div>
            </div>
        </main>
    );
}
