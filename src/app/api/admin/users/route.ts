import { NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { listUsers } from "@/lib/db/accounts";

export async function GET() {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(await listUsers());
}
