import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { blockIp, listBlockedIps } from "@/lib/db/events";
import { readBlockInput } from "@/lib/ip-input";
import { forgetGateCache } from "@/lib/gate";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET() {
  if (!(await currentAdmin())) return notFound();
  return NextResponse.json(await listBlockedIps());
}

export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return notFound();

  const input = readBlockInput(await req.json().catch(() => null));
  if ("error" in input) return NextResponse.json(input, { status: 400 });

  await blockIp(input.ip, input.hours, input.reason);
  forgetGateCache();
  return NextResponse.json(await listBlockedIps());
}
