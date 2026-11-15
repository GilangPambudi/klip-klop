import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { listBlockedIps, unblockIp } from "@/lib/db/events";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ ip: string }> }) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await unblockIp(decodeURIComponent((await params).ip));
  return NextResponse.json(await listBlockedIps());
}
