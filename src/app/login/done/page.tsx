"use client";

import { useEffect } from "react";
import { AUTH_CHANNEL } from "@/lib/utils";

// Where the sign-in popup lands. It tells the editor tab and gets out of the way.
export default function LoginDone() {
  useEffect(() => {
    // A channel rather than window.opener: the provider's pages can sever the opener link.
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage("signed-in");
    channel.close();
    window.close();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-sm">
      <p>Signed in. You can close this window.</p>
    </main>
  );
}
