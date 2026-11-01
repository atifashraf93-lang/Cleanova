package pk.smaa.cleanova.family;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Restarts sharing after a restart, only if the family member had it on. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        try {
            if (c.getSharedPreferences(FamilyService.PREFS, Context.MODE_PRIVATE).getBoolean("on", false)) {
                Intent s = new Intent(c, FamilyService.class);
                if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
            }
        } catch (Throwable t) { /* the system may refuse; opening the app restarts it */ }
    }
}
