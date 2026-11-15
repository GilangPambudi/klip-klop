import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { getConfig } from "@/lib/db/config";
import { setMaintenance } from "@/lib/db/settings";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function PUT(req: NextRequest) {
  if (!(await currentAdmin())) return notFound();

  const body = await req.json().catch(() => null);
  if (typeof body?.on !== "boolean" || (body.message !== undefined && typeof body.message !== "string")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await setMaintenance(body.on, body.message);
  const config = await getConfig();
  return NextResponse.json({ on: config.maintenance, message: config.maintenanceMessage });
}
