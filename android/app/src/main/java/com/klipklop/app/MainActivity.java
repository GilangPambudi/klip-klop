package com.klipklop.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the native plugin BEFORE the bridge is created (super
        // onCreate builds the bridge and snapshots the plugin list). Registering
        // after means Plugins.KlipKlop is never injected into the WebView, and
        // client.ts falls back to fetch("/api/*") which returns HTML -> JSON error.
        registerPlugin(KlipKlopPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
