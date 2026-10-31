package pk.smaa.cleanova;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.os.Build;
import android.os.Environment;
import android.os.BatteryManager;
import android.app.AppOpsManager;
import android.app.usage.NetworkStats;
import android.app.usage.NetworkStatsManager;
import android.database.Cursor;
import android.net.ConnectivityManager;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.text.SimpleDateFormat;
import java.util.Date;

/** Personal trip log. Everything stays on the phone. */
@CapacitorPlugin(
    name = "Travel",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location"),
        @Permission(strings = { "android.permission.ACCESS_BACKGROUND_LOCATION" }, alias = "bgloc"),
        @Permission(strings = { "android.permission.ACTIVITY_RECOGNITION" }, alias = "activity")
    }
)
public class TravelPlugin extends Plugin {

    private Context ctx() { return getContext(); }
    private SharedPreferences sp() { return ctx().getSharedPreferences(TrackService.PREFS, Context.MODE_PRIVATE); }

    @PluginMethod
    public void locStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("location") == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void locRequest(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) { locCb(call); return; }
        requestPermissionForAlias("location", call, "locCb");
    }

    @PermissionCallback
    private void locCb(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("location") == PermissionState.GRANTED);
        call.resolve(r);
    }

    /* ---- parsing ---- */
    private static class Pt { long t; double lat, lon; float acc, sp; int roam; }

    private List<Pt> read(File f, String[] meta) {
        ArrayList<Pt> pts = new ArrayList<Pt>();
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            String ln;
            while ((ln = r.readLine()) != null) {
                if (ln.startsWith("#name,")) { if (meta != null) meta[0] = ln.substring(6); continue; }
                if (ln.startsWith("#end,")) { if (meta != null) meta[1] = ln.substring(5); continue; }
                if (ln.startsWith("#bat0,")) { if (meta != null && meta.length > 2) meta[2] = ln.substring(6); continue; }
                if (ln.startsWith("#bat1,")) { if (meta != null && meta.length > 3) meta[3] = ln.substring(6); continue; }
                String[] p = ln.split(",");
                if (p.length < 5) continue;
                try {
                    Pt q = new Pt();
                    q.t = Long.parseLong(p[0]); q.lat = Double.parseDouble(p[1]); q.lon = Double.parseDouble(p[2]);
                    q.acc = Float.parseFloat(p[3]); q.sp = Float.parseFloat(p[4]); q.roam = p.length > 5 && p[5].trim().equals("1") ? 1 : 0;
                    pts.add(q);
                } catch (NumberFormatException x) { /* skip bad line */ }
            }
            r.close();
        } catch (Throwable t) { /* unreadable */ }
        return pts;
    }

    private double dist(List<Pt> pts) {
        double d = 0;
        float[] res = new float[1];
        for (int i = 1; i < pts.size(); i++) {
            Pt a = pts.get(i - 1), b = pts.get(i);
            Location.distanceBetween(a.lat, a.lon, b.lat, b.lon, res);
            long dt = Math.max(1, (b.t - a.t) / 1000);
            if (res[0] >= 12f && res[0] / dt < 90f) d += res[0];   /* ignore GPS jitter and impossible jumps */
        }
        return d;
    }

    private JSObject summary(File f) {
        String[] meta = new String[] { "", "", "", "" };
        List<Pt> pts = read(f, meta);
        long id = 0;
        try { id = Long.parseLong(f.getName().replace(".csv", "")); } catch (NumberFormatException x) { /* ignore */ }
        long start = pts.isEmpty() ? id : pts.get(0).t;
        long end = pts.isEmpty() ? id : pts.get(pts.size() - 1).t;
        float max = 0;
        for (Pt p : pts) if (p.sp > max) max = p.sp;
        JSObject o = new JSObject();
        o.put("id", id);
        o.put("name", meta[0]);
        o.put("start", start);
        o.put("end", end);
        o.put("distance", dist(pts));
        o.put("points", pts.size());
        o.put("maxSpeed", max);
        o.put("done", meta[1].length() > 0);
        try { if (meta[2].length() > 0) o.put("bat0", Integer.parseInt(meta[2].trim())); if (meta[3].length() > 0) o.put("bat1", Integer.parseInt(meta[3].trim())); } catch (NumberFormatException x) { /* ignore */ }
        boolean roamed = false;
        for (Pt p : pts) if (p.roam == 1) roamed = true;
        o.put("roamed", roamed);
        if (!pts.isEmpty()) { o.put("lat0", pts.get(0).lat); o.put("lon0", pts.get(0).lon); Pt z = pts.get(pts.size() - 1); o.put("lat1", z.lat); o.put("lon1", z.lon); }
        return o;
    }

    private int battery() {
        try {
            Intent b = ctx().registerReceiver(null, new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            int l = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), sc = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
            return sc > 0 ? Math.round(l * 100f / sc) : l;
        } catch (Throwable t) { return -1; }
    }

    private boolean hasUsage() {
        try {
            AppOpsManager ops = (AppOpsManager) ctx().getSystemService(Context.APP_OPS_SERVICE);
            return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx().getPackageName()) == AppOpsManager.MODE_ALLOWED;
        } catch (Throwable t) { return false; }
    }

    private long netBytes(int type, long s, long e) {
        try {
            NetworkStatsManager nsm = (NetworkStatsManager) ctx().getSystemService(Context.NETWORK_STATS_SERVICE);
            NetworkStats.Bucket b = nsm.querySummaryForDevice(type, null, s, e);
            return b.getRxBytes() + b.getTxBytes();
        } catch (Throwable t) { return -1L; }
    }

    private int mediaCount(android.net.Uri uri, long s, long e) {
        Cursor c = null;
        try {
            c = ctx().getContentResolver().query(uri, new String[] { MediaStore.MediaColumns._ID }, "datetaken>=? AND datetaken<=?", new String[] { String.valueOf(s), String.valueOf(e) }, null);
            return c == null ? 0 : c.getCount();
        } catch (Throwable t) { return 0; } finally { if (c != null) c.close(); }
    }

    /** Full details of one trip: summary, stops, data used during it, photos and videos taken during it. */
    @PluginMethod
    public void tripDetail(final PluginCall call) {
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    long id = call.getLong("id", 0L);
                    File f = new File(TrackService.dir(ctx()), id + ".csv");
                    JSObject o = summary(f);
                    List<Pt> pts = read(f, null);
                    JSArray stops = new JSArray();
                    int i = 0, n = 0;
                    float[] res = new float[1];
                    while (i < pts.size() && n < 8) {
                        int j = i;
                        while (j + 1 < pts.size()) { Location.distanceBetween(pts.get(i).lat, pts.get(i).lon, pts.get(j + 1).lat, pts.get(j + 1).lon, res); if (res[0] > 80f) break; j++; }
                        if (j > i && pts.get(j).t - pts.get(i).t >= 10 * 60 * 1000L) {
                            JSObject sp = new JSObject();
                            sp.put("t0", pts.get(i).t); sp.put("t1", pts.get(j).t); sp.put("lat", pts.get(i).lat); sp.put("lon", pts.get(i).lon);
                            stops.put(sp); n++;
                        }
                        i = Math.max(j, i) + 1;
                    }
                    o.put("stops", stops);
                    long s = o.getLong("start"), e = o.getLong("end");
                    if (hasUsage()) {
                        o.put("dataWifi", netBytes(ConnectivityManager.TYPE_WIFI, s, e));
                        o.put("dataMobile", netBytes(ConnectivityManager.TYPE_MOBILE, s, e));
                    }
                    int photos = mediaCount(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, s, e), videos = mediaCount(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, s, e);
                    o.put("photos", photos);
                    o.put("videos", videos);
                    call.resolve(o);
                } catch (Throwable t) { call.reject("detail failed: " + t); }
            }
        }).start();
    }

    /** Notes and expenses are stored as one JSON text per trip. */
    @PluginMethod
    public void extraGet(PluginCall call) {
        JSObject r = new JSObject();
        String txt = "[]";
        try {
            File f = new File(TrackService.dir(ctx()), call.getLong("id", 0L) + ".json");
            if (f.exists()) { BufferedReader br = new BufferedReader(new FileReader(f)); StringBuilder sb = new StringBuilder(); String ln; while ((ln = br.readLine()) != null) sb.append(ln); br.close(); txt = sb.toString(); }
        } catch (Throwable t) { /* empty */ }
        r.put("json", txt);
        call.resolve(r);
    }

    @PluginMethod
    public void extraSet(PluginCall call) {
        try {
            FileWriter w = new FileWriter(new File(TrackService.dir(ctx()), call.getLong("id", 0L) + ".json"), false);
            w.write(call.getString("json", "[]"));
            w.close();
            call.resolve();
        } catch (Throwable t) { call.reject("save failed: " + t); }
    }

    @PluginMethod
    public void tripConfig(PluginCall call) {
        if (call.hasOption("dataLimitMb")) sp().edit().putLong("dataLimitMb", call.getLong("dataLimitMb", 0L)).apply();
        JSObject r = new JSObject();
        r.put("dataLimitMb", sp().getLong("dataLimitMb", 0));
        call.resolve(r);
    }

    @PluginMethod
    public void tripStatus(PluginCall call) {
        long id = sp().getLong("active", 0);
        JSObject r = new JSObject();
        r.put("active", id != 0);
        if (id != 0) {
            File f = new File(TrackService.dir(ctx()), id + ".csv");
            r.put("trip", f.exists() ? summary(f) : new JSObject());
        }
        call.resolve(r);
    }

    @PluginMethod
    public void tripStart(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) { call.reject("no location permission"); return; }
        try {
            long id = System.currentTimeMillis();
            String name = call.getString("name", "");
            File f = new File(TrackService.dir(ctx()), id + ".csv");
            FileWriter w = new FileWriter(f, false);
            w.write("#name," + name.replace("\n", " ").replace(",", " ") + "\n#bat0," + battery() + "\n");
            w.close();
            sp().edit().putLong("active", id).apply();
            Intent i = new Intent(ctx(), TrackService.class);
            if (Build.VERSION.SDK_INT >= 26) ctx().startForegroundService(i); else ctx().startService(i);
            JSObject r = new JSObject();
            r.put("id", id);
            call.resolve(r);
        } catch (Throwable t) { call.reject("cannot start: " + t); }
    }

    @PluginMethod
    public void tripStop(PluginCall call) {
        long id = sp().getLong("active", 0);
        sp().edit().putLong("active", 0).apply();
        if (!sp().getBoolean("auto", false)) { try { ctx().stopService(new Intent(ctx(), TrackService.class)); } catch (Throwable t) { /* already stopped */ } }
        else { try { restartSvc(); } catch (Throwable t) { /* ignore */ } }
        if (id != 0) {
            try {
                File f = new File(TrackService.dir(ctx()), id + ".csv");
                FileWriter w = new FileWriter(f, true);
                w.write("#bat1," + battery() + "\n#end," + System.currentTimeMillis() + "\n");
                w.close();
            } catch (Throwable t) { /* ignore */ }
        }
        call.resolve();
    }

    @PluginMethod
    public void tripList(PluginCall call) {
        File[] fs = TrackService.dir(ctx()).listFiles();
        ArrayList<File> list = new ArrayList<File>();
        if (fs != null) for (File f : fs) if (f.getName().endsWith(".csv")) list.add(f);
        Collections.sort(list, new java.util.Comparator<File>() { public int compare(File a, File b) { return b.getName().compareTo(a.getName()); } });
        JSArray out = new JSArray();
        for (File f : list) out.put(summary(f));
        JSObject r = new JSObject();
        r.put("trips", out);
        call.resolve(r);
    }

    @PluginMethod
    public void tripPoints(PluginCall call) {
        File f = new File(TrackService.dir(ctx()), call.getLong("id", 0L) + ".csv");
        List<Pt> pts = read(f, null);
        int step = Math.max(1, pts.size() / 400);
        JSArray out = new JSArray();
        for (int i = 0; i < pts.size(); i += step) {
            Pt p = pts.get(i);
            JSObject o = new JSObject();
            o.put("t", p.t); o.put("lat", p.lat); o.put("lon", p.lon); o.put("sp", p.sp);
            out.put(o);
        }
        if (pts.size() > 1 && (pts.size() - 1) % step != 0) {
            Pt p = pts.get(pts.size() - 1);
            JSObject o = new JSObject();
            o.put("t", p.t); o.put("lat", p.lat); o.put("lon", p.lon); o.put("sp", p.sp);
            out.put(o);
        }
        JSObject r = new JSObject();
        r.put("points", out);
        call.resolve(r);
    }

    @PluginMethod
    public void tripDelete(PluginCall call) {
        long id = call.getLong("id", 0L);
        if (id == sp().getLong("active", 0)) { call.reject("trip is still recording"); return; }
        new File(TrackService.dir(ctx()), id + ".csv").delete();
        new File(TrackService.dir(ctx()), id + ".json").delete();
        call.resolve();
    }

    @PluginMethod
    public void tripRename(PluginCall call) {
        try {
            File f = new File(TrackService.dir(ctx()), call.getLong("id", 0L) + ".csv");
            String name = call.getString("name", "").replace("\n", " ").replace(",", " ");
            ArrayList<String> lines = new ArrayList<String>();
            BufferedReader r = new BufferedReader(new FileReader(f));
            String ln;
            while ((ln = r.readLine()) != null) if (!ln.startsWith("#name,")) lines.add(ln);
            r.close();
            FileWriter w = new FileWriter(f, false);
            w.write("#name," + name + "\n");
            for (String s : lines) w.write(s + "\n");
            w.close();
            call.resolve();
        } catch (Throwable t) { call.reject("rename failed: " + t); }
    }

    /** Writes a standard GPX file the user can open in any maps app. */
    @PluginMethod
    public void tripExport(PluginCall call) {
        try {
            long id = call.getLong("id", 0L);
            String[] meta = new String[] { "", "" };
            List<Pt> pts = read(new File(TrackService.dir(ctx()), id + ".csv"), meta);
            if (pts.isEmpty()) { call.reject("no points"); return; }
            File dir = new File(Environment.getExternalStorageDirectory(), "Cleanova/trips");
            dir.mkdirs();
            String stamp = new SimpleDateFormat("yyyyMMdd-HHmm", Locale.US).format(new Date(pts.get(0).t));
            File f = new File(dir, "trip-" + stamp + ".gpx");
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
            iso.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            FileWriter w = new FileWriter(f, false);
            w.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<gpx version=\"1.1\" creator=\"Cleanova\" xmlns=\"http://www.topografix.com/GPX/1/1\"><trk><name>" + (meta[0].length() > 0 ? meta[0].replace("&", "&amp;").replace("<", "&lt;") : "Trip " + stamp) + "</name><trkseg>\n");
            for (Pt p : pts) w.write("<trkpt lat=\"" + p.lat + "\" lon=\"" + p.lon + "\"><time>" + iso.format(new Date(p.t)) + "</time></trkpt>\n");
            w.write("</trkseg></trk></gpx>\n");
            w.close();
            JSObject r = new JSObject();
            r.put("path", f.getAbsolutePath());
            call.resolve(r);
        } catch (Throwable t) { call.reject("export failed: " + t); }
    }

    /** Looks up a place name for a coordinate using the phone's own geocoder (needs internet, optional). */
    @PluginMethod
    public void placeName(final PluginCall call) {
        new Thread(new Runnable() {
            @Override public void run() {
                JSObject r = new JSObject();
                String name = "";
                try {
                    if (Geocoder.isPresent()) {
                        List<Address> a = new Geocoder(ctx(), Locale.getDefault()).getFromLocation(call.getDouble("lat", 0.0), call.getDouble("lon", 0.0), 1);
                        if (a != null && !a.isEmpty()) {
                            Address ad = a.get(0);
                            String loc = ad.getSubLocality() != null ? ad.getSubLocality() : ad.getLocality();
                            String city = ad.getLocality() != null ? ad.getLocality() : ad.getAdminArea();
                            name = loc != null && city != null && !loc.equals(city) ? loc + ", " + city : (city != null ? city : (loc != null ? loc : ""));
                        }
                    }
                } catch (Throwable t) { /* offline */ }
                r.put("name", name);
                call.resolve(r);
            }
        }).start();
    }

    @Override
    public void load() {
        try {
            if (sp().getBoolean("auto", false) && getPermissionState("location") == PermissionState.GRANTED) restartSvc();
        } catch (Throwable t) { /* the app restarts it from the screen */ }
    }

    private void restartSvc() {
        Intent i = new Intent(ctx(), TrackService.class);
        if (Build.VERSION.SDK_INT >= 26) ctx().startForegroundService(i); else ctx().startService(i);
    }

    /* ---------- automatic daily movement log ---------- */
    @PluginMethod
    public void autoStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("on", sp().getBoolean("auto", false));
        r.put("loc", getPermissionState("location") == PermissionState.GRANTED);
        r.put("bg", Build.VERSION.SDK_INT < 29 || getPermissionState("bgloc") == PermissionState.GRANTED);
        r.put("activity", Build.VERSION.SDK_INT < 29 || getPermissionState("activity") == PermissionState.GRANTED);
        r.put("stepsToday", sp().getFloat("steps_" + TrackService.dayKey(System.currentTimeMillis()), 0f));
        r.put("fixT", sp().getLong("dg_fix", 0));
        r.put("fixProv", sp().getString("dg_prov", ""));
        r.put("fixAcc", sp().getInt("dg_acc", 0));
        r.put("startT", Long.parseLong(sp().getString("dg_start", "0")));
        r.put("err", sp().getString("dg_err", ""));
        r.put("motion", sp().getString("dg_motion", ""));
        try {
            android.os.PowerManager pm = (android.os.PowerManager) ctx().getSystemService(Context.POWER_SERVICE);
            r.put("batteryOk", Build.VERSION.SDK_INT < 23 || pm.isIgnoringBatteryOptimizations(ctx().getPackageName()));
            android.location.LocationManager lmm = (android.location.LocationManager) ctx().getSystemService(Context.LOCATION_SERVICE);
            r.put("gpsEnabled", lmm.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER));
        } catch (Throwable t) { /* unknown */ }
        call.resolve(r);
    }

    @PluginMethod
    public void autoSet(PluginCall call) {
        boolean on = call.getBoolean("on", false);
        if (on && getPermissionState("location") != PermissionState.GRANTED) { call.reject("no location permission"); return; }
        sp().edit().putBoolean("auto", on).apply();
        try {
            if (on) restartSvc();
            else if (sp().getLong("active", 0) == 0) ctx().stopService(new Intent(ctx(), TrackService.class));
            call.resolve();
        } catch (Throwable t) { call.reject("cannot change: " + t); }
    }

    @PluginMethod
    public void permRequest(PluginCall call) {
        String which = call.getString("which", "activity");
        if (Build.VERSION.SDK_INT < 29 || getPermissionState(which) == PermissionState.GRANTED) { autoStatus(call); return; }
        requestPermissionForAlias(which, call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) { autoStatus(call); }

    /* ---------- daily summaries ---------- */
    private static final float WALK_MAX = 2.3f;   /* m/s, about 8 km/h */

    private JSObject daySummary(File f) {
        String name = f.getName().replace(".csv", "");
        List<Pt> pts = read(f, null);
        double walk = 0, veh = 0;
        long moving = 0;
        float[] res = new float[1];
        for (int i = 1; i < pts.size(); i++) {
            Pt a = pts.get(i - 1), b = pts.get(i);
            Location.distanceBetween(a.lat, a.lon, b.lat, b.lon, res);
            long dt = Math.max(1, (b.t - a.t) / 1000);
            float v = res[0] / dt;
            if (res[0] < 12f || v > 70f) continue;
            /* indoors the fix wanders by tens of metres: a jump smaller than the combined accuracy, or one the GPS itself reports as standing still, is noise */
            if (res[0] < 0.5f * (a.acc + b.acc)) continue;
            if (a.sp < 0.6f && b.sp < 0.6f && res[0] < 150f) continue;
            if (v < WALK_MAX) walk += res[0]; else veh += res[0];
            if (dt <= 900) moving += dt;
        }
        /* walking cannot be longer than the steps counted (about 1.1 m a step at most); only when the step sensor has data for the day */
        if (sp().contains("steps_" + name)) {
            double cap = sp().getFloat("steps_" + name, 0f) * 1.1 + 25;
            if (walk > cap) walk = cap;
        }
        JSObject o = new JSObject();
        o.put("date", name);
        o.put("distance", walk + veh);
        o.put("walk", walk);
        o.put("vehicle", veh);
        o.put("movingSec", moving);
        o.put("points", pts.size());
        o.put("steps", sp().getFloat("steps_" + name, 0f));
        if (!pts.isEmpty()) { o.put("first", pts.get(0).t); o.put("last", pts.get(pts.size() - 1).t); }
        return o;
    }

    @PluginMethod
    public void dayList(PluginCall call) {
        File[] fs = TrackService.daysDir(ctx()).listFiles();
        ArrayList<File> list = new ArrayList<File>();
        if (fs != null) for (File f : fs) if (f.getName().endsWith(".csv")) list.add(f);
        Collections.sort(list, new java.util.Comparator<File>() { public int compare(File a, File b) { return b.getName().compareTo(a.getName()); } });
        int max = call.getInt("days", 60);
        JSArray out = new JSArray();
        for (int i = 0; i < list.size() && i < max; i++) out.put(daySummary(list.get(i)));
        JSObject r = new JSObject();
        r.put("days", out);
        call.resolve(r);
    }

    @PluginMethod
    public void dayDetail(final PluginCall call) {
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    String date = call.getString("date", "");
                    File f = new File(TrackService.daysDir(ctx()), date + ".csv");
                    List<Pt> pts = read(f, null);
                    JSObject o = daySummary(f);
                    float[] res = new float[1];
                    /* stops: 10+ minutes within 80 m */
                    ArrayList<double[]> stops = new ArrayList<double[]>();   /* t0, t1, lat, lon, firstIdx, lastIdx */
                    int i = 0;
                    while (i < pts.size()) {
                        int j = i;
                        while (j + 1 < pts.size()) { Location.distanceBetween(pts.get(i).lat, pts.get(i).lon, pts.get(j + 1).lat, pts.get(j + 1).lon, res); if (res[0] > 80f) break; j++; }
                        if (j > i && pts.get(j).t - pts.get(i).t >= 10 * 60 * 1000L) { stops.add(new double[] { pts.get(i).t, pts.get(j).t, pts.get(i).lat, pts.get(i).lon, i, j }); i = j + 1; }
                        else i++;
                    }
                    JSArray st = new JSArray();
                    for (double[] s : stops) { JSObject x = new JSObject(); x.put("t0", (long) s[0]); x.put("t1", (long) s[1]); x.put("lat", s[2]); x.put("lon", s[3]); st.put(x); }
                    o.put("stops", st);
                    /* journeys between anchors (stops, plus the first and last point of the day) */
                    ArrayList<double[]> anchors = new ArrayList<double[]>();   /* t0, t1, lat, lon, idxStart, idxEnd */
                    if (!pts.isEmpty()) {
                        Pt p0 = pts.get(0);
                        if (stops.isEmpty() || stops.get(0)[0] - p0.t > 5 * 60 * 1000L) anchors.add(new double[] { p0.t, p0.t, p0.lat, p0.lon, 0, 0 });
                        anchors.addAll(stops);
                        Pt pz = pts.get(pts.size() - 1);
                        double[] lastA = anchors.isEmpty() ? null : anchors.get(anchors.size() - 1);
                        if (lastA == null || pz.t - lastA[1] > 5 * 60 * 1000L) anchors.add(new double[] { pz.t, pz.t, pz.lat, pz.lon, pts.size() - 1, pts.size() - 1 });
                    }
                    JSArray jr = new JSArray();
                    for (int k = 0; k + 1 < anchors.size(); k++) {
                        double[] a = anchors.get(k), b = anchors.get(k + 1);
                        int from = (int) a[5], to = (int) b[4];
                        double w = 0, v = 0;
                        for (int q = Math.max(1, from + 1); q <= to && q < pts.size(); q++) {
                            Pt pa = pts.get(q - 1), pb = pts.get(q);
                            Location.distanceBetween(pa.lat, pa.lon, pb.lat, pb.lon, res);
                            long dt = Math.max(1, (pb.t - pa.t) / 1000);
                            float sp = res[0] / dt;
                            if (res[0] < 12f || sp > 70f) continue;
                            if (sp < WALK_MAX) w += res[0]; else v += res[0];
                        }
                        if (w + v < 150) continue;
                        JSObject x = new JSObject();
                        x.put("t0", (long) a[1]); x.put("t1", (long) b[0]);
                        x.put("fromLat", a[2]); x.put("fromLon", a[3]); x.put("toLat", b[2]); x.put("toLon", b[3]);
                        x.put("walk", w); x.put("vehicle", v);
                        jr.put(x);
                    }
                    o.put("journeys", jr);
                    /* route points with movement class (0 still, 1 walking, 2 vehicle) */
                    int step = Math.max(1, pts.size() / 900);
                    JSArray route = new JSArray();
                    for (int q = 0; q < pts.size(); q += step) {
                        Pt p = pts.get(q);
                        int m = 0;
                        if (q > 0) {
                            Pt pa = pts.get(q - 1);
                            Location.distanceBetween(pa.lat, pa.lon, p.lat, p.lon, res);
                            long dt = Math.max(1, (p.t - pa.t) / 1000);
                            float sp = res[0] / dt;
                            m = res[0] < 12f || sp > 70f ? 0 : sp < WALK_MAX ? 1 : 2;
                        }
                        JSObject x = new JSObject();
                        x.put("t", p.t); x.put("lat", p.lat); x.put("lon", p.lon); x.put("m", m);
                        route.put(x);
                    }
                    o.put("route", route);
                    call.resolve(o);
                } catch (Throwable t) { call.reject("day failed: " + t); }
            }
        }).start();
    }

    @PluginMethod
    public void dayDelete(PluginCall call) {
        new File(TrackService.daysDir(ctx()), call.getString("date", "x") + ".csv").delete();
        call.resolve();
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(call.getString("url", "")));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx().startActivity(i);
            call.resolve();
        } catch (Throwable t) { call.reject("cannot open: " + t); }
    }
}
