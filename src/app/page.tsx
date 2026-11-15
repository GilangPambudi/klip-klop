import VideoEditor from "@/components/VideoEditor";
import { MaintenancePage } from "@/components/MaintenancePage";
import { auth, authEnabled, currentAccount, providerIds } from "@/auth";
import { getConfig } from "@/lib/db/config";
import { DEFAULT_MAINTENANCE_MESSAGE } from "@/lib/gate";

export default async function Home() {
  const session = authEnabled ? await auth() : null;
  const account = session?.user ? await currentAccount() : null;
  const config = await getConfig();

  if (authEnabled && config.maintenance && !account?.admin) {
    return (
      <MaintenancePage
        message={config.maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE}
        provider={account ? null : (providerIds[0] ?? null)}
      />
    );
  }

  const user =
    session?.user && account
      ? {
          name: session.user.name ?? "",
          image: session.user.image ?? null,
          // "<provider>:<account id>" (see auth.ts).
          id: account.id,
          provider: account.id.split(":")[0],
          credits: account.credits,
          banned: account.banned,
          admin: account.admin,
        }
      : null;

  return (
    <main className="min-h-screen bg-background flex items-start justify-center px-3 pt-3 pb-20 lg:px-4 lg:h-screen lg:items-center lg:py-10">
      <div className="w-full md:max-w-[90%] sm:max-w-full lg:h-full lg:max-h-[90vh]">
        <VideoEditor
          user={user}
          providers={providerIds}
          defaultHeight={config.defaultHeight}
          previewRetries={config.previewRetries}
        />
      </div>
    </main>
  );
}
