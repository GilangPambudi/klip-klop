import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { currentAdmin } from "@/auth";
import { db } from "@/lib/db/index";
import { proxies } from "@/lib/db/schema";
import { readProxyInput } from "@/lib/proxy-input";
import { listProxies } from "@/lib/proxies";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET() {
  if (!(await currentAdmin())) return notFound();
  return NextResponse.json(await listProxies());
}

export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return notFound();

  const input = readProxyInput(await req.json().catch(() => null), true);
  if ("error" in input) return NextResponse.json(input, { status: 400 });

  const [{ next }] = await db()
    .select({ next: sql<number>`coalesce(max(${proxies.position}), -1) + 1` })
    .from(proxies);
  await db().insert(proxies).values({ ...input.values, position: Number(next) } as typeof proxies.$inferInsert);
  return NextResponse.json(await listProxies());
}

export async function PUT(req: NextRequest) {
  if (!(await currentAdmin())) return notFound();

  const body = await req.json().catch(() => null);
  const ids = body?.order;
  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
    return NextResponse.json({ error: "order must be a list of ids" }, { status: 400 });
  }

  for (const [position, id] of ids.entries()) {
    await db().update(proxies).set({ position }).where(eq(proxies.id, id));
  }
  return NextResponse.json(await listProxies());
}
