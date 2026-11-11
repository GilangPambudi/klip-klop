import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/auth";
import { isProxyUrl } from "@/lib/proxies";
import { testProxy } from "@/lib/proxy-test";

export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!isProxyUrl(url)) {
    return NextResponse.json({ error: "Proxy must look like http://host:port" }, { status: 400 });
  }

  return NextResponse.json(await testProxy(url));
}
