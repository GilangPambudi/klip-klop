// Run with: npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

// credits.ts reads its file from <cwd>/download, so work in a throwaway folder.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klip-credits-"));
process.chdir(dir);
process.env.AUTH_UNLIMITED_IDS = "discord:boss, google:boss";

const { creditsLeft, takeCredit, refundCredit } = await import(
  "../src/lib/credits.ts"
);

test("a new account has 3 credits and runs out after 3 downloads", () => {
  assert.equal(creditsLeft("discord:a"), 3);
  assert.equal(takeCredit("discord:a"), true);
  assert.equal(takeCredit("discord:a"), true);
  assert.equal(takeCredit("discord:a"), true);
  assert.equal(creditsLeft("discord:a"), 0);
  assert.equal(takeCredit("discord:a"), false);
  assert.equal(creditsLeft("discord:a"), 0);
});

test("a failed download gives the credit back", () => {
  takeCredit("discord:b");
  refundCredit("discord:b");
  assert.equal(creditsLeft("discord:b"), 3);
});

test("accounts do not share a balance", () => {
  assert.equal(creditsLeft("discord:c"), 3);
});

test("unlimited and local owners are never charged", () => {
  for (const owner of ["discord:boss", "google:boss", "local"]) {
    for (let i = 0; i < 5; i++) assert.equal(takeCredit(owner), true);
    assert.equal(creditsLeft(owner), null);
  }
});

test("a corrupt balance file fails instead of resetting everyone", () => {
  const file = path.join(dir, "download", ".credits.json");
  const good = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, "{ not json");
  assert.throws(() => takeCredit("discord:a"));
  fs.writeFileSync(file, good);
});
