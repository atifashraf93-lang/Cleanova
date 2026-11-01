package pk.smaa.cleanova;

import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Gives the Family screen its sign-in token and schedules the background alert check. */
@CapacitorPlugin(name = "FamilyAlert")
public class FamilyAlertPlugin extends Plugin {
    @PluginMethod
    public void token(final PluginCall call) {
        new Thread(new Runnable() { @Override public void run() {
            try {
                Fs fs = new Fs(getContext());
                String t = fs.token();
                JSObject r = new JSObject(); r.put("token", t); r.put("uid", fs.uid());
                call.resolve(r);
            } catch (Throwable t) { call.reject("auth failed: " + t.getMessage()); }
        } }).start();
    }

    @PluginMethod
    public void setup(PluginCall call) {
        try {
            String code = call.getString("code", "");
            boolean on = call.getBoolean("on", true) && code.length() > 0;
            Context c = getContext();
            android.content.SharedPreferences.Editor e = c.getSharedPreferences(FamilyJob.PREFS, Context.MODE_PRIVATE).edit();
            if (on) {
                if (!c.getSharedPreferences(FamilyJob.PREFS, Context.MODE_PRIVATE).getString("code", "").equals(code)) e.putLong("seen", System.currentTimeMillis());
                e.putString("code", code);
            } else e.remove("code");
            e.apply();
            JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (on) {
                JobInfo.Builder b = new JobInfo.Builder(7788, new ComponentName(c, FamilyJob.class)).setPeriodic(15 * 60 * 1000L).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true);
                js.schedule(b.build());
            } else js.cancel(7788);
            call.resolve();
        } catch (Throwable t) { call.reject("setup failed: " + t); }
    }

    @PluginMethod
    public void checkNow(final PluginCall call) {
        new Thread(new Runnable() { @Override public void run() { try { FamilyJob.check(getContext()); } catch (Throwable t) { /* ignore */ } call.resolve(); } }).start();
    }
}
