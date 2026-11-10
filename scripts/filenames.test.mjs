// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { displayName, ownsFile, uniqueBase } from "../src/lib/filenames.ts";

const A = "discord:111";

test("a new download is prefixed with its owner", () => {
  assert.equal(uniqueBase(A, "My Clip", []), "discord_111-My_Clip");
});

test("a taken name gets (2), then (3)", () => {
  const taken = ["discord_111-My_Clip.mp4"];
  assert.equal(uniqueBase(A, "My Clip", taken), "discord_111-My_Clip (2)");
  taken.push("discord_111-My_Clip (2).mp3");
  assert.equal(uniqueBase(A, "My Clip", taken), "discord_111-My_Clip (3)");
});

test("a download still in progress also counts as taken", () => {
  assert.equal(
    uniqueBase(A, "My Clip", ["discord_111-My_Clip.f137.mp4.part"]),
    "discord_111-My_Clip (2)",
  );
});

test("two accounts with the same name never collide", () => {
  assert.equal(
    uniqueBase("google:111", "My Clip", ["discord_111-My_Clip.mp4"]),
    "google_111-My_Clip",
  );
});

test("a hostile name cannot leave the folder or fake a prefix", () => {
  assert.equal(uniqueBase(A, "../../etc/passwd", []), "discord_111-etc_passwd");
  assert.equal(uniqueBase(A, "", []), "discord_111-clip");
});

test("ownership follows the full prefix, not a shared start", () => {
  assert.equal(ownsFile(A, "discord_111-x.mp4"), true);
  assert.equal(ownsFile("discord:11", "discord_111-x.mp4"), false);
  assert.equal(ownsFile(A, "x.mp4"), false);
});

test("the shown name drops the prefix and keeps the number", () => {
  assert.equal(displayName(A, "discord_111-My_Clip (2).mp4"), "My_Clip (2).mp4");
});
