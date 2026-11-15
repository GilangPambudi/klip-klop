import { NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { usersForAdmin } from "@/lib/admin-users";

export async function GET() {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(await usersForAdmin());
}
