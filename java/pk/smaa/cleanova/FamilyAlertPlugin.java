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

    /** rooms: [{c:code,n:name,p:hidePreview}], fast: keep a light foreground check running, mode flags in prefs */
    @PluginMethod
    public void chatSetup(PluginCall call) {
        try {
            Context c = getContext();
            String rooms = call.getString("rooms", "[]");
            boolean fast = call.getBoolean("fast", false);
            android.content.SharedPreferences.Editor e = c.getSharedPreferences(ChatCheck.PREFS, Context.MODE_PRIVATE).edit();
            e.putString("rooms", rooms).putBoolean("fast", fast).putString("quiet", call.getString("quiet", "")).putString("muted", call.getString("muted", "[]")).apply();
            boolean any = new org.json.JSONArray(rooms).length() > 0;
            JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (any) js.schedule(new JobInfo.Builder(7789, new ComponentName(c, ChatJob.class)).setPeriodic(15 * 60 * 1000L).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true).build());
            else js.cancel(7789);
            android.content.Intent s = new android.content.Intent(c, ChatService.class);
            if (any && fast) { if (android.os.Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s); }
            else c.stopService(s);
            call.resolve();
        } catch (Throwable t) { call.reject("chat setup failed: " + t); }
    }

    /** Which chat room a tapped notification wants opened (and clears it). */
    @PluginMethod
    public void takeOpenRoom(PluginCall call) {
        android.content.SharedPreferences sp = getContext().getSharedPreferences(ChatCheck.PREFS, Context.MODE_PRIVATE);
        String r = sp.getString("open", ""); if (r.length() > 0) sp.edit().remove("open").apply();
        JSObject o = new JSObject(); o.put("room", r); call.resolve(o);
    }

    /** What the phone allows right now, so the in-app checklist can show ticks and crosses. */
    @PluginMethod
    public void diag(PluginCall call) {
        Context c = getContext();
        JSObject o = new JSObject();
        try {
            o.put("notif", android.os.Build.VERSION.SDK_INT >= 24 ? ((android.app.NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).areNotificationsEnabled() : true);
            android.os.PowerManager pm = (android.os.PowerManager) c.getSystemService(Context.POWER_SERVICE);
            o.put("battery", android.os.Build.VERSION.SDK_INT >= 23 ? pm.isIgnoringBatteryOptimizations(c.getPackageName()) : true);
            o.put("brand", android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL);
            o.put("sdk", android.os.Build.VERSION.SDK_INT);
            android.content.SharedPreferences sp = c.getSharedPreferences(ChatCheck.PREFS, Context.MODE_PRIVATE);
            o.put("lastRun", sp.getLong("lastRun", 0)); o.put("err", sp.getString("err", ""));
            o.put("fast", sp.getBoolean("fast", false));
            o.put("uid", new Fs(c).uid());
        } catch (Throwable t) { o.put("err", String.valueOf(t)); }
        call.resolve(o);
    }

    /** Asks Android to stop limiting this app's background work (the system shows its own prompt). */
    @PluginMethod
    public void batteryAsk(PluginCall call) {
        Context c = getContext();
        try {
            android.content.Intent i = new android.content.Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, android.net.Uri.parse("package:" + c.getPackageName()));
            i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i);
        } catch (Throwable t) {
            try { android.content.Intent i = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:" + c.getPackageName())); i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); } catch (Throwable t2) { /* ignore */ }
        }
        call.resolve();
    }

    /** Opens the phone maker's own "auto-start" page when it has one, otherwise the app's settings page. */
    @PluginMethod
    public void autoStart(PluginCall call) {
        Context c = getContext();
        String[][] tries = {
            { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
            { "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity" },
            { "com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity" },
            { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
            { "com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" },
            { "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
            { "com.transsion.phonemaster", "com.cyin.himgr.autostart.AutoStartActivity" },
            { "com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity" }
        };
        boolean ok = false;
        for (String[] t : tries) {
            try { android.content.Intent i = new android.content.Intent(); i.setClassName(t[0], t[1]); i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); ok = true; break; } catch (Throwable e) { /* try the next maker */ }
        }
        if (!ok) {
            try { android.content.Intent i = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:" + c.getPackageName())); i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); } catch (Throwable t2) { /* ignore */ }
        }
        JSObject o = new JSObject(); o.put("maker", ok); call.resolve(o);
    }

    /** Chat identity (anonymous account) so a restored backup keeps the same rooms. */
    @PluginMethod
    public void idGet(PluginCall call) {
        Fs fs = new Fs(getContext()); JSObject o = new JSObject(); o.put("uid", fs.uid()); o.put("rt", fs.refreshToken()); call.resolve(o);
    }

    @PluginMethod
    public void idSet(PluginCall call) {
        try {
            android.content.SharedPreferences sp = getContext().getSharedPreferences("cl.fsauth", Context.MODE_PRIVATE);
            if (sp.getString("rt", "").length() == 0 && call.getString("rt", "").length() > 10 && call.getString("uid", "").length() > 5)
                sp.edit().putString("rt", call.getString("rt")).putString("uid", call.getString("uid")).putString("idt", "").putLong("exp", 0).apply();
            call.resolve();
        } catch (Throwable t) { call.reject("id failed"); }
    }

    /** The app tells us it is on screen, so the background check does not show a notification for what the user can already see. */
    @PluginMethod
    public void chatFg(PluginCall call) {
        getContext().getSharedPreferences(ChatCheck.PREFS, Context.MODE_PRIVATE).edit().putLong("fgTs", call.getBoolean("on", false) ? System.currentTimeMillis() : 0).apply();
        call.resolve();
    }

    /** Messages up to this time were read inside the app. */
    @PluginMethod
    public void chatRead(PluginCall call) {
        String code = call.getString("code", ""); long ts = call.getLong("ts", 0L);
        android.content.SharedPreferences sp = getContext().getSharedPreferences(ChatCheck.PREFS, Context.MODE_PRIVATE);
        if (code.length() > 0 && ts > sp.getLong("seen_" + code, 0)) sp.edit().putLong("seen_" + code, ts).apply();
        call.resolve();
    }
}
