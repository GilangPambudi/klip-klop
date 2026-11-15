import { NextRequest, NextResponse } from "next/server";
import { deleteLink, listLinks, sweepExpired } from "@/lib/links";
import { gate } from "@/lib/gate";

// Each visitor only ever sees their own downloads; signed out, that is none.
export async function GET(req: NextRequest) {
  const { account, denied } = await gate(req);
  if (denied) return NextResponse.json({ links: [] });
  await sweepExpired();
  return NextResponse.json({ links: account ? await listLinks(account.id) : [] });
}

// Lives here, not on /api/d/[token]: share links are public, deleting must not be.
export async function DELETE(req: NextRequest) {
  const { account, denied } = await gate(req);
  if (denied) return denied;
  if (!account) {
    return NextResponse.json({ error: "Log in first" }, { status: 401 });
  }

  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  // Someone else's token answers the same as an unknown one.
  if (!(await deleteLink(token, account.id))) {
    return NextResponse.json({ error: "Download not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
