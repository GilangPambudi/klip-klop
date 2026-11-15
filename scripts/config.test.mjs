// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULTS, parseConfig, themeProps } from "../src/lib/db/config.ts";

test("an empty config table gives the defaults", () => {
  assert.deepEqual(parseConfig({}), DEFAULTS);
  assert.equal(DEFAULTS.defaultTheme, "mono");
});

test("valid rows are used", () => {
  assert.deepEqual(
    parseConfig({
      default_height: "720",
      default_theme: "neon-dark",
      retention_hours: "1.5",
    }),
    {
      ...DEFAULTS,
      defaultHeight: 720,
      defaultTheme: "neon-dark",
      retentionHours: 1.5,
    },
  );
  assert.deepEqual(
    parseConfig({ preview_retries: "0", starting_credits: "10", preview_max_mb: "50" }),
    { ...DEFAULTS, previewRetries: 0, startingCredits: 10, previewMaxMb: 50 },
  );
  assert.equal(parseConfig({ default_theme: "neon" }).defaultTheme, "neon");
});

test('"max" means the highest resolution available', () => {
  assert.equal(parseConfig({ default_height: "max" }).defaultHeight, null);
});

test("nonsense falls back instead of breaking the site", () => {
  assert.deepEqual(
    parseConfig({
      default_height: "-5",
      default_theme: "hot-pink",
      retention_hours: "0",
    }),
    DEFAULTS,
  );
  assert.equal(parseConfig({ retention_hours: "soon" }).retentionHours, 24);
  assert.deepEqual(
    parseConfig({ preview_retries: "11", starting_credits: "-1", preview_max_mb: "0" }),
    DEFAULTS,
  );
  assert.equal(parseConfig({ preview_retries: "1.5" }).previewRetries, 3);
});

test("a family follows the device, in that family's light and dark", () => {
  const mono = themeProps("mono");
  assert.equal(mono.defaultTheme, "system");
  assert.equal(mono.value.light, "mono-light");
  assert.equal(mono.value.dark, "mono-dark");

  const neon = themeProps("neon");
  assert.equal(neon.defaultTheme, "system");
  assert.equal(neon.value.dark, "neon-dark");
});

test("a fixed theme stays fixed, and picked themes keep their own class", () => {
  const fixed = themeProps("neon-light");
  assert.equal(fixed.defaultTheme, "neon-light");
  assert.equal(fixed.value["mono-dark"], "mono-dark");
  // "Auto" picked by hand still has something to resolve to.
  assert.equal(fixed.value.dark, "mono-dark");
});
