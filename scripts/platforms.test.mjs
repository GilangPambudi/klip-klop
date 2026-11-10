import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLink } from "../src/lib/platforms.ts";

const key = (url) => parseLink(url)?.key ?? null;
const platform = (url) => parseLink(url)?.platform ?? null;

test("reads a YouTube video in every link form", () => {
  assert.equal(key("https://www.youtube.com/watch?v=S9sHNH8RiM4"), "youtube:S9sHNH8RiM4");
  assert.equal(key("https://www.youtube.com/watch?t=90&v=S9sHNH8RiM4"), "youtube:S9sHNH8RiM4");
  assert.equal(key("https://youtu.be/S9sHNH8RiM4?t=3m1s"), "youtube:S9sHNH8RiM4");
  assert.equal(key("https://www.youtube.com/shorts/S9sHNH8RiM4"), "youtube:S9sHNH8RiM4");
  assert.equal(key("https://www.youtube.com/embed/S9sHNH8RiM4?start=42"), "youtube:S9sHNH8RiM4");
  assert.equal(key("https://music.youtube.com/watch?v=S9sHNH8RiM4&list=abc"), "youtube:S9sHNH8RiM4");
  assert.equal(key("m.youtube.com/watch?v=S9sHNH8RiM4"), "youtube:S9sHNH8RiM4");
});

test("reads TikTok videos and short links", () => {
  assert.equal(
    key("https://www.tiktok.com/@scout2015/video/6718335390845095173?is_from_webapp=1"),
    "tiktok:6718335390845095173",
  );
  assert.equal(key("https://vm.tiktok.com/ZMabcdefg/"), "tiktok:ZMabcdefg");
  assert.equal(key("https://vt.tiktok.com/ZSabcdefg"), "tiktok:ZSabcdefg");
  assert.equal(key("https://www.tiktok.com/t/ZTabcdefg/"), "tiktok:ZTabcdefg");
});

test("reads Instagram posts and reels", () => {
  assert.equal(key("https://www.instagram.com/p/aye83DjauH/"), "instagram:aye83DjauH");
  assert.equal(key("https://www.instagram.com/reel/C8abcDEfgHi/?igsh=xyz"), "instagram:C8abcDEfgHi");
  assert.equal(key("https://instagram.com/someone/reel/C8abcDEfgHi"), "instagram:C8abcDEfgHi");
});

test("a supported site without a video has no key", () => {
  assert.equal(platform("https://www.youtube.com/@channel"), "youtube");
  assert.equal(key("https://www.youtube.com/@channel"), null);
  assert.equal(key("https://www.youtube.com/watch?v=short"), null);
  assert.equal(key("https://www.tiktok.com/@scout2015"), null);
  assert.equal(key("https://www.instagram.com/someone/"), null);
});

test("other sites are recognised as links but not supported", () => {
  assert.equal(platform("https://example.com/watch?v=S9sHNH8RiM4"), null);
  assert.equal(key("https://example.com/watch?v=S9sHNH8RiM4"), null);
  assert.equal(platform("https://notyoutube.com/watch?v=S9sHNH8RiM4"), null);
  assert.equal(platform("https://youtube.com.evil.io/watch?v=S9sHNH8RiM4"), null);
});

test("text that is not a link is ignored", () => {
  assert.equal(parseLink(""), null);
  assert.equal(parseLink("S9sHNH8RiM4"), null);
  assert.equal(parseLink("hello world"), null);
  assert.equal(parseLink("--exec=calc"), null);
});

test("the link handed to the downloader always starts with a scheme", () => {
  assert.equal(
    parseLink("youtu.be/S9sHNH8RiM4").url,
    "https://youtu.be/S9sHNH8RiM4",
  );
  assert.match(parseLink("-x.youtube.com/watch?v=S9sHNH8RiM4")?.url ?? "https://", /^https:\/\//);
});
