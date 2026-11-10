import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "./index.ts";
import { users } from "./schema.ts";

interface Profile {
  id: string;
  provider: string;
  name: string;
  image: string | null;
  /** Only the built-in "local" user starts unlimited. */
  unlimited?: boolean;
}

/** Creates the account on first sight; afterwards refreshes name, picture and last login. */
export async function touchUser({ id, provider, name, image, unlimited }: Profile) {
  const now = new Date();
  await db()
    .insert(users)
    .values({
      id,
      provider,
      name,
      image,
      unlimited: unlimited ?? false,
      createdAt: now,
      lastLoginAt: now,
    })
    // Credits, unlimited and banned are deliberately left alone on later logins.
    .onDuplicateKeyUpdate({ set: { name, image, lastLoginAt: now } });
}

export interface Account {
  /** Credits left, or null when the account is never charged. */
  credits: number | null;
  banned: boolean;
}

export async function getAccount(id: string): Promise<Account | null> {
  const [user] = await db().select().from(users).where(eq(users.id, id));
  if (!user) return null;
  return { credits: user.unlimited ? null : user.credits, banned: user.banned };
}

/**
 * Takes one credit before a download starts; false when the account has none
 * left, is banned, or does not exist. Taking it up front (and refunding on
 * failure) plus the `credits > 0` guard in the UPDATE itself stops two
 * downloads started at once from both spending the same last credit.
 */
export async function takeCredit(id: string) {
  const account = await getAccount(id);
  if (!account || account.banned) return false;
  if (account.credits === null) return true;

  const [result] = await db()
    .update(users)
    .set({ credits: sql`${users.credits} - 1` })
    .where(and(eq(users.id, id), gt(users.credits, 0)));
  return result.affectedRows === 1;
}

/** Gives the credit back when the download it paid for failed. */
export async function refundCredit(id: string) {
  await db()
    .update(users)
    .set({ credits: sql`${users.credits} + 1` })
    .where(and(eq(users.id, id), eq(users.unlimited, false)));
}
