import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.klipklop.app",
  appName: "Klip-Klop",
  webDir: "mobile/out",
  server: {
    // The googlevideo preview stream can be http (cleartext). Allow mixed
    // content so the <video> element can play it over the https WebView.
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
