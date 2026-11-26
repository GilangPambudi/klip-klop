import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { rollbackYtdlp, testYtdlp, updateYtdlp, ytdlpStatus } from "@/lib/ytdlp-admin";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET() {
  if (!(await currentAdmin())) return notFound();
  return NextResponse.json(await ytdlpStatus());
}

export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return notFound();

  const body = await req.json().catch(() => null);
  try {
    switch (body?.action) {
      case "update": {
        if (body.channel !== "stable" && body.channel !== "nightly") break;
        const output = await updateYtdlp(body.channel);
        return NextResponse.json({ output, status: await ytdlpStatus() });
      }
      case "rollback": {
        const output = await rollbackYtdlp();
        return NextResponse.json({ output, status: await ytdlpStatus() });
      }
      case "test": {
        if (typeof body.url !== "string") break;
        return NextResponse.json(await testYtdlp(body.url.trim()));
      }
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
  return NextResponse.json({ error: "Invalid body" }, { status: 400 });
}
