import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// The link preview shown by Discord, WhatsApp and friends. Flat colours only:
// WhatsApp drops preview images that are too heavy, and flat PNGs stay tiny.
export const alt = "Klip-Klop: clip the part that you klop.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered per request, because the theme follows the clock (see isNight).
export const dynamic = "force-dynamic";

const LIGHT = { bg: "#faf9f9", fg: "#1a1c1c", muted: "#6b6766", chip: "#ffffff" };
const DARK = { bg: "#171717", fg: "#e8e6e3", muted: "#9b9893", chip: "#1f1f1f" };

/** Light card by day, dark card from 18:00 to 06:00 Jakarta time. */
function isNight() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  );
  return hour >= 18 || hour < 6;
}

const font = (file: string) =>
  readFile(path.join(process.cwd(), "assets", "fonts", file));

export default async function OpengraphImage() {
  const c = isNight() ? DARK : LIGHT;
  const [regular, bold] = await Promise.all([
    font("IBMPlexMono-Regular.ttf"),
    font("IBMPlexMono-Bold.ttf"),
  ]);

  // next/og (satori) needs display:flex on every element with more than one child, and has no <br>.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: c.bg,
          color: c.fg,
          fontFamily: "IBM Plex Mono",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* Trim Brackets logo, same paths as src/app/icon.svg. */}
          <svg viewBox="0 0 110 110" width="88" height="88">
            <rect x="7" y="7" width="96" height="96" rx="12" fill={c.fg} />
            <path d="M37 34 H28 V76 H37 M73 34 H82 V76 H73" fill="none" stroke={c.bg} strokeWidth="8" />
            <path d="M48 42 L66 55 L48 68 Z" fill={c.bg} stroke={c.bg} strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Klip-Klop</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -3,
            }}
          >
            <div>Clip the part</div>
            <div>that you klop.</div>
          </div>
          {/* 26px keeps the sentence on one line at this width. */}
          <div style={{ fontSize: 26, lineHeight: 1.35, color: c.muted }}>
            Paste a YouTube link, set a start and an end, download the clip.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              padding: "10px 20px",
              border: `2px solid ${c.fg}`,
              borderRadius: 5,
              background: c.chip,
            }}
          >
            klip.pambudi.dev
          </div>
          <div style={{ fontSize: 24, color: c.muted }}>MP4 · MP3 · M4A · OGG · OPUS</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "IBM Plex Mono", data: regular, weight: 400, style: "normal" },
        { name: "IBM Plex Mono", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
