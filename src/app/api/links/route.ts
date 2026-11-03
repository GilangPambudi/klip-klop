import { NextRequest, NextResponse } from "next/server";
import { deleteLink, listLinks, sweepExpired } from "@/lib/links";

export async function GET() {
  sweepExpired();
  return NextResponse.json({ links: listLinks() });
}

// Lives here, not on /api/d/[token]: share links are public, deleting must not be.
export async function DELETE(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  if (!deleteLink(token)) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
