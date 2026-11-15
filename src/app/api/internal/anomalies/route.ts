import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/db/config";
import { findAnomalies, pruneEvents } from "@/lib/db/events";
import { activeJobs, freeDiskGb } from "@/lib/guard";
import { internalAuthorized, internalNotFound } from "@/lib/internal-auth";

function param(req: NextRequest, name: string, fallback: number) {
  const value = Number(req.nextUrl.searchParams.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export async function GET(req: NextRequest) {
  if (!internalAuthorized(req)) return internalNotFound();

  const thresholds = {
    windowMinutes: param(req, "minutes", 10),
    signupsPerIp: param(req, "signups", 3),
    loadsPerIp: param(req, "loads", 40),
    failedDownloads: param(req, "failed", 5),
  };

  const config = await getConfig();
  const disk = Math.round(freeDiskGb() * 10) / 10;

  try {
    await pruneEvents();
    const found = await findAnomalies(thresholds);

    const alerts: string[] = [];
    for (const { ip, count } of found.signups) {
      alerts.push(`${count} new accounts from IP ${ip} in the last 24 hours`);
    }
    for (const { ip, count } of found.loads) {
      alerts.push(`${count} video loads from IP ${ip} in ${thresholds.windowMinutes} minutes`);
    }
    for (const { ip, count } of found.rateLimited) {
      alerts.push(`IP ${ip} hit the rate limit ${count} times in ${thresholds.windowMinutes} minutes`);
    }
    if (found.failed >= thresholds.failedDownloads) {
      alerts.push(`${found.failed} downloads failed in ${thresholds.windowMinutes} minutes`);
    }
    if (disk < config.minFreeDiskGb) {
      alerts.push(`Free disk is ${disk} GB, below the ${config.minFreeDiskGb} GB limit`);
    }

    return NextResponse.json({
      ok: alerts.length === 0,
      alerts,
      maintenance: config.maintenance,
      freeDiskGb: disk,
      activeJobs: activeJobs(),
      thresholds,
      ...found,
    });
  } catch (error) {
    console.error("Anomaly check failed:", error);
    return NextResponse.json(
      { ok: false, alerts: ["The anomaly check itself failed; is the events table migrated?"], freeDiskGb: disk },
      { status: 500 },
    );
  }
}
