"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Undo2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldLabel, Section } from "@/components/config/Section";
import type { YtdlpChannel, YtdlpStatus, YtdlpTestResult } from "@/lib/ytdlp-admin";

async function send<T>(method: string, body?: unknown): Promise<T> {
    const res = await fetch("/api/admin/ytdlp", {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data as T;
}

interface YtdlpSectionProps {
    onFail: (title: string, err: unknown) => void;
}

export function YtdlpSection({ onFail }: YtdlpSectionProps) {
    const [status, setStatus] = useState<YtdlpStatus | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [output, setOutput] = useState("");
    const [testUrl, setTestUrl] = useState("");
    const [result, setResult] = useState<YtdlpTestResult | null>(null);

    const [statusError, setStatusError] = useState<string | null>(null);

    useEffect(() => {
        send<YtdlpStatus>("GET")
            .then(setStatus)
            .catch((err) => setStatusError(err instanceof Error ? err.message : String(err)));
    }, []);

    const change = async (label: string, body: { action: "update"; channel: YtdlpChannel } | { action: "rollback" }) => {
        setBusy(label);
        setOutput("");
        try {
            const data = await send<{ output: string; status: YtdlpStatus }>("POST", body);
            setStatus(data.status);
            setOutput(data.output);
            toast.success(`yt-dlp ${data.status.version ?? ""}`.trim());
        } catch (err) {
            onFail(`Could not ${label}`, err);
        } finally {
            setBusy(null);
        }
    };

    const runTest = async () => {
        setBusy("test");
        setResult(null);
        try {
            setResult(await send<YtdlpTestResult>("POST", { action: "test", url: testUrl }));
        } catch (err) {
            onFail("Could not run the test", err);
        } finally {
            setBusy(null);
        }
    };

    const outdated =
        status?.channel === "stable" && status.latestStable && status.version !== status.latestStable;

    return (
        <Section
            title="yt-dlp"
            hint="When videos stop loading (for example &quot;Requested format is not available&quot;), test a link first. If the hint says so, update; if stable is already the newest, try nightly. Roll back swaps to the version before the last update."
        >
            <p className="text-xs sm:text-sm">
                {status === null
                    ? statusError ? `Could not read the version: ${statusError}` : "Checking version..."
                    : [
                          `Installed ${status.version ?? "unknown"}${status.channel ? ` (${status.channel})` : ""}`,
                          `newest stable ${status.latestStable ?? "unknown"}`,
                          status.backupVersion ? `previous ${status.backupVersion}` : "no previous version",
                      ].join(" · ")}
                {outdated && <span className="font-heading"> · update available</span>}
            </p>
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={outdated ? "default" : "neutral"} disabled={!!busy || !status} onClick={() => void change("update to stable", { action: "update", channel: "stable" })}>
                    <RefreshCw /> {busy === "update to stable" ? "Updating..." : "Update to stable"}
                </Button>
                <Button size="sm" variant="neutral" disabled={!!busy || !status} onClick={() => void change("update to nightly", { action: "update", channel: "nightly" })}>
                    <RefreshCw /> {busy === "update to nightly" ? "Updating..." : "Update to nightly"}
                </Button>
                <Button size="sm" variant="neutral" disabled={!!busy || !status?.backupVersion} onClick={() => void change("roll back", { action: "rollback" })}>
                    <Undo2 /> {busy === "roll back" ? "Rolling back..." : "Roll back"}
                </Button>
            </div>
            {output && (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-base border-2 border-border bg-background p-2 text-xs">{output}</pre>
            )}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="ytdlp-test" className={fieldLabel}>Test a link (same as loading it in the editor, through cookies and proxies)</Label>
                <div className="flex gap-2">
                    <Input
                        id="ytdlp-test"
                        inputMode="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={testUrl}
                        onChange={(e) => setTestUrl(e.target.value)}
                    />
                    <Button variant="neutral" className="flex-none" disabled={!!busy || !testUrl.trim()} onClick={() => void runTest()}>
                        <Zap /> {busy === "test" ? "Testing..." : "Test"}
                    </Button>
                </div>
            </div>
            {result && (
                <div className="flex flex-col gap-1 text-xs sm:text-sm">
                    <span className="font-heading">
                        {result.ok ? `✓ ${result.title ?? "Loaded"}` : "✗ Failed"} · {(result.ms / 1000).toFixed(1)}s
                    </span>
                    {result.error && <span className="break-words">{result.error}</span>}
                    {result.warnings.map((w) => (
                        <span key={w} className="break-words text-muted-foreground">{w}</span>
                    ))}
                    {result.hint && <span className="font-heading">→ {result.hint}</span>}
                </div>
            )}
        </Section>
    );
}
