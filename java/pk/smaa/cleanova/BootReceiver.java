package pk.smaa.cleanova;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Restarts the battery monitor after the phone restarts, if the user had it on. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        try {
            if (!c.getSharedPreferences(MonitorService.PREFS, Context.MODE_PRIVATE).getBoolean("on", false)) return;
            Intent s = new Intent(c, MonitorService.class);
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
        } catch (Throwable t) { /* system may refuse; the app restarts it when opened */ }
    }
}
