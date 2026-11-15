import { notFound } from "next/navigation";
import { currentAdmin } from "@/auth";
import { ConfigPanel } from "@/components/config/ConfigPanel";
import { listUsers } from "@/lib/db/accounts";
import { readSettings } from "@/lib/db/settings";
import { listProxies } from "@/lib/proxies";

export const metadata = { title: "Config · Klip-Klop" };

export default async function ConfigPage() {
  const admin = await currentAdmin();
  if (!admin) notFound();

  const [settings, proxies, users] = await Promise.all([readSettings(), listProxies(), listUsers()]);

  return (
    <main className="min-h-screen bg-background flex justify-center px-3 pt-3 pb-20 lg:px-4 lg:py-10">
      <div className="w-full max-w-3xl">
        <ConfigPanel
          initialSettings={settings}
          initialProxies={proxies}
          initialUsers={users.map((u) => ({
            id: u.id,
            provider: u.provider,
            name: u.name,
            image: u.image,
            credits: u.credits,
            unlimited: u.unlimited,
            banned: u.banned,
            admin: u.admin,
            lastLoginAt: u.lastLoginAt.toISOString(),
          }))}
          selfId={admin.id}
        />
      </div>
    </main>
  );
}
