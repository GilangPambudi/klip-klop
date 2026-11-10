// Run with: npm test
// Talks to the real database in DATABASE_URL, using throwaway "test:" accounts
// that it removes afterwards. Skipped when there is no database configured.
import assert from "node:assert/strict";
import fs from "node:fs";
import { after, test } from "node:test";

if (fs.existsSync(".env")) process.loadEnvFile(".env");
const skip = process.env.DATABASE_URL ? false : "DATABASE_URL is not set";

const { eq, like } = await import("drizzle-orm");
const { db } = await import("../src/lib/db/index.ts");
const { users } = await import("../src/lib/db/schema.ts");
const { getAccount, refundCredit, takeCredit, touchUser } = await import(
  "../src/lib/db/accounts.ts"
);

const id = (name) => `test:${process.pid}-${name}`;
const make = (name) =>
  touchUser({ id: id(name), provider: "test", name, image: null });

after(async () => {
  if (skip) return;
  await db().delete(users).where(like(users.id, `test:${process.pid}-%`));
  await db().$client.end();
});

test("a new account has 3 credits and runs out after 3 downloads", { skip }, async () => {
  await make("a");
  assert.deepEqual(await getAccount(id("a")), { credits: 3, banned: false });
  assert.equal(await takeCredit(id("a")), true);
  assert.equal(await takeCredit(id("a")), true);
  assert.equal(await takeCredit(id("a")), true);
  assert.equal(await takeCredit(id("a")), false);
  assert.equal((await getAccount(id("a"))).credits, 0);
});

test("two downloads at once cannot both spend the last credit", { skip }, async () => {
  await make("race");
  await db().update(users).set({ credits: 1 }).where(eq(users.id, id("race")));
  const results = await Promise.all([takeCredit(id("race")), takeCredit(id("race"))]);
  assert.deepEqual(results.sort(), [false, true]);
  assert.equal((await getAccount(id("race"))).credits, 0);
});

test("a failed download gives the credit back", { skip }, async () => {
  await make("b");
  await takeCredit(id("b"));
  await refundCredit(id("b"));
  assert.equal((await getAccount(id("b"))).credits, 3);
});

test("logging in again keeps credits and the ban", { skip }, async () => {
  await make("c");
  await takeCredit(id("c"));
  await db().update(users).set({ banned: true }).where(eq(users.id, id("c")));
  await touchUser({ id: id("c"), provider: "test", name: "renamed", image: null });
  assert.deepEqual(await getAccount(id("c")), { credits: 2, banned: true });
});

test("a banned account cannot take a credit", { skip }, async () => {
  await make("d");
  await db().update(users).set({ banned: true }).where(eq(users.id, id("d")));
  assert.equal(await takeCredit(id("d")), false);
  assert.equal((await getAccount(id("d"))).credits, 3);
});

test("an unlimited account is never charged", { skip }, async () => {
  await make("e");
  await db().update(users).set({ unlimited: true }).where(eq(users.id, id("e")));
  for (let i = 0; i < 5; i++) assert.equal(await takeCredit(id("e")), true);
  assert.equal((await getAccount(id("e"))).credits, null);
});

test("an unknown account cannot download", { skip }, async () => {
  assert.equal(await getAccount(id("nobody")), null);
  assert.equal(await takeCredit(id("nobody")), false);
});
