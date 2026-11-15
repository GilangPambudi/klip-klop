import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function fromThisMachine(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (!forwarded) return true;
  return forwarded.split(",").every((ip) => LOOPBACK.has(ip.trim()));
}

export function internalAuthorized(req: NextRequest) {
  const expected = process.env.INTERNAL_API_TOKEN?.trim();
  if (!expected || expected.length < 32) return false;
  if (!fromThisMachine(req)) return false;

  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function internalNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
