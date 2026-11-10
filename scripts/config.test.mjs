// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULTS, parseConfig } from "../src/lib/db/config.ts";

test("an empty config table gives the defaults", () => {
  assert.deepEqual(parseConfig({}), DEFAULTS);
});

test("valid rows are used", () => {
  assert.deepEqual(
    parseConfig({
      default_height: "720",
      default_theme: "neon-dark",
      retention_hours: "1.5",
    }),
    { defaultHeight: 720, defaultTheme: "neon-dark", retentionHours: 1.5 },
  );
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
});
