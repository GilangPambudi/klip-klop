import { NextRequest, NextResponse } from "next/server";
import { authEnabled, currentAccount } from "@/auth";
import { getConfig, type SiteConfig } from "@/lib/db/config";
import { isBlocked } from "@/lib/db/events";
import { clientIp } from "@/lib/guard";

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Klip-Klop is being fixed right now. Check back in a little while.";

export const BLOCKED_MESSAGE =
  "Access from your network is blocked for now. If this looks wrong, contact the site owner.";

export type Account = NonNullable<Awaited<ReturnType<typeof currentAccount>>>;

const CONFIG_TTL_MS = 5_000;
const BLOCKED_TTL_MS = 15_000;

interface GateCache {
  config: { at: number; value: SiteConfig } | null;
  blocked: Map<string, { at: number; value: boolean }>;
}

const globalGate = globalThis as typeof globalThis & { __klipKlopGate?: GateCache };
const cache: GateCache = (globalGate.__klipKlopGate ??= {
  config: null,
  blocked: new Map<string, { at: number; value: boolean }>(),
});

async function cachedConfig() {
  const now = Date.now();
  if (!cache.config || now - cache.config.at > CONFIG_TTL_MS) {
    cache.config = { at: now, value: await getConfig() };
  }
  return cache.config.value;
}

async function cachedBlocked(ip: string) {
  const now = Date.now();
  const hit = cache.blocked.get(ip);
  if (hit && now - hit.at <= BLOCKED_TTL_MS) return hit.value;
  const value = await isBlocked(ip);
  if (cache.blocked.size > 10_000) cache.blocked.clear();
  cache.blocked.set(ip, { at: now, value });
  return value;
}

export function forgetGateCache() {
  cache.config = null;
  cache.blocked.clear();
}

interface Gate {
  account: Account | null;
  config: SiteConfig;
  ip: string;
  denied: NextResponse | null;
}

export async function gate(req: NextRequest, { needAccount = true } = {}): Promise<Gate> {
  const config = await cachedConfig();
  const ip = clientIp(req);

  if (!authEnabled) {
    return { account: needAccount ? await currentAccount() : null, config, ip, denied: null };
  }

  const blocked = !config.maintenance && (await cachedBlocked(ip));
  const restricted = config.maintenance || blocked;
  const account = needAccount || restricted ? await currentAccount() : null;
  const pass = { account, config, ip, denied: null };

  if (!restricted || account?.admin) return pass;

  if (config.maintenance) {
    return {
      ...pass,
      denied: NextResponse.json(
        { error: config.maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE, maintenance: true },
        { status: 503 },
      ),
    };
  }
  return { ...pass, denied: NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 }) };
}
