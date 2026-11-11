import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { currentAdmin } from "@/auth";
import { db } from "@/lib/db/index";
import { proxies } from "@/lib/db/schema";
import { readProxyInput } from "@/lib/proxy-input";
import { listProxies } from "@/lib/proxies";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await currentAdmin())) return notFound();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return notFound();

  const input = readProxyInput(await req.json().catch(() => null), false);
  if ("error" in input) return NextResponse.json(input, { status: 400 });

  if (Object.keys(input.values).length > 0) {
    await db().update(proxies).set(input.values).where(eq(proxies.id, id));
  }
  return NextResponse.json(await listProxies());
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await currentAdmin())) return notFound();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return notFound();

  await db().delete(proxies).where(eq(proxies.id, id));
  return NextResponse.json(await listProxies());
}
