import { and, desc, eq, gt, sql } from "drizzle-orm";
import { unlocksAt } from "../account-age.ts";
import { getConfig } from "./config.ts";
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

async function holdCredits(id: string) {
  try {
    await db().update(users).set({ credits: 0, creditsHeld: true }).where(eq(users.id, id));
  } catch (error) {
    console.error("Could not hold credits (is migration 0005 applied?):", error);
  }
}

async function releaseCredits(id: string, credits: number) {
  try {
    await db()
      .update(users)
      .set({ credits: sql`${users.credits} + ${credits}`, creditsHeld: false })
      .where(and(eq(users.id, id), eq(users.creditsHeld, true)));
  } catch (error) {
    console.error("Could not release held credits:", error);
  }
}

/** Creates the account on first sight; afterwards refreshes name, picture and last login. */
export async function touchUser({ id, provider, name, image, unlimited }: Profile) {
  const now = new Date();
  const { startingCredits, minAccountAgeDays } = await getConfig();
  const [result] = await db()
    .insert(users)
    .values({
      id,
      provider,
      name,
      image,
      credits: startingCredits,
      unlimited: unlimited ?? false,
      createdAt: now,
      lastLoginAt: now,
    })
    // Credits, unlimited and banned are deliberately left alone on later logins.
    .onDuplicateKeyUpdate({ set: { name, image, lastLoginAt: now } });
  const created = result.affectedRows === 1;

  const young = unlocksAt(id, minAccountAgeDays) !== null;
  if (created && young) await holdCredits(id);
  if (!created && !young) await releaseCredits(id, startingCredits);
  return created;
}

export interface Account {
  /** Credits left, or null when the account is never charged. */
  credits: number | null;
  banned: boolean;
  admin: boolean;
  held: boolean;
}

async function isHeld(id: string) {
  try {
    const [row] = await db()
      .select({ held: users.creditsHeld })
      .from(users)
      .where(eq(users.id, id));
    return row?.held ?? false;
  } catch {
    return false;
  }
}

export async function getAccount(id: string): Promise<Account | null> {
  const [user] = await db()
    .select({
      credits: users.credits,
      unlimited: users.unlimited,
      banned: users.banned,
      admin: users.admin,
    })
    .from(users)
    .where(eq(users.id, id));
  if (!user) return null;
  return {
    credits: user.unlimited ? null : user.credits,
    banned: user.banned,
    admin: user.admin,
    held: !user.unlimited && user.credits === 0 && (await isHeld(id)),
  };
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

const listColumns = {
  id: users.id,
  provider: users.provider,
  name: users.name,
  image: users.image,
  credits: users.credits,
  unlimited: users.unlimited,
  banned: users.banned,
  admin: users.admin,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
};

export interface UserChanges {
  credits?: number;
  unlimited?: boolean;
  banned?: boolean;
  admin?: boolean;
}

export async function listUsers() {
  return db().select(listColumns).from(users).orderBy(desc(users.lastLoginAt));
}

export async function heldUserIds(): Promise<Set<string>> {
  try {
    const rows = await db().select({ id: users.id }).from(users).where(eq(users.creditsHeld, true));
    return new Set(rows.map((r) => r.id));
  } catch {
    return new Set();
  }
}

export async function updateUser(id: string, changes: UserChanges) {
  if (Object.keys(changes).length === 0) return;
  await db().update(users).set(changes).where(eq(users.id, id));
  if (changes.credits !== undefined) {
    try {
      await db().update(users).set({ creditsHeld: false }).where(eq(users.id, id));
    } catch {}
  }
}

/** Gives the credit back when the download it paid for failed. */
export async function refundCredit(id: string) {
  await db()
    .update(users)
    .set({ credits: sql`${users.credits} + 1` })
    .where(and(eq(users.id, id), eq(users.unlimited, false)));
}
