import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";

// No AUTH_SECRET = the local launcher: nobody signs in and every download belongs to one "local" user.
export const authEnabled = Boolean(process.env.AUTH_SECRET);

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
    jwt({ token, account }) {
      // Prefixed so a Discord ID can never collide with a Google one.
      if (account) {
        token.uid = `${account.provider}:${account.providerAccountId}`;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      return session;
    },
  },
});

/** Owner key for downloads, or null when the visitor has to sign in first. */
export async function currentUserId() {
  if (!authEnabled) return "local";
  return (await auth())?.user?.id || null;
}
