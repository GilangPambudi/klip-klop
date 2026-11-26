import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { saveYoutubeCookies, youtubeCookieStatus } from "@/lib/cookies";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET() {
  if (!(await currentAdmin())) return notFound();
  return NextResponse.json(youtubeCookieStatus());
}

export async function PUT(req: NextRequest) {
  if (!(await currentAdmin())) return notFound();

  const body = await req.json().catch(() => null);
  if (typeof body?.text !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    saveYoutubeCookies(body.text);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
  return NextResponse.json(youtubeCookieStatus());
}
