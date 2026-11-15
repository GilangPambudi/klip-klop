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

interface Gate {
  account: Account | null;
  config: SiteConfig;
  ip: string;
  denied: NextResponse | null;
}

export async function gate(req: NextRequest): Promise<Gate> {
  const [account, config] = await Promise.all([currentAccount(), getConfig()]);
  const ip = clientIp(req);
  const pass = { account, config, ip, denied: null };

  if (!authEnabled || account?.admin) return pass;

  if (config.maintenance) {
    return {
      ...pass,
      denied: NextResponse.json(
        { error: config.maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE, maintenance: true },
        { status: 503 },
      ),
    };
  }
  if (await isBlocked(ip)) {
    return { ...pass, denied: NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 }) };
  }
  return pass;
}
