import { NextRequest, NextResponse } from "next/server";
import { deleteLink, listLinks, sweepExpired } from "@/lib/links";
import { currentUserId } from "@/auth";

// Each visitor only ever sees their own downloads; signed out, that is none.
export async function GET() {
  sweepExpired();
  const owner = await currentUserId();
  return NextResponse.json({ links: owner ? listLinks(owner) : [] });
}

// Lives here, not on /api/d/[token]: share links are public, deleting must not be.
export async function DELETE(req: NextRequest) {
  const owner = await currentUserId();
  if (!owner) {
    return NextResponse.json({ error: "Log in first" }, { status: 401 });
  }

  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  // Someone else's token answers the same as an unknown one.
  if (!deleteLink(token, owner)) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
