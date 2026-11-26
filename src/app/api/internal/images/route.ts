import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";
import { cookieArgs } from "@/lib/cookies";
import { internalAuthorized, internalNotFound } from "@/lib/internal-auth";
import { parseLink } from "@/lib/platforms";
import { withProxies } from "@/lib/proxies";
import { runTool } from "@/lib/runtime";

const MAX_FILES = 20;
const MAX_FILE_SIZE = "50M";
const TIME_LIMIT_MS = 3 * 60 * 1000;

const run = promisify(execFile);

function describeGalleryError(error: unknown) {
  const text = error instanceof Error ? error.message : "";
  const line = text
    .split(/[\r\n]+/)
    .filter((l) => /\[error\]/i.test(l))
    .at(-1)
    ?.replace(/^\[[^\]]+\]\[error\]\s*/i, "");
  if (line && /login|cookies|401|checkpoint/i.test(line)) {
    return "This post needs a login on its platform, so it can't be loaded here.";
  }
  return line || "Image download failed";
}

function listFiles(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isFile());
}

export async function POST(req: NextRequest) {
  if (!internalAuthorized(req)) return internalNotFound();

  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const link = typeof body.url === "string" ? parseLink(body.url) : null;
  if (!link?.platform || !link.key) {
    return NextResponse.json({ error: "This link is not supported" }, { status: 400 });
  }
  const url = link.url;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klip-klop-images-"));
  const filesDir = path.join(dir, "files");
  const archive = path.join(dir, "images.tar");
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });

  try {
    const cookies = await cookieArgs(url);
    let failure: unknown = null;
    try {
      await withProxies(url, (proxyArgs) => runTool("gallery-dl", [
        ...cookies,
        ...proxyArgs,
        "--range",
        `1-${MAX_FILES}`,
        "--filesize-max",
        MAX_FILE_SIZE,
        "-D",
        filesDir,
        url,
      ], { timeoutMs: TIME_LIMIT_MS }));
    } catch (error) {
      failure = error;
    }

    const files = listFiles(filesDir);
    if (files.length === 0) {
      cleanup();
      if (failure) {
        console.error("Internal images failed:", failure);
        return NextResponse.json({ error: describeGalleryError(failure) }, { status: 502 });
      }
      return NextResponse.json({ error: "No images were found in this post" }, { status: 422 });
    }
    if (failure) console.error("Internal images partly failed:", failure);

    await run("tar", ["-cf", archive, "-C", filesDir, ...files]);
    const stream = fs.createReadStream(archive);
    stream.on("close", cleanup);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "application/x-tar",
        "Content-Length": String(fs.statSync(archive).size),
        "Content-Disposition": 'attachment; filename="images.tar"',
        "X-Platform": link.platform,
        "X-Count": String(files.length),
        "X-Partial": failure ? "1" : "0",
      },
    });
  } catch (error) {
    cleanup();
    console.error("Internal images failed:", error);
    return NextResponse.json({ error: describeGalleryError(error) }, { status: 502 });
  }
}
