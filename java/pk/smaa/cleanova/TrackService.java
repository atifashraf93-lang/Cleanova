package pk.smaa.cleanova;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.NetworkStats;
import android.app.usage.NetworkStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.hardware.TriggerEvent;
import android.hardware.TriggerEventListener;
import android.os.Handler;
import android.os.Looper;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.telephony.TelephonyManager;

import java.io.File;
import java.io.FileWriter;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Foreground service that keeps the user's own movement log on the phone.
 * - Daily log (when "auto" is on): points are appended to days/yyyyMMdd.csv, GPS is switched on only while moving.
 * - Manual trip: points are also appended to trips/ID.csv and GPS stays on.
 * - Steps: counted with the phone's step sensor (if allowed) and stored per day.
 */
public class TrackService extends Service implements LocationListener, SensorEventListener {
    static final String PREFS = "cl.trip";
    static final String CH = "cl_trip";
    private LocationManager lm;
    private SensorManager sm;
    private File tripOut;
    private Location last;
    private long lastWrite = 0, lastMove = 0, lastCheck = 0, lastStepSave = 0;
    private boolean gpsOn = false, netOn = false, notifiedData = false, notifiedRoam = false;
    private double stepAcc = 0;
    private float lastRaw = -1;
    private String stepDay = "";
    private Sensor motion;
    private boolean hasMotion = false, stepReg = false;
    private Handler hd;
    private final TriggerEventListener trig = new TriggerEventListener() {
        @Override public void onTrigger(TriggerEvent ev) {
            lastMove = System.currentTimeMillis(); setGps(true); armMotion();
        }
    };
    private final Runnable idle = new Runnable() {
        @Override public void run() {
            try {
                long now = System.currentTimeMillis();
                if (gpsOn && tripOut == null && hasMotion && now - lastMove > 8 * 60 * 1000L) setGps(false);
            } catch (Throwable t) { /* ignore */ }
            if (hd != null) hd.postDelayed(this, 120000L);
        }
    };
    private void diag(String k, String v) { try { getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(k, v).apply(); } catch (Throwable t) { /* ignore */ } }
    private void armMotion() {
        try { if (sm != null && motion != null) sm.requestTriggerSensor(trig, motion); } catch (Throwable t) { diag("dg_err", "motion: " + t); }
    }

