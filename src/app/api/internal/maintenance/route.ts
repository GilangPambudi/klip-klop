import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/db/config";
import { setMaintenance } from "@/lib/db/settings";
import { forgetGateCache } from "@/lib/gate";
import { internalAuthorized, internalNotFound } from "@/lib/internal-auth";

async function status() {
  const config = await getConfig();
  return NextResponse.json({ maintenance: config.maintenance, message: config.maintenanceMessage });
}

export async function GET(req: NextRequest) {
  if (!internalAuthorized(req)) return internalNotFound();
  return status();
}

export async function POST(req: NextRequest) {
  if (!internalAuthorized(req)) return internalNotFound();

  const body = await req.json().catch(() => null);
  if (typeof body?.on !== "boolean") {
    return NextResponse.json({ error: "Send {\"on\": true} or {\"on\": false}" }, { status: 400 });
  }
  if (body.message !== undefined && typeof body.message !== "string") {
    return NextResponse.json({ error: "message must be text" }, { status: 400 });
  }

  await setMaintenance(body.on, body.message);
  forgetGateCache();
  return status();
}
