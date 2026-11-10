import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider"
import { getConfig, THEME_IDS, themeProps } from "@/lib/db/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

// Every page depends on the session and on the config table, so nothing may be
// frozen at build time (a build without AUTH_SECRET would bake in a page with no login).
export const dynamic = "force-dynamic";

const title = "Klip-Klop · Clip the part that you klop";
const description =
  "Paste a YouTube link, set a start and an end, download the clip as MP4 or audio.";

export const metadata: Metadata = {
  // Link previews need absolute URLs; AUTH_URL is the app's public address.
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:4200"),
  title,
  description,
  // The image itself comes from opengraph-image.tsx.
  openGraph: { type: "website", siteName: "Klip-Klop", title, description, url: "/" },
  twitter: { card: "summary_large_image", title, description },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only the theme for first-time visitors; whoever picked one keeps their own.
  const { defaultTheme } = await getConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable}`}>
        <ThemeProvider
          attribute="class"
          themes={THEME_IDS}
          enableSystem
          {...themeProps(defaultTheme)}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
