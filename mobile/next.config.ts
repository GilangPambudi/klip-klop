import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: emits `out/` with HTML/CSS/JS only. There are NO API
  // routes in this app, so the export succeeds (the web app keeps its own
  // server build with `output` unset).
  output: "export",
  distDir: "out",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
