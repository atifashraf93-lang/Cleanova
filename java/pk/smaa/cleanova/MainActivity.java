package pk.smaa.cleanova;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private void stash(Intent i) {
        try {
            String r = i == null ? null : i.getStringExtra("cl_room");
            if (r != null && r.length() > 0) getSharedPreferences(ChatCheck.PREFS, MODE_PRIVATE).edit().putString("open", r).apply();
        } catch (Throwable t) { /* ignore */ }
    }

    /** If a downloaded web bundle fails to start twice in a row, go back to the bundled files. */
    private void guardOta() {
        try {
            SharedPreferences o = getSharedPreferences(SensePlugin.OTA_PREFS, MODE_PRIVATE);
            SharedPreferences w = getSharedPreferences("CapWebViewSettings", MODE_PRIVATE);
            if (w.getString("serverBasePath", null) == null) return;
            int boots = o.getInt("boots", 0);
            if (!o.getBoolean("ok", true) && boots >= 2) {
                w.edit().remove("serverBasePath").apply();
                o.edit().putBoolean("ok", true).putInt("boots", 0).apply();
            } else if (!o.getBoolean("ok", true)) {
                o.edit().putInt("boots", boots + 1).apply();
            }
        } catch (Throwable t) { /* ignore */ }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CleanovaPlugin.class);
        registerPlugin(MonitorPlugin.class);
        registerPlugin(TravelPlugin.class);
        registerPlugin(SafetyPlugin.class);
        registerPlugin(WebPlugin.class);
        registerPlugin(BackupPlugin.class);
        registerPlugin(FilesPlugin.class);
        registerPlugin(FamilyAlertPlugin.class);
        registerPlugin(StudioPlugin.class);
        registerPlugin(SensePlugin.class);
        guardOta();
        super.onCreate(savedInstanceState);
        stash(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        stash(intent);
    }
}
