package pk.smaa.cleanova;

import android.app.ActivityManager;
import android.app.AppOpsManager;
import android.app.usage.NetworkStats;
import android.app.usage.NetworkStatsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.os.Process;
import android.os.StatFs;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;

/** Phone monitor: battery, memory, storage, device info, app screen time and data usage. Read-only, nothing leaves the phone. */
@CapacitorPlugin(name = "Monitor")
public class MonitorPlugin extends Plugin {

    private static final long DAY = 24L * 60 * 60 * 1000;

    private Context ctx() { return getContext(); }

    @PluginMethod
    public void snapshot(PluginCall call) {
        JSObject r = new JSObject();
        try {
            Intent b = ctx().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            JSObject bat = new JSObject();
            if (b != null) {
                int level = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), scale = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
                bat.put("level", scale > 0 ? Math.round(level * 100f / scale) : level);
                int st = b.getIntExtra(BatteryManager.EXTRA_STATUS, 0);
                bat.put("charging", st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL);
                bat.put("full", st == BatteryManager.BATTERY_STATUS_FULL);
                int pl = b.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
                bat.put("plug", pl == BatteryManager.BATTERY_PLUGGED_AC ? "ac" : pl == BatteryManager.BATTERY_PLUGGED_USB ? "usb" : pl == BatteryManager.BATTERY_PLUGGED_WIRELESS ? "wireless" : "none");
                bat.put("health", b.getIntExtra(BatteryManager.EXTRA_HEALTH, 0));
                bat.put("temp", b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10.0);
                bat.put("voltage", b.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0));
                String tech = b.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY);
                bat.put("tech", tech == null ? "" : tech);
            }
            try {
                BatteryManager bm = (BatteryManager) ctx().getSystemService(Context.BATTERY_SERVICE);
                if (bm != null) {
                    long cur = bm.getLongProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW);
                    long cc = bm.getLongProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER);
                    if (cur != Long.MIN_VALUE && cur != 0) bat.put("currentUa", cur);
                    if (cc != Long.MIN_VALUE && cc > 0) bat.put("chargeUah", cc);
                    if (Build.VERSION.SDK_INT >= 28) {
                        long t = bm.computeChargeTimeRemaining();
                        if (t > 0) bat.put("chargeMs", t);
                    }
                }
            } catch (Throwable t) { /* optional values */ }
            try {
                PowerManager pm = (PowerManager) ctx().getSystemService(Context.POWER_SERVICE);
                if (pm != null) bat.put("saver", pm.isPowerSaveMode());
            } catch (Throwable t) { /* optional */ }
            r.put("battery", bat);

            ActivityManager am = (ActivityManager) ctx().getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            if (am != null) am.getMemoryInfo(mi);
            JSObject ram = new JSObject();
            ram.put("total", mi.totalMem);
            ram.put("avail", mi.availMem);
            ram.put("low", mi.lowMemory);
            r.put("ram", ram);

            JSObject sto = new JSObject();
            try {
                StatFs s = new StatFs(Environment.getDataDirectory().getAbsolutePath());
                sto.put("total", s.getTotalBytes());
                sto.put("free", s.getAvailableBytes());
            } catch (Throwable t) { /* ignore */ }
            r.put("storage", sto);

            JSObject dev = new JSObject();
            dev.put("brand", Build.BRAND == null ? "" : Build.BRAND);
            dev.put("model", Build.MODEL == null ? "" : Build.MODEL);
            dev.put("android", Build.VERSION.RELEASE == null ? "" : Build.VERSION.RELEASE);
            dev.put("sdk", Build.VERSION.SDK_INT);
            dev.put("cores", Runtime.getRuntime().availableProcessors());
            dev.put("uptime", SystemClock.elapsedRealtime());
            dev.put("abi", Build.SUPPORTED_ABIS != null && Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "");
            r.put("device", dev);

            String net = "none";
            try {
                ConnectivityManager cm = (ConnectivityManager) ctx().getSystemService(Context.CONNECTIVITY_SERVICE);
                NetworkInfo ni = cm == null ? null : cm.getActiveNetworkInfo();
                if (ni != null && ni.isConnected()) net = ni.getType() == ConnectivityManager.TYPE_WIFI ? "wifi" : ni.getType() == ConnectivityManager.TYPE_MOBILE ? "mobile" : "other";
            } catch (Throwable t) { /* needs ACCESS_NETWORK_STATE */ }
            r.put("net", net);
        } catch (Throwable t) {
            call.reject("snapshot failed: " + t);
            return;
        }
        call.resolve(r);
    }

    private boolean hasUsage() {
        try {
            AppOpsManager ops = (AppOpsManager) ctx().getSystemService(Context.APP_OPS_SERVICE);
            int mode = ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx().getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Throwable t) { return false; }
    }

    @PluginMethod
    public void usageStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", hasUsage());
        call.resolve(r);
    }

    @PluginMethod
    public void usageRequest(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            i.setData(Uri.parse("package:" + ctx().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { ctx().startActivity(i); } catch (Throwable t) {
                Intent j = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                j.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx().startActivity(j);
            }
            call.resolve();
        } catch (Throwable t) { call.reject("cannot open settings: " + t); }
    }

    private long midnight(long now, int daysBack) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        c.add(Calendar.DAY_OF_YEAR, -daysBack);
        return c.getTimeInMillis();
    }

    private String label(PackageManager pm, String pkg) {
        try {
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            CharSequence l = pm.getApplicationLabel(ai);
            return l == null ? pkg : l.toString();
        } catch (Throwable t) { return pkg; }
    }

    private String icon(PackageManager pm, String pkg) {
        try {
            Drawable d = pm.getApplicationIcon(pkg);
            int sz = 56;
            Bitmap bmp = Bitmap.createBitmap(sz, sz, Bitmap.Config.ARGB_8888);
            Canvas cv = new Canvas(bmp);
            d.setBounds(0, 0, sz, sz);
            d.draw(cv);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.PNG, 90, bo);
            bmp.recycle();
            return "data:image/png;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
        } catch (Throwable t) { return ""; }
    }

    private static class Row { String pkg; long today; long week; String label; }

    /** Screen time: foreground time per app for the last 7 days (today included), split per day. */
    @PluginMethod
    public void usage(final PluginCall call) {
        if (!hasUsage()) { call.reject("no usage access"); return; }
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    long now = System.currentTimeMillis();
                    long[] ds = new long[8];
                    for (int i = 0; i < 7; i++) ds[i] = midnight(now, 6 - i);
                    ds[7] = now + DAY;
                    long[] perDay = new long[7];
                    Map<String, long[]> apps = new HashMap<String, long[]>();
                    UsageStatsManager usm = (UsageStatsManager) ctx().getSystemService(Context.USAGE_STATS_SERVICE);
                    UsageEvents ev = usm.queryEvents(ds[0] - DAY, now);
                    UsageEvents.Event e = new UsageEvents.Event();
                    Map<String, Long> open = new HashMap<String, Long>();
                    int unlocks = 0;
                    while (ev.hasNextEvent()) {
                        ev.getNextEvent(e);
                        String p = e.getPackageName();
                        int t = e.getEventType();
                        long ts = e.getTimeStamp();
                        if (t == 1) { open.put(p, ts); }
                        else if (t == 2) {
                            Long s = open.remove(p);
                            if (s != null) addSeg(apps, perDay, ds, p, s, ts);
                        } else if (t == 18 && ts >= ds[6]) unlocks++;
                    }
                    for (Map.Entry<String, Long> en : open.entrySet()) addSeg(apps, perDay, ds, en.getKey(), en.getValue(), now);
                    PackageManager pm = ctx().getPackageManager();
                    String self = ctx().getPackageName();
                    ArrayList<Row> rows = new ArrayList<Row>();
                    for (Map.Entry<String, long[]> en : apps.entrySet()) {
                        long[] v = en.getValue();
                        long wk = 0;
                        for (long x : v) wk += x;
                        if (wk < 60000) continue;
                        Row w = new Row(); w.pkg = en.getKey(); w.today = v[6]; w.week = wk;
                        rows.add(w);
                    }
                    Collections.sort(rows, new Comparator<Row>() { public int compare(Row a, Row b) { return a.week < b.week ? 1 : a.week > b.week ? -1 : 0; } });
                    JSArray out = new JSArray();
                    int n = 0;
                    for (Row w : rows) {
                        if (n++ >= 15) break;
                        JSObject o = new JSObject();
                        o.put("pkg", w.pkg);
                        o.put("label", label(pm, w.pkg));
                        o.put("today", w.today);
                        o.put("week", w.week);
                        o.put("icon", n <= 10 ? icon(pm, w.pkg) : "");
                        out.put(o);
                    }
                    JSArray days = new JSArray();
                    long total = 0;
                    for (int i = 0; i < 7; i++) { days.put(perDay[i]); total += perDay[i]; }
                    JSObject r = new JSObject();
                    r.put("days", days);
                    r.put("apps", out);
                    r.put("unlocks", unlocks);
                    r.put("dayStart", ds[0]);
                    call.resolve(r);
                } catch (Throwable t) { call.reject("usage failed: " + t); }
            }
        }).start();
    }

    private void addSeg(Map<String, long[]> apps, long[] perDay, long[] ds, String pkg, long s, long e) {
        if (e <= s || e - s > 12 * 60 * 60 * 1000L) { if (e <= s) return; e = s + 12 * 60 * 60 * 1000L; }
        long[] v = apps.get(pkg);
        if (v == null) { v = new long[7]; apps.put(pkg, v); }
        for (int i = 0; i < 7; i++) {
            long a = Math.max(s, ds[i]), b = Math.min(e, ds[i + 1]);
            if (b > a) { v[i] += b - a; perDay[i] += b - a; }
        }
    }

    /** Data usage: Wi-Fi and mobile totals per day (7 days) plus the heaviest apps. */
    @PluginMethod
    public void dataUsage(final PluginCall call) {
        if (!hasUsage()) { call.reject("no usage access"); return; }
        if (Build.VERSION.SDK_INT < 23) { call.reject("needs Android 6+"); return; }
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    NetworkStatsManager nsm = (NetworkStatsManager) ctx().getSystemService(Context.NETWORK_STATS_SERVICE);
                    long now = System.currentTimeMillis();
                    long[] wifi = new long[7], mob = new long[7];
                    for (int i = 0; i < 7; i++) {
                        long s = midnight(now, 6 - i), e = i == 6 ? now : midnight(now, 5 - i);
                        wifi[i] = total(nsm, ConnectivityManager.TYPE_WIFI, s, e);
                        mob[i] = total(nsm, ConnectivityManager.TYPE_MOBILE, s, e);
                    }
                    long ws = midnight(now, 6), td = midnight(now, 0);
                    Map<Integer, long[]> byUid = new HashMap<Integer, long[]>();
                    for (int k = 0; k < 2; k++) {
                        int type = k == 0 ? ConnectivityManager.TYPE_WIFI : ConnectivityManager.TYPE_MOBILE;
                        for (int pass = 0; pass < 2; pass++) {
                            long from = pass == 0 ? ws : td;
                            try {
                                NetworkStats st = nsm.querySummary(type, null, from, now);
                                NetworkStats.Bucket bk = new NetworkStats.Bucket();
                                while (st.hasNextBucket()) {
                                    st.getNextBucket(bk);
                                    long[] v = byUid.get(bk.getUid());
                                    if (v == null) { v = new long[4]; byUid.put(bk.getUid(), v); }
                                    long bytes = bk.getRxBytes() + bk.getTxBytes();
                                    v[pass * 2 + k] += bytes;
                                }
                                st.close();
                            } catch (Throwable t) { /* mobile may be unavailable */ }
                        }
                    }
                    PackageManager pm = ctx().getPackageManager();
                    ArrayList<Object[]> rows = new ArrayList<Object[]>();
                    for (Map.Entry<Integer, long[]> en : byUid.entrySet()) {
                        long[] v = en.getValue();
                        long week = v[0] + v[1];
                        if (week < 100 * 1024) continue;
                        String[] pk = pm.getPackagesForUid(en.getKey());
                        String pkg = pk != null && pk.length > 0 ? pk[0] : "uid" + en.getKey();
                        rows.add(new Object[] { pkg, v[0] + v[1], v[2] + v[3], v[1] });
                    }
                    Collections.sort(rows, new Comparator<Object[]>() { public int compare(Object[] a, Object[] b) { long x = (Long) a[1], y = (Long) b[1]; return x < y ? 1 : x > y ? -1 : 0; } });
                    JSArray apps = new JSArray();
                    int n = 0;
                    for (Object[] w : rows) {
                        if (n++ >= 10) break;
                        JSObject o = new JSObject();
                        o.put("pkg", (String) w[0]);
                        o.put("label", label(pm, (String) w[0]));
                        o.put("week", (Long) w[1]);
                        o.put("today", (Long) w[2]);
                        o.put("mobile", (Long) w[3]);
                        o.put("icon", n <= 10 ? icon(pm, (String) w[0]) : "");
                        apps.put(o);
                    }
                    JSArray jw = new JSArray(), jm = new JSArray();
                    for (int i = 0; i < 7; i++) { jw.put(wifi[i]); jm.put(mob[i]); }
                    JSObject r = new JSObject();
                    r.put("wifi", jw);
                    r.put("mobile", jm);
                    r.put("apps", apps);
                    call.resolve(r);
                } catch (Throwable t) { call.reject("data usage failed: " + t); }
            }
        }).start();
    }

    private long total(NetworkStatsManager nsm, int type, long s, long e) {
        try {
            NetworkStats.Bucket b = nsm.querySummaryForDevice(type, null, s, e);
            return b.getRxBytes() + b.getTxBytes();
        } catch (Throwable t) { return 0L; }
    }
}
