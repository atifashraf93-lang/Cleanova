package pk.smaa.cleanova;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private void stash(Intent i) {
        try {
            String r = i == null ? null : i.getStringExtra("cl_room");
            if (r != null && r.length() > 0) getSharedPreferences(ChatCheck.PREFS, MODE_PRIVATE).edit().putString("open", r).apply();
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
        super.onCreate(savedInstanceState);
        stash(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        stash(intent);
    }
}
