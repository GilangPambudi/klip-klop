import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { listUsers, updateUser, type UserChanges } from "@/lib/db/accounts";

const FLAGS = ["unlimited", "banned", "admin"] as const;
const MAX_CREDITS = 1_000_000;

type Params = { params: Promise<{ id: string }> };

function readChanges(body: unknown): UserChanges | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const input = body as Record<string, unknown>;
  const changes: UserChanges = {};

  if ("credits" in input) {
    const credits = input.credits;
    if (typeof credits !== "number" || !Number.isInteger(credits) || credits < 0 || credits > MAX_CREDITS) {
      return "Credits must be a whole number, 0 or more";
    }
    changes.credits = credits;
  }

  for (const flag of FLAGS) {
    if (!(flag in input)) continue;
    if (typeof input[flag] !== "boolean") return `${flag} must be true or false`;
    changes[flag] = input[flag];
  }

  return changes;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const id = decodeURIComponent((await params).id);
  const changes = readChanges(await req.json().catch(() => null));
  if (typeof changes === "string") {
    return NextResponse.json({ error: changes }, { status: 400 });
  }

  if (id === admin.id && (changes.admin === false || changes.banned === true)) {
    return NextResponse.json(
      { error: "You can't remove your own admin or ban yourself" },
      { status: 400 },
    );
  }

  await updateUser(id, changes);
  return NextResponse.json(await listUsers());
}
