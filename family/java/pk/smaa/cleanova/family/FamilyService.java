package pk.smaa.cleanova.family;

import android.app.AppOpsManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.Process;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;

/**
 * Foreground service of Cleanova Family. With the family member's consent it sends, every few minutes:
 * battery, last location (if sharing location is on) and today's screen time per app (if sharing screen time is on).
 * A notification is always visible while it runs. Messages, photos and browsing are never read.
 */
public class FamilyService extends Service implements LocationListener {
    static final String PREFS = "cf.fam";
    static final String CH = "cf_run";
    private static final long TICK = 5 * 60 * 1000L;
    private LocationManager lm;
    private Handler hd;
    private Location last;
    private volatile boolean busy = false;
    private final Runnable loop = new Runnable() {
        @Override public void run() {
            tickAsync();
            if (hd != null) hd.postDelayed(this, TICK);
        }
    };

    private SharedPreferences sp() { return getSharedPreferences(PREFS, MODE_PRIVATE); }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent i, int f, int id) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Cleanova Family", NotificationManager.IMPORTANCE_LOW));
            Intent open = new Intent(this, MainActivity.class);
            PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
            b.setContentTitle("Cleanova Family").setContentText("Aap ke ghar walon ko aap ki location aur screen-time dikhai de rahi hai").setSmallIcon(android.R.drawable.ic_menu_mylocation).setOngoing(true).setContentIntent(pi);
            if (Build.VERSION.SDK_INT >= 29) startForeground(11, b.build(), 8); else startForeground(11, b.build());
        } catch (Throwable t) { diag("err", "fg: " + t); stopSelf(); return START_NOT_STICKY; }
        sp().edit().putBoolean("on", true).apply();
        if (hd == null) {
            hd = new Handler(Looper.getMainLooper());
            lm = (LocationManager) getSystemService(LOCATION_SERVICE);
            startLoc();
            hd.postDelayed(loop, 3000);
        }
        return START_STICKY;
    }

    private void diag(String k, String v) { try { sp().edit().putString(k, v).apply(); } catch (Throwable t) { /* ignore */ } }

    private void startLoc() {
        try {
            if (!sp().getBoolean("loc", true)) return;
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) { diag("err", "no location permission"); return; }
            if (lm.getAllProviders().contains(LocationManager.NETWORK_PROVIDER)) lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 60000L, 25f, this, Looper.getMainLooper());
            if (lm.getAllProviders().contains(LocationManager.GPS_PROVIDER)) lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 120000L, 50f, this, Looper.getMainLooper());
            Location g = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER), n = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            last = better(g, n);
        } catch (Throwable t) { diag("err", "loc: " + t); }
    }
    private Location better(Location a, Location b) { if (a == null) return b; if (b == null) return a; return a.getTime() >= b.getTime() ? a : b; }

    @Override public void onLocationChanged(Location l) { if (last == null || l.getTime() >= last.getTime() - 60000L) last = l; }
    @Override public void onStatusChanged(String p, int s, Bundle e) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }

    @Override public void onDestroy() {
        try { if (lm != null) lm.removeUpdates(this); } catch (Throwable t) { /* ignore */ }
        if (hd != null) hd.removeCallbacksAndMessages(null);
        hd = null;
        super.onDestroy();
    }

    private void tickAsync() {
        if (busy) return; busy = true;
        new Thread(new Runnable() { @Override public void run() { try { tick(); } catch (Throwable t) { diag("err", "tick: " + t); } finally { busy = false; } } }).start();
    }

    static boolean hasUsage(Context c) {
        try {
            AppOpsManager ops = (AppOpsManager) c.getSystemService(Context.APP_OPS_SERVICE);
            return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.getPackageName()) == AppOpsManager.MODE_ALLOWED;
        } catch (Throwable t) { return false; }
    }

    private int[] battery() {
        try {
            Intent b = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            int lv = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), sc = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100), st = b.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            boolean chg = st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL;
            return new int[] { lv < 0 ? -1 : Math.round(lv * 100f / sc), chg ? 1 : 0 };
        } catch (Throwable t) { return new int[] { -1, 0 }; }
    }

    private long midnight(long now, int back) {
        Calendar c = Calendar.getInstance(); c.setTimeInMillis(now);
        c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        c.add(Calendar.DAY_OF_YEAR, -back);
        return c.getTimeInMillis();
    }

    private void addSeg(Map<String, long[]> apps, long[] per, long[] ds, String pkg, long s, long e) {
        if (e <= s) return;
        if (e - s > 12 * 3600000L) e = s + 12 * 3600000L;
        long[] v = apps.get(pkg); if (v == null) { v = new long[7]; apps.put(pkg, v); }
        for (int i = 0; i < 7; i++) { long a = Math.max(s, ds[i]), b = Math.min(e, ds[i + 1]); if (b > a) { v[i] += b - a; per[i] += b - a; } }
    }

    private String label(PackageManager pm, String pkg) {
        try { ApplicationInfo ai = pm.getApplicationInfo(pkg, 0); CharSequence l = pm.getApplicationLabel(ai); return l == null ? pkg : l.toString(); } catch (Throwable t) { return pkg; }
    }

    /** Fields describing screen time: today total, unlocks, 7 day totals and top apps. */
    private void usageFields(JSONObject f) throws Exception {
        long now = System.currentTimeMillis();
        long[] ds = new long[8]; for (int i = 0; i < 7; i++) ds[i] = midnight(now, 6 - i); ds[7] = now + 86400000L;
        long[] per = new long[7];
        Map<String, long[]> apps = new HashMap<String, long[]>();
        android.app.usage.UsageStatsManager usm = (android.app.usage.UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        UsageEvents ev = usm.queryEvents(ds[0] - 86400000L, now);
        UsageEvents.Event e = new UsageEvents.Event();
        Map<String, Long> open = new HashMap<String, Long>();
        int unlocks = 0;
        while (ev.hasNextEvent()) {
            ev.getNextEvent(e);
            String p = e.getPackageName(); int t = e.getEventType(); long ts = e.getTimeStamp();
            if (t == 1) open.put(p, ts);
            else if (t == 2) { Long s = open.remove(p); if (s != null) addSeg(apps, per, ds, p, s, ts); }
            else if (t == 18 && ts >= ds[6]) unlocks++;
        }
        for (Map.Entry<String, Long> en : open.entrySet()) addSeg(apps, per, ds, en.getKey(), en.getValue(), now);
        PackageManager pm = getPackageManager();
        ArrayList<Object[]> rows = new ArrayList<Object[]>();
        for (Map.Entry<String, long[]> en : apps.entrySet()) {
            long wk = 0; for (long x : en.getValue()) wk += x;
            if (wk < 60000) continue;
            rows.add(new Object[] { en.getKey(), en.getValue()[6], wk });
        }
        Collections.sort(rows, new Comparator<Object[]>() { public int compare(Object[] a, Object[] b) { return Long.compare((Long) b[2], (Long) a[2]); } });
        JSONArray ja = new JSONArray(); int n = 0;
        for (Object[] r : rows) { if (n++ >= 12) break; JSONArray x = new JSONArray(); x.put(label(pm, (String) r[0])); x.put(r[1]); x.put(r[2]); x.put(r[0]); ja.put(x); }
        JSONArray days = new JSONArray(); for (int i = 0; i < 7; i++) days.put(per[i]);
        f.put("ut", Fs.i(per[6])).put("unl", Fs.i(unlocks)).put("apps", Fs.s(ja.toString())).put("days", Fs.s(days.toString())).put("dstart", Fs.i(ds[0]));
    }

    private static double dist(double a, double b, double c, double d) { float[] r = new float[1]; Location.distanceBetween(a, b, c, d, r); return r[0]; }

    private void event(Fs fs, String code, String name, String type, String zone) {
        try {
            JSONObject f = new JSONObject().put("uid", Fs.s(fs.uid())).put("name", Fs.s(name)).put("type", Fs.s(type)).put("zone", Fs.s(zone)).put("ts", Fs.i(System.currentTimeMillis()));
            if (last != null && sp().getBoolean("loc", true)) f.put("lat", Fs.d(last.getLatitude())).put("lng", Fs.d(last.getLongitude()));
            fs.create("circles/" + code + "/events", f);
        } catch (Throwable t) { diag("err", "event: " + t); }
    }

    private void tick() throws Exception {
        SharedPreferences p = sp();
        String code = p.getString("code", ""); if (code.length() == 0) return;
        Fs fs = new Fs(this); fs.token();
        String uid = fs.uid(), name = p.getString("name", ""), role = p.getString("role", "adult");
        boolean shareLoc = p.getBoolean("loc", true), shareUse = p.getBoolean("usage", false);
        int[] bat = battery();
        JSONObject f = new JSONObject().put("name", Fs.s(name)).put("role", Fs.s(role)).put("ts", Fs.i(System.currentTimeMillis())).put("bat", Fs.i(bat[0])).put("chg", Fs.b(bat[1] == 1)).put("loc", Fs.b(shareLoc)).put("use", Fs.b(shareUse)).put("off", Fs.b(false));
        Location l = last;
        if (shareLoc && l != null) f.put("lat", Fs.d(l.getLatitude())).put("lng", Fs.d(l.getLongitude())).put("acc", Fs.i(Math.round(l.getAccuracy()))).put("lts", Fs.i(l.getTime()));
        if (shareUse && hasUsage(this)) usageFields(f);
        JSONObject res = fs.patch("circles/" + code + "/members/" + uid, f);
        p.edit().putBoolean("ok", Fs.bool(res, "ok")).putLong("sent", System.currentTimeMillis()).remove("err").apply();
        if (shareLoc && l != null) {
            double pla = Double.longBitsToDouble(p.getLong("tla", 0)), plo = Double.longBitsToDouble(p.getLong("tlo", 0));
            if (p.getLong("tt", 0) == 0 || dist(pla, plo, l.getLatitude(), l.getLongitude()) > 40 || System.currentTimeMillis() - p.getLong("tt", 0) > 20 * 60000L) {
                fs.create("circles/" + code + "/members/" + uid + "/track", new JSONObject().put("lat", Fs.d(l.getLatitude())).put("lng", Fs.d(l.getLongitude())).put("ts", Fs.i(System.currentTimeMillis())).put("acc", Fs.i(Math.round(l.getAccuracy()))));
                p.edit().putLong("tla", Double.doubleToRawLongBits(l.getLatitude())).putLong("tlo", Double.doubleToRawLongBits(l.getLongitude())).putLong("tt", System.currentTimeMillis()).apply();
            }
            zones(fs, code, name, l);
        }
        if (bat[0] >= 0 && bat[0] <= 15 && bat[1] == 0 && System.currentTimeMillis() - p.getLong("lowt", 0) > 3 * 3600000L) { event(fs, code, name, "low", String.valueOf(bat[0])); p.edit().putLong("lowt", System.currentTimeMillis()).apply(); }
    }

    private void zones(Fs fs, String code, String name, Location l) throws Exception {
        JSONObject c = fs.get("circles/" + code);
        String z = Fs.str(c, "zones"); if (z.length() == 0) return;
        JSONArray arr = new JSONArray(z);
        SharedPreferences p = sp();
        boolean first = !p.contains("zin");
        String prev = "," + p.getString("zin", "") + ",";
        StringBuilder now = new StringBuilder();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.getJSONObject(i);
            String id = o.optString("id", String.valueOf(i)), zn = o.optString("n", "");
            boolean in = dist(o.getDouble("lat"), o.getDouble("lng"), l.getLatitude(), l.getLongitude()) <= Math.max(60, o.optDouble("r", 150)) + Math.min(l.getAccuracy(), 100);
            boolean was = prev.contains("," + id + ",");
            if (in) now.append(now.length() > 0 ? "," : "").append(id);
            if (!first && in && !was) event(fs, code, name, "enter", zn);
            if (!first && !in && was) event(fs, code, name, "leave", zn);
        }
        p.edit().putString("zin", now.toString()).apply();
    }

    /** Sent from the SOS button. Works even if the service is not running. */
    static void sos(final Context c) {
        new Thread(new Runnable() { @Override public void run() {
            try {
                SharedPreferences p = c.getSharedPreferences(PREFS, MODE_PRIVATE);
                String code = p.getString("code", ""); if (code.length() == 0) return;
                Fs fs = new Fs(c); fs.token();
                Location best = null;
                try {
                    LocationManager lm = (LocationManager) c.getSystemService(LOCATION_SERVICE);
                    Location g = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER), n = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    best = g == null ? n : (n == null ? g : (g.getTime() >= n.getTime() ? g : n));
                } catch (Throwable t) { /* no permission */ }
                JSONObject f = new JSONObject().put("uid", Fs.s(fs.uid())).put("name", Fs.s(p.getString("name", ""))).put("type", Fs.s("sos")).put("zone", Fs.s("")).put("ts", Fs.i(System.currentTimeMillis()));
                if (best != null) f.put("lat", Fs.d(best.getLatitude())).put("lng", Fs.d(best.getLongitude()));
                fs.create("circles/" + code + "/events", f);
                p.edit().putLong("sosAt", System.currentTimeMillis()).apply();
            } catch (Throwable t) { c.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString("err", "sos: " + t).apply(); }
        } }).start();
    }

    /** Called when sharing is switched off on purpose, so the family sees it was a choice. */
    static void notifyStop(final Context c) {
        new Thread(new Runnable() { @Override public void run() {
            try {
                SharedPreferences p = c.getSharedPreferences(PREFS, MODE_PRIVATE);
                String code = p.getString("code", ""); if (code.length() == 0) return;
                Fs fs = new Fs(c); fs.token();
                fs.create("circles/" + code + "/events", new JSONObject().put("uid", Fs.s(fs.uid())).put("name", Fs.s(p.getString("name", ""))).put("type", Fs.s("stop")).put("zone", Fs.s("")).put("ts", Fs.i(System.currentTimeMillis())));
                fs.patch("circles/" + code + "/members/" + fs.uid(), new JSONObject().put("ts", Fs.i(System.currentTimeMillis())).put("off", Fs.b(true)));
            } catch (Throwable t) { /* offline; the family will see no updates */ }
        } }).start();
    }
}
