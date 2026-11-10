import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider"
import { getConfig, THEME_IDS } from "@/lib/db/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Klip-Klop - YouTube Trimmer",
  description: "Local YouTube Downloader and Trimmer",
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
          defaultTheme={defaultTheme}
          themes={THEME_IDS}
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
