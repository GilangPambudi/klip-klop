import assert from "node:assert/strict";
import { test } from "node:test";
import { discordCreatedAt, unlocksAt } from "../src/lib/account-age.ts";

const DAY = 24 * 60 * 60 * 1000;
const idFor = (date) => `discord:${(BigInt(date.getTime()) - 1420070400000n) << 22n}`;

test("reads the creation time out of a Discord ID", () => {
  assert.equal(discordCreatedAt("discord:175928847299117063")?.toISOString(), "2016-04-30T11:18:25.796Z");
  assert.equal(discordCreatedAt("google:123"), null);
  assert.equal(discordCreatedAt("discord:abc"), null);
});

test("a young account unlocks once it reaches the minimum age", () => {
  const now = Date.parse("2026-11-15T00:00:00Z");
  const young = idFor(new Date(now - 10 * DAY));
  assert.equal(unlocksAt(young, 90, now)?.toISOString(), new Date(now + 80 * DAY).toISOString());
});

test("old accounts, other providers and a 0-day rule are never held", () => {
  const now = Date.parse("2026-11-15T00:00:00Z");
  assert.equal(unlocksAt(idFor(new Date(now - 200 * DAY)), 90, now), null);
  assert.equal(unlocksAt(idFor(new Date(now - 10 * DAY)), 0, now), null);
  assert.equal(unlocksAt("google:123", 90, now), null);
});
