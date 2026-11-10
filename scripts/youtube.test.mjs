// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatClock, linkStartSeconds } from "../src/lib/youtube.ts";

test("reads the start position in every form YouTube writes it", () => {
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4&t=181"), 181);
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4&t=181s"), 181);
  assert.equal(linkStartSeconds("https://youtu.be/S9sHNH8RiM4?t=3m1s"), 181);
  assert.equal(linkStartSeconds("https://youtu.be/S9sHNH8RiM4?t=1h2m3s"), 3723);
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?t=90&v=S9sHNH8RiM4"), 90);
  assert.equal(linkStartSeconds("https://www.youtube.com/embed/S9sHNH8RiM4?start=42"), 42);
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4#t=75"), 75);
});

test("a link without a start position gives 0", () => {
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4"), 0);
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4&t=0"), 0);
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4&list=abc"), 0);
  // "t" inside another parameter's name or value is not a start position.
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4&start_radio=1"), 0);
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4&list=t=5"), 0);
  assert.equal(linkStartSeconds("https://www.youtube.com/watch?v=S9sHNH8RiM4&t=soon"), 0);
});

test("formats seconds the way a player shows them", () => {
  assert.equal(formatClock(5), "0:05");
  assert.equal(formatClock(181), "3:01");
  assert.equal(formatClock(3723), "1:02:03");
});
