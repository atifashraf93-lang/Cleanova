package pk.smaa.cleanova;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CleanovaPlugin.class);
        registerPlugin(MonitorPlugin.class);
        registerPlugin(TravelPlugin.class);
        registerPlugin(SafetyPlugin.class);
        registerPlugin(WebPlugin.class);
        registerPlugin(BackupPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
