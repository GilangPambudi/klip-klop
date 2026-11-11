import { notFound } from "next/navigation";
import { currentAdmin } from "@/auth";
import { ConfigPanel } from "@/components/config/ConfigPanel";
import { readSettings } from "@/lib/db/settings";
import { listProxies } from "@/lib/proxies";

export const metadata = { title: "Config · Klip-Klop" };

export default async function ConfigPage() {
  if (!(await currentAdmin())) notFound();

  const [settings, proxies] = await Promise.all([readSettings(), listProxies()]);

  return (
    <main className="min-h-screen bg-background flex justify-center px-3 pt-3 pb-20 lg:px-4 lg:py-10">
      <div className="w-full max-w-3xl">
        <ConfigPanel initialSettings={settings} initialProxies={proxies} />
      </div>
    </main>
  );
}
