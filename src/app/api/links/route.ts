import { NextResponse } from "next/server";
import { listLinks, sweepExpired } from "@/lib/links";

export async function GET() {
  sweepExpired();
  return NextResponse.json({ links: listLinks() });
}
