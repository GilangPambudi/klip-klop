"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface BlockedRow {
    ip: string;
    reason: string;
    expiresAt: string;
}

interface BlockedTabProps {
    initialBlocked: BlockedRow[];
    onCount: (count: number) => void;
    onFail: (title: string, err: unknown) => void;
}

const until = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

async function send(url: string, method: string, body?: unknown): Promise<BlockedRow[]> {
    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return (data as BlockedRow[]).map((b) => ({ ip: b.ip, reason: b.reason, expiresAt: b.expiresAt }));
}

export function BlockedTab({ initialBlocked, onCount, onFail }: BlockedTabProps) {
    const [blocked, setBlocked] = useState(initialBlocked);
    const [ip, setIp] = useState("");
    const [hours, setHours] = useState("24");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const apply = (rows: BlockedRow[]) => {
        setBlocked(rows);
        onCount(rows.length);
    };

    const add = async () => {
        setBusy(true);
        try {
            apply(await send("/api/admin/blocked-ips", "POST", { ip: ip.trim(), hours: Number(hours), reason }));
            setIp("");
            setReason("");
        } catch (err) {
            onFail("Could not block IP", err);
        } finally {
            setBusy(false);
        }
    };

    const remove = (row: BlockedRow) =>
        send(`/api/admin/blocked-ips/${encodeURIComponent(row.ip)}`, "DELETE")
            .then(apply)
            .catch((err) => onFail("Could not unblock IP", err));

    return (
        <>
            <p className="text-xs sm:text-sm text-muted-foreground">
                A blocked IP gets an error on every load and download until the block runs out. Admin accounts are never blocked.
                One IP can be shared by many people on mobile data or office wifi, so keep blocks short.
            </p>

            <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="block-ip" className="text-muted-foreground text-xs sm:text-sm">IP address</Label>
                    <Input id="block-ip" autoComplete="off" placeholder="203.0.113.7" value={ip} onChange={(e) => setIp(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="block-hours" className="text-muted-foreground text-xs sm:text-sm">Hours</Label>
                    <Input id="block-hours" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="block-reason" className="text-muted-foreground text-xs sm:text-sm">Reason (optional)</Label>
                    <Input id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
            </div>
            <div className="flex justify-end">
                <Button disabled={busy || !ip.trim()} onClick={() => void add()}>
                    <Plus /> Block
                </Button>
            </div>

            {blocked.length === 0 && <p className="text-xs sm:text-sm text-muted-foreground">No IP is blocked.</p>}

            {blocked.map((row) => (
                <div key={row.ip} className="flex items-center gap-3 rounded-base border-2 border-border bg-secondary-background p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-heading break-all">{row.ip}</span>
                        <span className="text-xs text-muted-foreground">
                            Until {until(row.expiresAt)}
                            {row.reason && ` · ${row.reason}`}
                        </span>
                    </div>
                    <Button variant="neutral" size="sm" onClick={() => void remove(row)}>
                        <Trash2 /> Unblock
                    </Button>
                </div>
            ))}
        </>
    );
}
