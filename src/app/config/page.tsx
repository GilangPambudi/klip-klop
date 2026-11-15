import { notFound } from "next/navigation";
import { currentAdmin } from "@/auth";
import { ConfigPanel } from "@/components/config/ConfigPanel";
import { usersForAdmin } from "@/lib/admin-users";
import { getConfig } from "@/lib/db/config";
import { listBlockedIps } from "@/lib/db/events";
import { readSettings } from "@/lib/db/settings";
import { listProxies } from "@/lib/proxies";

export const metadata = { title: "Config · Klip-Klop" };

export default async function ConfigPage() {
  const admin = await currentAdmin();
  if (!admin) notFound();

  const [settings, proxies, users, config, blocked] = await Promise.all([
    readSettings(),
    listProxies(),
    usersForAdmin(),
    getConfig(),
    listBlockedIps().catch(() => []),
  ]);

  return (
    <main className="min-h-screen bg-background flex justify-center px-3 pt-3 pb-20 lg:px-4 lg:py-10">
      <div className="w-full md:max-w-[90%] sm:max-w-full">
        <ConfigPanel
          initialSettings={settings}
          initialProxies={proxies}
          initialUsers={users}
          initialMaintenance={{ on: config.maintenance, message: config.maintenanceMessage }}
          initialBlocked={blocked.map((b) => ({
            ip: b.ip,
            reason: b.reason,
            expiresAt: b.expiresAt.toISOString(),
          }))}
          selfId={admin.id}
        />
      </div>
    </main>
  );
}
