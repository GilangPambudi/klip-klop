"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Pencil, Plus, Power, Trash2, Upload, Zap } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorDialog, type Failure } from "@/components/video-editor/ErrorDialog";
import { PLATFORMS, platformLabel, type PlatformId } from "@/lib/platforms";
import type { Settings } from "@/lib/db/settings";
import { NUMBER_FIELDS, NUMBER_GROUPS } from "@/lib/setting-fields";
import type { YoutubeCookieStatus } from "@/lib/cookies";
import { fieldLabel, Section } from "@/components/config/Section";
import { YtdlpSection } from "@/components/config/YtdlpSection";
import { UsersTab, type UserRow } from "@/components/config/UsersTab";
import { BlockedTab, type BlockedRow } from "@/components/config/BlockedTab";
import { cn } from "@/lib/utils";

export interface ProxyRow {
    id: number;
    name: string;
    url: string;
    position: number;
    enabled: boolean;
    platforms: string;
}

interface TestResult {
    ok: boolean;
    ip: string | null;
    ms: number;
    error: string | null;
}

interface ProxyDraft {
    id: number | null;
    name: string;
    url: string;
    platforms: PlatformId[];
}

const HEIGHTS = ["max", "2160", "1440", "1080", "720", "480", "360"];
const THEMES = ["mono", "neon", "mono-light", "mono-dark", "neon-light", "neon-dark"];

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data as T;
}

const platformList = (value: string) =>
    value.split(",").filter((p): p is PlatformId => PLATFORMS.some((x) => x.id === p));

