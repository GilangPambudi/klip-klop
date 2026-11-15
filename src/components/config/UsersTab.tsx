"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface UserRow {
    id: string;
    provider: string;
    name: string;
    image: string | null;
    credits: number;
    unlimited: boolean;
    banned: boolean;
    admin: boolean;
    lastLoginAt: string;
    lastIp: string | null;
}

type Flag = "unlimited" | "banned" | "admin";

const FLAGS: { key: Flag; on: string; off: string }[] = [
    { key: "unlimited", on: "Unlimited", off: "Limited" },
    { key: "banned", on: "Banned", off: "Not banned" },
    { key: "admin", on: "Admin", off: "Not admin" },
];

interface UsersTabProps {
    initialUsers: UserRow[];
    selfId: string;
    onCount: (count: number) => void;
    onFail: (title: string, err: unknown) => void;
}

const lastSeen = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function UsersTab({ initialUsers, selfId, onCount, onFail }: UsersTabProps) {
    const [users, setUsers] = useState(initialUsers);
    const [query, setQuery] = useState("");
    const [credits, setCredits] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<string | null>(null);

    const patch = async (user: UserRow, changes: Partial<Pick<UserRow, "credits" | Flag>>) => {
        setBusy(user.id);
        try {
            const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(changes),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
            const next = data as UserRow[];
            setUsers(next);
            onCount(next.length);
            setCredits((c) => {
                const rest = { ...c };
                delete rest[user.id];
                return rest;
            });
        } catch (err) {
            onFail("Could not update user", err);
        } finally {
            setBusy(null);
        }
    };

    const saveCredits = (user: UserRow) => {
        const raw = credits[user.id];
        if (raw === undefined) return;
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 0) {
            onFail("Could not update user", new Error("Credits must be a whole number, 0 or more"));
            return;
        }
        void patch(user, { credits: value });
    };

    const needle = query.trim().toLowerCase();
    const shown = needle
        ? users.filter(
              (u) =>
                  u.name.toLowerCase().includes(needle) ||
                  u.id.toLowerCase().includes(needle) ||
                  (u.lastIp ?? "").includes(needle),
          )
        : users;

    return (
        <>
            <Input placeholder="Search by name, ID or IP" value={query} onChange={(e) => setQuery(e.target.value)} />

            {shown.length === 0 && <p className="text-xs sm:text-sm text-muted-foreground">No users found.</p>}

            {shown.map((user) => {
                const draft = credits[user.id];
                const self = user.id === selfId;
                return (
                    <div key={user.id} className="flex gap-3 rounded-base border-2 border-border bg-secondary-background p-3">
                        <div className="flex size-9 flex-none items-center justify-center overflow-hidden rounded-full border-2 border-border bg-background">
                            {user.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                            ) : (
                                <User className="size-1/2" aria-hidden="true" />
                            )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className={cn("font-heading", user.banned && "text-muted-foreground line-through")}>
                                    {user.name || "(no name)"}
                                </span>
                                {self && <span className="text-xs text-muted-foreground">(you)</span>}
                                <span className="break-all text-xs text-muted-foreground">{user.id}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Last login {lastSeen(user.lastLoginAt)}
                                {user.lastIp && <span className="break-all"> from {user.lastIp}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <Input
                                        aria-label={`Credits for ${user.name}`}
                                        inputMode="numeric"
                                        className="h-8 w-20"
                                        disabled={user.unlimited}
                                        value={user.unlimited ? "∞" : (draft ?? String(user.credits))}
                                        onChange={(e) => setCredits((c) => ({ ...c, [user.id]: e.target.value }))}
                                        onKeyDown={(e) => e.key === "Enter" && saveCredits(user)}
                                    />
                                    {draft !== undefined && !user.unlimited && (
                                        <Button size="sm" disabled={busy === user.id} onClick={() => saveCredits(user)}>
                                            Save
                                        </Button>
                                    )}
                                </div>
                                {FLAGS.map(({ key, on, off }) => {
                                    const locked = self && (key === "admin" || key === "banned");
                                    return (
                                        <Button
                                            key={key}
                                            size="sm"
                                            variant={user[key] ? "default" : "neutral"}
                                            aria-pressed={user[key]}
                                            disabled={busy === user.id || locked}
                                            onClick={() => void patch(user, { [key]: !user[key] })}
                                        >
                                            {user[key] ? on : off}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
}
