import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { headers } from "next/headers";
import { getAccount, touchUser } from "@/lib/db/accounts";
import { logEvent } from "@/lib/db/events";
import { ipFromForwarded } from "@/lib/guard";

async function requestIp() {
  try {
    return ipFromForwarded((await headers()).get("x-forwarded-for"));
  } catch {
    return "unknown";
  }
}

// No AUTH_SECRET = the local launcher: nobody signs in and every download belongs to one "local" user.
export const authEnabled = Boolean(process.env.AUTH_SECRET);

if (
  !authEnabled &&
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_NO_AUTH !== "true"
) {
  throw new Error(
    "AUTH_SECRET is empty, which would leave downloads and /config open to anyone. Set AUTH_SECRET, or ALLOW_NO_AUTH=true for a private machine.",
  );
}

// Google is wired up but stays off until AUTH_GOOGLE_ENABLED=true (with AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).
const googleEnabled = process.env.AUTH_GOOGLE_ENABLED === "true";

/** Providers the UI may offer. Empty when sign-in is off. */
export const providerIds = authEnabled
  ? ["discord", ...(googleEnabled ? ["google"] : [])]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Discord sends iss=https://discord.com on every callback (RFC 9207); without an issuer here Auth.js rejects the sign-in.
    Discord({
      issuer: "https://discord.com",
      authorization: { params: { scope: "identify" } },
    }),
    ...(googleEnabled
      ? [Google({ authorization: { params: { scope: "openid profile" } } })]
      : []),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async jwt({ token, account }) {
      // `account` is only present on the sign-in itself.
      if (account) {
        // Prefixed so a Discord ID can never collide with a Google one.
        const id = `${account.provider}:${account.providerAccountId}`;
        token.uid = id;
        const created = await touchUser({
          id,
          provider: account.provider,
          name: token.name ?? "",
          image: token.picture ?? null,
        });
        await logEvent(created ? "signup" : "login", await requestIp(), id);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      return session;
    },
  },
});

let localUserReady: Promise<boolean> | undefined;

/**
 * The account behind this request with its balance and ban flag, or null when
 * the visitor has to sign in first.
 */
export async function currentAccount() {
  if (!authEnabled) {
    localUserReady ??= touchUser({
      id: "local",
      provider: "local",
      name: "Local",
      image: null,
      unlimited: true,
    });
    await localUserReady;
    const account = await getAccount("local");
    return account && { id: "local", ...account };
  }

  const user = (await auth())?.user;
  if (!user?.id) return null;

  let account = await getAccount(user.id);
  if (!account) {
    // A session from before the database existed: the cookie is valid but there is no row yet.
    await touchUser({
      id: user.id,
      provider: user.id.split(":")[0],
      name: user.name ?? "",
      image: user.image ?? null,
    });
    account = await getAccount(user.id);
  }
  return account && { id: user.id, ...account };
}

export async function currentAdmin() {
  const account = await currentAccount();
  if (!account) return null;
  return !authEnabled || account.admin ? account : null;
}
