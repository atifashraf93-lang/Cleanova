package pk.smaa.cleanova;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Enumeration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/** Light sensor, Wi-Fi signal, and the self-update helpers (web bundle download and APK install). */
@CapacitorPlugin(name = "Sense")
public class SensePlugin extends Plugin {
    /** Bump this whenever the Java side changes in a way the web files depend on. */
    static final int API = 4;
    static final String OTA_PREFS = "cl.ota";

    private SensorManager sm;
    private Sensor light;
    private volatile float lux = -1f;
    private volatile long luxT = 0;
    private final SensorEventListener lis = new SensorEventListener() {
        @Override public void onSensorChanged(SensorEvent e) { if (e.values != null && e.values.length > 0) { lux = e.values[0]; luxT = System.currentTimeMillis(); } }
        @Override public void onAccuracyChanged(Sensor s, int a) { /* unused */ }
    };

    private Context ctx() { return getContext().getApplicationContext(); }

    @PluginMethod
    public void api(PluginCall call) {
        JSObject r = new JSObject();
        r.put("api", API);
        call.resolve(r);
    }

    /* ---------- light meter ---------- */
    @PluginMethod
    public void lightStart(PluginCall call) {
        try {
            if (sm == null) sm = (SensorManager) ctx().getSystemService(Context.SENSOR_SERVICE);
            light = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_LIGHT);
            if (light == null) { call.reject("no light sensor"); return; }
            lux = -1f;
            sm.unregisterListener(lis);
            sm.registerListener(lis, light, SensorManager.SENSOR_DELAY_NORMAL);
            call.resolve();
        } catch (Throwable t) { call.reject("light: " + t); }
    }

    @PluginMethod
    public void lightRead(PluginCall call) {
        JSObject r = new JSObject();
        r.put("lux", lux);
        r.put("age", luxT == 0 ? -1 : System.currentTimeMillis() - luxT);
        call.resolve(r);
    }

    @PluginMethod
    public void lightStop(PluginCall call) {
        try { if (sm != null) sm.unregisterListener(lis); } catch (Throwable t) { /* ignore */ }
        call.resolve();
    }

    @Override
    protected void handleOnPause() {
        try { if (sm != null) sm.unregisterListener(lis); } catch (Throwable t) { /* ignore */ }
    }

    /* ---------- Wi-Fi signal ---------- */
    @SuppressWarnings("deprecation")
    @PluginMethod
    public void wifi(PluginCall call) {
        JSObject r = new JSObject();
        try {
            WifiManager wm = (WifiManager) ctx().getSystemService(Context.WIFI_SERVICE);
            r.put("enabled", wm != null && wm.isWifiEnabled());
            WifiInfo wi = wm == null ? null : wm.getConnectionInfo();
            int rssi = wi == null ? -127 : wi.getRssi();
            boolean on = wi != null && wi.getNetworkId() != -1 && rssi > -127;
            r.put("connected", on);
            r.put("rssi", rssi);
            if (on) {
                r.put("speed", wi.getLinkSpeed());
                r.put("freq", Build.VERSION.SDK_INT >= 21 ? wi.getFrequency() : 0);
                String s = wi.getSSID();
                r.put("ssid", s == null || s.contains("unknown") ? "" : s.replace("\"", ""));
            }
        } catch (Throwable t) { r.put("connected", false); r.put("err", String.valueOf(t)); }
        call.resolve(r);
    }

    /* ---------- speed outside the app (notification and floating circle) ---------- */
    @PluginMethod
    public void speedStart(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= 23 && ctx().checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) { call.reject("no location permission"); return; }
            if (Build.VERSION.SDK_INT >= 33 && ctx().checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED && getActivity() != null) {
                getActivity().requestPermissions(new String[] { "android.permission.POST_NOTIFICATIONS" }, 9211);
            }
            Intent i = new Intent(ctx(), SpeedService.class);
            i.putExtra("limit", (int) call.getData().optLong("limit", 0L));
            i.putExtra("mph", call.getBoolean("mph", false));
            boolean bub = call.getBoolean("bubble", false) && (Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx()));
            i.putExtra("bubble", bub);
            if (Build.VERSION.SDK_INT >= 26) ctx().startForegroundService(i); else ctx().startService(i);
            JSObject r = new JSObject();
            r.put("bubble", bub);
            call.resolve(r);
        } catch (Throwable t) { call.reject("speed: " + t); }
    }

    @PluginMethod
    public void speedStop(PluginCall call) {
        try { ctx().stopService(new Intent(ctx(), SpeedService.class)); } catch (Throwable t) { /* ignore */ }
        call.resolve();
    }

    @PluginMethod
    public void speedState(PluginCall call) {
        JSObject r = new JSObject();
        r.put("running", SpeedService.running);
        r.put("kmh", SpeedService.lastKmh);
        r.put("overlay", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx()));
        call.resolve(r);
    }

    @PluginMethod
    public void overlaySettings(PluginCall call) {
        try {
            Intent s = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + ctx().getPackageName()));
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx().startActivity(s);
            call.resolve();
        } catch (Throwable t) { call.reject("overlay: " + t); }
    }

    /* ---------- download helper ---------- */
    private void fetch(String url, File out, String evt) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(60000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "CleanovaLife");
        int code = c.getResponseCode();
        if (code / 100 != 2) throw new Exception("http " + code);
        long total = c.getContentLengthLong();
        InputStream in = c.getInputStream();
        OutputStream os = new FileOutputStream(out);
        byte[] buf = new byte[65536];
        long got = 0;
        int last = -1;
        int n;
        while ((n = in.read(buf)) > 0) {
            os.write(buf, 0, n);
            got += n;
            if (total > 0) {
                int pct = (int) (got * 100 / total);
                if (pct != last) { last = pct; JSObject o = new JSObject(); o.put("pct", pct); notifyListeners(evt, o); }
            }
        }
        os.close();
        in.close();
        c.disconnect();
        if (total > 0 && got != total) throw new Exception("incomplete");
    }

    private java.util.List<String> urls(PluginCall call) {
        java.util.List<String> l = new java.util.ArrayList<String>();
        try {
            com.getcapacitor.JSArray a = call.getArray("urls");
            if (a != null) for (int i = 0; i < a.length(); i++) { String x = a.getString(i); if (x != null && x.startsWith("http") && !l.contains(x)) l.add(x); }
        } catch (Throwable t) { /* ignore */ }
        String u = call.getString("url", "");
        if (u != null && u.startsWith("http") && !l.contains(u)) l.add(u);
        return l;
    }

    /** Tries every address, twice around, and reports what went wrong at each. */
    private void fetchAny(java.util.List<String> list, File out, String evt) throws Exception {
        StringBuilder err = new StringBuilder();
        for (int round = 0; round < 2; round++) {
            for (String u : list) {
                try { fetch(u, out, evt); return; } catch (Throwable t) {
                    String host = "?";
                    try { host = new URL(u).getHost(); } catch (Throwable x) { /* ignore */ }
                    String m = t.getClass().getSimpleName() + (t.getMessage() == null ? "" : " " + t.getMessage());
                    if (err.indexOf(host + " " + m) < 0) err.append(host).append(": ").append(m).append(" | ");
                    try { Thread.sleep(1200); } catch (InterruptedException e) { /* ignore */ }
                }
            }
        }
        throw new Exception(err.toString());
    }

    private static void wipe(File f) {
        if (f == null || !f.exists()) return;
        File[] k = f.listFiles();
        if (k != null) for (File x : k) wipe(x);
        f.delete();
    }

    /* ---------- web bundle update (no reinstall) ---------- */
    @PluginMethod
    public void otaApply(final PluginCall call) {
        final java.util.List<String> list = urls(call);
        final long build = call.getData().optLong("build", 0L);
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    if (list.isEmpty() || build <= 0) throw new Exception("bad args");
                    File base = new File(ctx().getFilesDir(), "ota");
                    File zip = new File(ctx().getCacheDir(), "ota.zip");
                    fetchAny(list, zip, "otaProgress");
                    File dir = new File(base, String.valueOf(build));
                    wipe(dir);
                    dir.mkdirs();
                    String root = dir.getCanonicalPath() + File.separator;
                    ZipFile z = new ZipFile(zip);
                    Enumeration<? extends ZipEntry> en = z.entries();
                    while (en.hasMoreElements()) {
                        ZipEntry e = en.nextElement();
                        File o = new File(dir, e.getName());
                        if (!o.getCanonicalPath().startsWith(root)) throw new Exception("bad entry");
                        if (e.isDirectory()) { o.mkdirs(); continue; }
                        o.getParentFile().mkdirs();
                        InputStream in = z.getInputStream(e);
                        OutputStream os = new FileOutputStream(o);
                        byte[] b = new byte[32768];
                        int n;
                        while ((n = in.read(b)) > 0) os.write(b, 0, n);
                        os.close();
                        in.close();
                    }
                    z.close();
                    zip.delete();
                    if (!new File(dir, "index.html").exists()) { wipe(dir); throw new Exception("no index"); }
                    File[] old = base.listFiles();
                    if (old != null) for (File x : old) if (!x.getName().equals(String.valueOf(build))) wipe(x);
                    getContext().getSharedPreferences(OTA_PREFS, Context.MODE_PRIVATE).edit().putBoolean("ok", false).putInt("boots", 0).apply();
                    JSObject r = new JSObject();
                    r.put("path", dir.getAbsolutePath());
                    call.resolve(r);
                } catch (Throwable t) { call.reject("ota: " + t); }
            }
        }).start();
    }

    /** The new bundle started and ran fine: stop the rollback guard. */
    @PluginMethod
    public void otaOk(PluginCall call) {
        getContext().getSharedPreferences(OTA_PREFS, Context.MODE_PRIVATE).edit().putBoolean("ok", true).putInt("boots", 0).apply();
        call.resolve();
    }

    /* ---------- full app update (native changes) ---------- */
    @PluginMethod
    public void apkInstall(final PluginCall call) {
        final java.util.List<String> list = urls(call);
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    File dir = new File(ctx().getCacheDir(), "update");
                    dir.mkdirs();
                    File apk = new File(dir, "Cleanova.apk");
                    if (call.getBoolean("fresh", true) || !apk.exists()) fetchAny(list, apk, "apkProgress");
                    if (Build.VERSION.SDK_INT >= 26 && !ctx().getPackageManager().canRequestPackageInstalls()) {
                        Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx().getPackageName()));
                        s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx().startActivity(s);
                        JSObject r = new JSObject();
                        r.put("needPerm", true);
                        call.resolve(r);
                        return;
                    }
                    Uri u = FileProvider.getUriForFile(ctx(), ctx().getPackageName() + ".fileprovider", apk);
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setDataAndType(u, "application/vnd.android.package-archive");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx().startActivity(i);
                    JSObject r = new JSObject();
                    r.put("ok", true);
                    call.resolve(r);
                } catch (Throwable t) { call.reject("apk: " + t); }
            }
        }).start();
    }
}
