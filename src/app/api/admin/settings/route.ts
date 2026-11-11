import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import {
  readSettings,
  SETTING_NAMES,
  validateSetting,
  writeSettings,
  type Settings,
} from "@/lib/db/settings";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET() {
  if (!(await currentAdmin())) return notFound();
  return NextResponse.json(await readSettings());
}

export async function PUT(req: NextRequest) {
  if (!(await currentAdmin())) return notFound();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const values: Partial<Settings> = {};
  for (const name of SETTING_NAMES) {
    if (!(name in body)) continue;
    const raw = body[name];
    const value = typeof raw === "string" ? validateSetting(name, raw) : null;
    if (value === null) {
      return NextResponse.json({ error: `Invalid value for ${name}` }, { status: 400 });
    }
    values[name] = value;
  }

  await writeSettings(values);
  return NextResponse.json(await readSettings());
}