interface Maintenance {
    on: boolean;
    message: string;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function cookieSummary(status: YoutubeCookieStatus) {
    if (!status.configured) return "YT_DLP_COOKIES is not set in .env, so YouTube goes without cookies.";
    if (!status.exists) return "No cookie file yet.";
    const parts = [`${status.cookies} youtube.com cookies`, `updated ${formatDate(status.updatedAt!)}`];
    if (status.expiresAt) {
        parts.push(new Date(status.expiresAt) < new Date() ? "login cookie expired" : `login expires ${formatDate(status.expiresAt)}`);
    }
    return parts.join(" · ");
}

interface ConfigPanelProps {
    initialSettings: Settings;
    initialProxies: ProxyRow[];
    initialUsers: UserRow[];
    initialMaintenance: Maintenance;
    initialBlocked: BlockedRow[];
    initialYoutubeCookies: YoutubeCookieStatus;
    selfId: string;
}

export function ConfigPanel({ initialSettings, initialProxies, initialUsers, initialMaintenance, initialBlocked, initialYoutubeCookies, selfId }: ConfigPanelProps) {
    const [ytCookies, setYtCookies] = useState(initialYoutubeCookies);
    const [ytText, setYtText] = useState("");
    const [ytBusy, setYtBusy] = useState(false);
    const [maintenance, setMaintenance] = useState(initialMaintenance);
    const [maintenanceBusy, setMaintenanceBusy] = useState(false);
    const [blockedCount, setBlockedCount] = useState(initialBlocked.length);
    const [settings, setSettings] = useState<Settings>({
        ...initialSettings,
        default_height: initialSettings.default_height || "max",
        default_theme: initialSettings.default_theme || "mono",
        retention_hours: initialSettings.retention_hours || "24",
    });
    const [userCount, setUserCount] = useState(initialUsers.length);
    const [showSession, setShowSession] = useState(false);
    const [saving, setSaving] = useState(false);
    const [proxies, setProxies] = useState(initialProxies);
    const [tests, setTests] = useState<Record<number, TestResult | "running">>({});
    const [draft, setDraft] = useState<ProxyDraft | null>(null);
    const [deleting, setDeleting] = useState<ProxyRow | null>(null);
    const [failure, setFailure] = useState<Failure | null>(null);

    const fail = (title: string) => (err: unknown) =>
        setFailure({ title, message: err instanceof Error ? err.message : String(err) });

    const set = (name: keyof Settings) => (value: string) => setSettings((s) => ({ ...s, [name]: value }));

    const saveSettings = async () => {
        setSaving(true);
        try {
            setSettings(await send<Settings>("/api/admin/settings", "PUT", settings));
            toast.success("Settings saved");
        } catch (err) {
            fail("Could not save settings")(err);
        } finally {
            setSaving(false);
        }
    };

    const loadCookieFile = async (file: File | undefined) => {
        if (file) setYtText(await file.text());
    };

    const saveYoutubeCookies = async () => {
        setYtBusy(true);
        try {
            setYtCookies(await send<YoutubeCookieStatus>("/api/admin/youtube-cookies", "PUT", { text: ytText }));
            setYtText("");
            toast.success("YouTube cookies replaced");
        } catch (err) {
            fail("Could not save YouTube cookies")(err);
        } finally {
            setYtBusy(false);
        }
    };

    const saveMaintenance = async (on: boolean) => {
        setMaintenanceBusy(true);
        try {
            setMaintenance(await send<Maintenance>("/api/admin/maintenance", "PUT", { on, message: maintenance.message }));
            toast.success(on ? "Maintenance is on" : "Maintenance is off");
        } catch (err) {
            fail("Could not change maintenance")(err);
        } finally {
            setMaintenanceBusy(false);
        }
    };

    const saveDraft = async () => {
        if (!draft) return;
        const body = { name: draft.name, url: draft.url, platforms: draft.platforms };
        try {
            setProxies(
                draft.id === null
                    ? await send<ProxyRow[]>("/api/admin/proxies", "POST", body)
                    : await send<ProxyRow[]>(`/api/admin/proxies/${draft.id}`, "PATCH", body),
            );
            setDraft(null);
        } catch (err) {
            fail("Could not save proxy")(err);
        }
    };

    const toggle = (proxy: ProxyRow) =>
        send<ProxyRow[]>(`/api/admin/proxies/${proxy.id}`, "PATCH", { enabled: !proxy.enabled })
            .then(setProxies)
            .catch(fail("Could not update proxy"));

    const remove = (proxy: ProxyRow) =>
        send<ProxyRow[]>(`/api/admin/proxies/${proxy.id}`, "DELETE")
            .then(setProxies)
            .catch(fail("Could not delete proxy"));

    const move = (index: number, step: number) => {
        const order = proxies.map((p) => p.id);
        const target = index + step;
        if (target < 0 || target >= order.length) return;
        [order[index], order[target]] = [order[target], order[index]];
        send<ProxyRow[]>("/api/admin/proxies", "PUT", { order })
            .then(setProxies)
            .catch(fail("Could not reorder proxies"));
    };

    const test = async (proxy: ProxyRow) => {
        setTests((t) => ({ ...t, [proxy.id]: "running" }));
        try {
            const result = await send<TestResult>("/api/admin/proxies/test", "POST", { url: proxy.url });
            setTests((t) => ({ ...t, [proxy.id]: result }));
        } catch (err) {
            setTests((t) => {
                const next = { ...t };
                delete next[proxy.id];
                return next;
            });
            fail("Could not test proxy")(err);
        }
    };

    const anyOn = proxies.some((p) => p.enabled);

    return (
        <div className="flex flex-col gap-3">
            <ErrorDialog failure={failure} onClose={() => setFailure(null)} />

            <Card className="flex-none p-1">
                <CardContent className="p-3 lg:p-5 flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-2">
                        <Logo />
                        <h3 className="font-bold text-base lg:text-lg">
                            Klip-Klop <span className="text-muted-foreground">/ Config</span>
                        </h3>
                    </div>
                    <Link href="/" className={buttonVariants({ variant: "neutral", size: "sm" })}>
                        <ArrowLeft /> Editor
                    </Link>
                </CardContent>
            </Card>

            <Card className="p-3 lg:p-4">
                <Tabs defaultValue="settings">
                    <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="proxies">Proxies ({proxies.length})</TabsTrigger>
                        <TabsTrigger value="users">Users ({userCount})</TabsTrigger>
                        <TabsTrigger value="blocked">Blocked IPs ({blockedCount})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="settings" className="flex flex-col gap-4 pt-2">
                        <Section
                            title={maintenance.on ? "● Maintenance is on" : "○ Maintenance is off"}
                            hint="While it is on, visitors see a maintenance page and every load and download is refused. Admin accounts keep working. Saves right away."
                        >
                            <div>
                                <Button
                                    size="sm"
                                    variant={maintenance.on ? "default" : "neutral"}
                                    disabled={maintenanceBusy}
                                    onClick={() => void saveMaintenance(!maintenance.on)}
                                >
                                    <Power /> {maintenance.on ? "Turn off" : "Turn on"}
                                </Button>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="maintenance-message" className={fieldLabel}>Message (empty = the default)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="maintenance-message"
                                        maxLength={200}
                                        placeholder="Klip-Klop is being fixed right now. Check back in a little while."
                                        value={maintenance.message}
                                        onChange={(e) => setMaintenance((m) => ({ ...m, message: e.target.value }))}
                                    />
                                    <Button variant="neutral" className="flex-none" disabled={maintenanceBusy} onClick={() => void saveMaintenance(maintenance.on)}>
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </Section>

                        <Section
                            title="YouTube cookies"
                            hint="When YouTube asks to sign in or the cookies expire, export a fresh cookies.txt (Netscape format) from a signed-in browser and upload or paste it here. Replaces the file right away."
                        >
                            <p className="text-xs sm:text-sm">{cookieSummary(ytCookies)}</p>
                            {ytCookies.configured && (
                                <>
                                    <textarea
                                        aria-label="YouTube cookies.txt"
                                        rows={4}
                                        spellCheck={false}
                                        autoComplete="off"
                                        placeholder="# Netscape HTTP Cookie File&#10;.youtube.com	TRUE	/	TRUE	..."
                                        value={ytText}
                                        onChange={(e) => setYtText(e.target.value)}
                                        className="w-full rounded-base border-2 border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <label className={cn(buttonVariants({ variant: "neutral", size: "sm" }), "cursor-pointer")}>
                                            <Upload /> Choose .txt
                                            <input
                                                type="file"
                                                accept=".txt,text/plain"
                                                className="sr-only"
                                                onChange={(e) => {
                                                    void loadCookieFile(e.target.files?.[0]);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                        <Button size="sm" disabled={ytBusy || !ytText.trim()} onClick={() => void saveYoutubeCookies()}>
                                            {ytBusy ? "Saving..." : "Replace cookies"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Section>

                        <YtdlpSection onFail={(title, err) => fail(title)(err)} />

                        <Section title="General" hint="Defaults for the editor and how long finished downloads stay on the server.">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="flex flex-col gap-1.5">
                                <Label className={fieldLabel}>Default quality</Label>
                                <Select value={settings.default_height} onValueChange={set("default_height")}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {HEIGHTS.map((h) => (
                                            <SelectItem key={h} value={h}>{h === "max" ? "Highest available" : `${h}p`}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className={fieldLabel}>Default theme</Label>
                                <Select value={settings.default_theme} onValueChange={set("default_theme")}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {THEMES.map((t) => (
                                            <SelectItem key={t} value={t}>{t.includes("-") ? t : `${t} (follow device)`}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="retention" className={fieldLabel}>Keep downloads (hours)</Label>
                                <Input id="retention" inputMode="decimal" value={settings.retention_hours} onChange={(e) => set("retention_hours")(e.target.value)} />
                            </div>
                        </div>
                        </Section>

                        <Section title="Instagram" hint="The sessionid cookie of a signed-in Instagram account, so posts that need a login can load.">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="igsession" className={fieldLabel}>Instagram sessionid</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="igsession"
                                        type={showSession ? "text" : "password"}
                                        autoComplete="off"
                                        placeholder="Empty = logged out"
                                        value={settings.instagram_sessionid}
                                        onChange={(e) => set("instagram_sessionid")(e.target.value)}
                                    />
                                    <Button variant="neutral" size="icon" className="flex-none" onClick={() => setShowSession((v) => !v)} aria-label={showSession ? "Hide" : "Show"}>
                                        {showSession ? <EyeOff /> : <Eye />}
                                    </Button>
                                </div>
                            </div>
                        </Section>

                        {NUMBER_GROUPS.map((group) => (
                            <Section key={group.id} title={group.title} hint={group.hint}>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {NUMBER_FIELDS.filter((field) => field.group === group.id).map((field) => (
                                        <div key={field.name} className="flex flex-col gap-1.5">
                                            <Label htmlFor={field.name} className={fieldLabel}>{field.label}</Label>
                                            <Input id={field.name} inputMode="numeric" value={settings[field.name]} onChange={(e) => set(field.name)(e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        ))}

                        <div className="flex items-center justify-end gap-3">
                            <span className="text-xs sm:text-sm text-muted-foreground">Saves General, Instagram, Preview, Traffic and Accounts.</span>
                            <Button onClick={() => void saveSettings()} disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="proxies" className="flex flex-col gap-3 pt-2">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            {anyOn
                                ? "Tried top to bottom. When one fails, the next one takes over."
                                : "No proxy is on, so every platform goes direct from this server."}
                        </p>

                        {proxies.map((proxy, index) => {
                            const result = tests[proxy.id];
                            return (
                                <div key={proxy.id} className="flex gap-2 rounded-base border-2 border-border bg-secondary-background p-3">
                                    <div className="flex flex-none flex-col gap-1">
                                        <Button variant="neutral" size="icon" className="size-7" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                                            <ArrowUp />
                                        </Button>
                                        <Button variant="neutral" size="icon" className="size-7" disabled={index === proxies.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                                            <ArrowDown />
                                        </Button>
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                        <div className="flex flex-wrap items-baseline gap-x-2">
                                            <span className={cn("font-heading", !proxy.enabled && "text-muted-foreground")}>
                                                {proxy.enabled ? "●" : "○"} {proxy.name}
                                            </span>
                                            <span className="break-all text-xs text-muted-foreground">{proxy.url}</span>
                                            {!proxy.enabled && <span className="text-xs text-muted-foreground">(off)</span>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {platformList(proxy.platforms).map(platformLabel).join(", ")}
                                            {" · "}
                                            {result === undefined && "not tested"}
                                            {result === "running" && "testing..."}
                                            {result && result !== "running" && (
                                                <span className="text-foreground">
                                                    {result.ok ? "✓" : "✗"} {result.ip ?? "no IP"} · {(result.ms / 1000).toFixed(1)}s
                                                    {result.error && <span className="block break-words text-muted-foreground">{result.error}</span>}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <Button variant="neutral" size="sm" disabled={result === "running"} onClick={() => void test(proxy)}>
                                                <Zap /> Test
                                            </Button>
                                            <Button variant="neutral" size="sm" onClick={() => setDraft({ id: proxy.id, name: proxy.name, url: proxy.url, platforms: platformList(proxy.platforms) })}>
                                                <Pencil /> Edit
                                            </Button>
                                            <Button variant="neutral" size="sm" onClick={() => void toggle(proxy)}>
                                                <Power /> {proxy.enabled ? "Turn off" : "Turn on"}
                                            </Button>
                                            <Button variant="neutral" size="sm" onClick={() => setDeleting(proxy)}>
                                                <Trash2 /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="flex justify-end">
                            <Button onClick={() => setDraft({ id: null, name: "", url: "http://", platforms: ["youtube"] })}>
                                <Plus /> Add proxy
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="flex flex-col gap-3 pt-2">
                        <UsersTab
                            initialUsers={initialUsers}
                            selfId={selfId}
                            onCount={setUserCount}
                            onFail={(title, err) => fail(title)(err)}
                        />
                    </TabsContent>

                    <TabsContent value="blocked" className="flex flex-col gap-3 pt-2">
                        <BlockedTab
                            initialBlocked={initialBlocked}
                            onCount={setBlockedCount}
                            onFail={(title, err) => fail(title)(err)}
                        />
                    </TabsContent>
                </Tabs>
            </Card>

            <AlertDialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{draft?.id === null ? "Add proxy" : "Edit proxy"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            An HTTP proxy this server can reach, like http://127.0.0.1:18888. Cutting a clip needs HTTP; SOCKS only works for full downloads.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {draft && (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="proxy-name" className="text-muted-foreground text-xs sm:text-sm">Name</Label>
                                <Input id="proxy-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="proxy-url" className="text-muted-foreground text-xs sm:text-sm">Address</Label>
                                <Input id="proxy-url" autoComplete="off" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-muted-foreground text-xs sm:text-sm">Use for</span>
                                <div className="flex flex-wrap gap-2">
                                    {PLATFORMS.map((p) => {
                                        const on = draft.platforms.includes(p.id);
                                        return (
                                            <Button
                                                key={p.id}
                                                size="sm"
                                                variant={on ? "default" : "neutral"}
                                                aria-pressed={on}
                                                onClick={() =>
                                                    setDraft({
                                                        ...draft,
                                                        platforms: on ? draft.platforms.filter((x) => x !== p.id) : [...draft.platforms, p.id],
                                                    })
                                                }
                                            >
                                                {p.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button onClick={() => void saveDraft()}>Save</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this proxy?</AlertDialogTitle>
                        <AlertDialogDescription className="wrap-anywhere">
                            {deleting?.name} ({deleting?.url})
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleting && void remove(deleting)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