    static File dir(Context c) { File d = new File(c.getFilesDir(), "trips"); if (!d.exists()) d.mkdirs(); return d; }
    static File daysDir(Context c) { File d = new File(c.getFilesDir(), "days"); if (!d.exists()) d.mkdirs(); return d; }
    static String dayKey(long t) { return new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date(t)); }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
        long id = sp.getLong("active", 0);
        boolean auto = sp.getBoolean("auto", false);
        if (id == 0 && !auto) { stopSelf(); return START_NOT_STICKY; }
        tripOut = id != 0 ? new File(dir(this), id + ".csv") : null;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            nm.createNotificationChannel(new NotificationChannel(CH, "Movement log", NotificationManager.IMPORTANCE_LOW));
        }
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_menu_mylocation).setOngoing(true)
            .setContentTitle(id != 0 ? "Cleanova · سفر ریکارڈ ہو رہا ہے" : "Cleanova · روزانہ نقل و حرکت")
            .setContentText("Saved on this phone only · ریکارڈ صرف آپ کے فون میں");
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open != null) b.setContentIntent(PendingIntent.getActivity(this, 0, open, Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(2, b.build(), 8);
            else startForeground(2, b.build());
        } catch (Throwable t) { diag("dg_err", "foreground: " + t); stopSelf(); return START_NOT_STICKY; }
        diag("dg_start", String.valueOf(System.currentTimeMillis()));
        if (lm == null) lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        try {
            if (!netOn && lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) { lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 60000L, 60f, this); netOn = true; }
            if (id != 0) setGps(true); else if (!gpsOn) setGps(false);
        } catch (SecurityException e) { diag("dg_err", "location permission: " + e); stopSelf(); return START_NOT_STICKY; }
        startSteps();
        startMotion();
        if (hd == null) { hd = new Handler(Looper.getMainLooper()); hd.postDelayed(idle, 120000L); }
        return START_STICKY;
    }

    private void setGps(boolean on) {
        try {
            if (on && !gpsOn && lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) { lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 15000L, 15f, this); gpsOn = true; }
            else if (!on && gpsOn) { /* only the GPS listener is dropped, network stays */
                lm.removeUpdates(this); gpsOn = false; netOn = false;
                if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) { lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 60000L, 60f, this); netOn = true; }
            }
        } catch (SecurityException e) { /* permission lost */ }
    }

    private void startMotion() {
        try {
            if (sm == null) sm = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
            if (motion == null) motion = sm.getDefaultSensor(Sensor.TYPE_SIGNIFICANT_MOTION);
            hasMotion = motion != null;
            if (hasMotion) armMotion();
            else if (tripOut == null) setGps(true);   /* no motion sensor: keep GPS on so nothing is missed */
            diag("dg_motion", hasMotion ? "yes" : "no");
        } catch (Throwable t) { diag("dg_err", "motion setup: " + t); }
    }

    private void startSteps() {
        try {
            if (stepReg) return;
            if (Build.VERSION.SDK_INT >= 29 && checkSelfPermission("android.permission.ACTIVITY_RECOGNITION") != PackageManager.PERMISSION_GRANTED) return;
            if (sm == null) sm = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
            Sensor s = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            if (s != null) { sm.registerListener(this, s, SensorManager.SENSOR_DELAY_NORMAL); stepReg = true; }
        } catch (Throwable t) { /* no step sensor */ }
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        try {
            float raw = e.values[0];
            SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
            String day = dayKey(System.currentTimeMillis());
            if (!day.equals(stepDay)) { stepDay = day; stepAcc = sp.getFloat("steps_" + day, 0f); }
            if (lastRaw < 0) lastRaw = sp.getFloat("lastRaw", -1f);
            if (lastRaw >= 0) { double delta = raw >= lastRaw ? raw - lastRaw : raw; if (delta < 5000) stepAcc += delta; }
            lastRaw = raw;
            long now = System.currentTimeMillis();
            if (tripOut == null && hasMotion) { lastMove = now; setGps(true); }
            if (now - lastStepSave > 20000L) { lastStepSave = now; sp.edit().putFloat("steps_" + day, (float) stepAcc).putFloat("lastRaw", raw).apply(); }
        } catch (Throwable t) { /* ignore */ }
    }

    @Override public void onAccuracyChanged(Sensor s, int a) { }

    @Override
    public void onLocationChanged(Location l) {
        if (l == null) return;
        long now = System.currentTimeMillis();
        if (l.hasAccuracy() && l.getAccuracy() > 80f) {
            /* coarse (cell / wifi) fix: not stored, but a big jump still means we are moving, so switch GPS on */
            if (last != null && l.distanceTo(last) > Math.max(300f, l.getAccuracy())) { lastMove = now; setGps(true); }
            else if (last == null) { lastMove = now; setGps(true); }
            return;
        }
        boolean moved = last == null || l.distanceTo(last) >= 12f;
        boolean fast = l.hasSpeed() && l.getSpeed() > 1.0f;
        if (moved && last != null && l.distanceTo(last) > 60f || fast) { lastMove = now; setGps(true); }
        else if (gpsOn && tripOut == null && now - lastMove > 8 * 60 * 1000L) setGps(false);
        if (last != null && !moved && now - lastWrite < 5 * 60 * 1000L) return;   /* standing still: one point every 5 minutes */
        if (last != null && l.getTime() - last.getTime() < 8000L) return;
        last = l; lastWrite = now;
        try { getSharedPreferences(PREFS, MODE_PRIVATE).edit().putLong("dg_fix", now).putString("dg_prov", String.valueOf(l.getProvider())).putInt("dg_acc", l.hasAccuracy() ? Math.round(l.getAccuracy()) : 0).putBoolean("dg_gps", gpsOn).apply(); } catch (Throwable t) { /* ignore */ }
        boolean roam = false;
        try { TelephonyManager tm = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE); roam = tm != null && tm.isNetworkRoaming(); } catch (Throwable t) { /* unknown */ }
        String line = l.getTime() + "," + l.getLatitude() + "," + l.getLongitude() + "," + (l.hasAccuracy() ? Math.round(l.getAccuracy()) : 0) + "," + (l.hasSpeed() ? String.format(Locale.US, "%.1f", l.getSpeed()) : "0") + "," + (roam ? 1 : 0) + "\n";
        try { FileWriter w = new FileWriter(new File(daysDir(this), dayKey(l.getTime()) + ".csv"), true); w.write(line); w.close(); } catch (Throwable t) { /* storage full */ }
        if (tripOut != null) { try { FileWriter w = new FileWriter(tripOut, true); w.write(line); w.close(); } catch (Throwable t) { /* storage full */ } }
        if (roam && !notifiedRoam) { notifiedRoam = true; alert(21, "رومنگ آن ہے · Roaming is ON", "موبائل ڈیٹا مہنگا ہو سکتا ہے · Mobile data may be expensive"); }
        checkData();
    }

    private void alert(int id, String title, String text) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel("cl_trip_alert", "Trip alerts", NotificationManager.IMPORTANCE_HIGH));
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, "cl_trip_alert") : new Notification.Builder(this);
            b.setSmallIcon(android.R.drawable.ic_dialog_alert).setContentTitle(title).setContentText(text).setAutoCancel(true);
            nm.notify(id, b.build());
        } catch (Throwable t) { /* notifications blocked */ }
    }

    /** Warns once when mobile data used since the trip started passes the limit the user chose. */
    private void checkData() {
        long now = System.currentTimeMillis();
        if (notifiedData || now - lastCheck < 5 * 60 * 1000L || Build.VERSION.SDK_INT < 23) return;
        lastCheck = now;
        SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
        long limit = sp.getLong("dataLimitMb", 0) * 1048576L, id = sp.getLong("active", 0);
        if (limit <= 0 || id == 0) return;
        try {
            NetworkStatsManager nsm = (NetworkStatsManager) getSystemService(Context.NETWORK_STATS_SERVICE);
            NetworkStats.Bucket b = nsm.querySummaryForDevice(ConnectivityManager.TYPE_MOBILE, null, id, now);
            long used = b.getRxBytes() + b.getTxBytes();
            if (used >= limit) {
                notifiedData = true;
                alert(22, "ڈیٹا کی حد پوری · Data limit reached", "اس سفر میں موبائل ڈیٹا " + (used / 1048576L) + " MB لگ چکا · " + (used / 1048576L) + " MB mobile data used on this trip");
            }
        } catch (Throwable t) { /* needs usage access */ }
    }

    @Override
    public void onDestroy() {
        try { if (hd != null) hd.removeCallbacks(idle); hd = null; } catch (Throwable t) { /* ignore */ }
        try { if (sm != null && motion != null) sm.cancelTriggerSensor(trig, motion); } catch (Throwable t) { /* ignore */ }
        try { if (lm != null) lm.removeUpdates(this); } catch (Throwable t) { /* ignore */ }
        try { if (sm != null) sm.unregisterListener(this); } catch (Throwable t) { /* ignore */ }
        super.onDestroy();
    }

    @Override public void onStatusChanged(String p, int s, Bundle e) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }
}
