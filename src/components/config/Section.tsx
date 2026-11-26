import type { ReactNode } from "react";

export const fieldLabel = "text-muted-foreground text-xs sm:text-sm";

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-3 rounded-base border-2 border-border bg-secondary-background p-3">
            <div className="flex flex-col gap-0.5">
                <h4 className="font-heading">{title}</h4>
                {hint && <p className="text-xs sm:text-sm text-muted-foreground">{hint}</p>}
            </div>
            {children}
        </section>
    );
}
