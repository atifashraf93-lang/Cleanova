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
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location")
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
    private static class Pt { long t; double lat, lon; float acc, sp; }

    private List<Pt> read(File f, String[] meta) {
        ArrayList<Pt> pts = new ArrayList<Pt>();
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            String ln;
            while ((ln = r.readLine()) != null) {
                if (ln.startsWith("#name,")) { if (meta != null) meta[0] = ln.substring(6); continue; }
                if (ln.startsWith("#end,")) { if (meta != null) meta[1] = ln.substring(5); continue; }
                String[] p = ln.split(",");
                if (p.length < 5) continue;
                try {
                    Pt q = new Pt();
                    q.t = Long.parseLong(p[0]); q.lat = Double.parseDouble(p[1]); q.lon = Double.parseDouble(p[2]);
                    q.acc = Float.parseFloat(p[3]); q.sp = Float.parseFloat(p[4]);
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
        String[] meta = new String[] { "", "" };
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
        if (!pts.isEmpty()) { o.put("lat0", pts.get(0).lat); o.put("lon0", pts.get(0).lon); Pt z = pts.get(pts.size() - 1); o.put("lat1", z.lat); o.put("lon1", z.lon); }
        return o;
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
            w.write("#name," + name.replace("\n", " ").replace(",", " ") + "\n");
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
        try { ctx().stopService(new Intent(ctx(), TrackService.class)); } catch (Throwable t) { /* already stopped */ }
        if (id != 0) {
            try {
                File f = new File(TrackService.dir(ctx()), id + ".csv");
                FileWriter w = new FileWriter(f, true);
                w.write("#end," + System.currentTimeMillis() + "\n");
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
}
