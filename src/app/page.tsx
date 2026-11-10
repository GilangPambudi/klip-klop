import VideoEditor from "@/components/VideoEditor";
import { auth, authEnabled, providerIds } from "@/auth";
import { creditsLeft } from "@/lib/credits";

export default async function Home() {
  const session = authEnabled ? await auth() : null;
  const user = session?.user
    ? {
        name: session.user.name ?? "",
        image: session.user.image ?? null,
        // The id is "<provider>:<account id>" (see auth.ts).
        id: session.user.id ?? "",
        provider: (session.user.id ?? "").split(":")[0],
        credits: creditsLeft(session.user.id ?? ""),
      }
    : null;

  return (
    <main className="min-h-screen bg-background flex items-start justify-center px-3 pt-3 pb-20 lg:px-4 lg:h-screen lg:items-center lg:py-10">
      <div className="w-full md:max-w-[90%] sm:max-w-full lg:h-full lg:max-h-[90vh]">
        <VideoEditor user={user} providers={providerIds} />
      </div>
    </main>
  );
}
