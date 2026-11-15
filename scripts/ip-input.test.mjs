import assert from "node:assert/strict";
import { test } from "node:test";
import { readBlockInput } from "../src/lib/ip-input.ts";

test("a block needs a real IP and defaults to 24 hours", () => {
  assert.deepEqual(readBlockInput({ ip: " 203.0.113.7 " }), { ip: "203.0.113.7", hours: 24, reason: "" });
  assert.deepEqual(readBlockInput({ ip: "2001:db8::1", hours: 2, reason: "spam" }), {
    ip: "2001:db8::1",
    hours: 2,
    reason: "spam",
  });
});

test("nonsense is refused", () => {
  assert.ok("error" in readBlockInput({ ip: "not-an-ip" }));
  assert.ok("error" in readBlockInput({ ip: "203.0.113.7", hours: 0 }));
  assert.ok("error" in readBlockInput({ ip: "203.0.113.7", hours: 1.5 }));
  assert.ok("error" in readBlockInput(null));
});
