package pk.smaa.cleanova;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.app.usage.NetworkStats;
import android.app.usage.NetworkStatsManager;
import android.net.ConnectivityManager;
import android.os.Build;
import android.telephony.TelephonyManager;
import android.os.Bundle;
import android.os.IBinder;

import java.io.File;
import java.io.FileWriter;

/** Foreground service that writes the user's own trip route (time, lat, lon, accuracy, speed) to a file on the phone. */
public class TrackService extends Service implements LocationListener {
    static final String PREFS = "cl.trip";
    static final String CH = "cl_trip";
    private LocationManager lm;
    private File out;
    private Location last;
    private long lastCheck = 0;
    private boolean notifiedData = false, notifiedRoam = false;

    static File dir(Context c) { File d = new File(c.getFilesDir(), "trips"); if (!d.exists()) d.mkdirs(); return d; }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
        long id = sp.getLong("active", 0);
        if (id == 0) { stopSelf(); return START_NOT_STICKY; }
        out = new File(dir(this), id + ".csv");
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            nm.createNotificationChannel(new NotificationChannel(CH, "Trip recording", NotificationManager.IMPORTANCE_LOW));
        }
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_menu_mylocation).setOngoing(true)
            .setContentTitle("Cleanova · سفر ریکارڈ ہو رہا ہے")
            .setContentText("Recording your trip on this phone only · ریکارڈ صرف آپ کے فون میں");
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open != null) b.setContentIntent(PendingIntent.getActivity(this, 0, open, Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(2, b.build(), 8);
            else startForeground(2, b.build());
        } catch (Throwable t) { stopSelf(); return START_NOT_STICKY; }
        if (lm == null) {
            lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            try {
                if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 15000L, 15f, this);
                if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 30000L, 50f, this);
            } catch (SecurityException e) { stopSelf(); return START_NOT_STICKY; }
        }
        return START_STICKY;
    }

    @Override
    public void onLocationChanged(Location l) {
        if (out == null || l == null) return;
        if (l.hasAccuracy() && l.getAccuracy() > 80f) return;
        if (last != null && l.getTime() - last.getTime() < 8000L) return;
        last = l;
        try {
            FileWriter w = new FileWriter(out, true);
            boolean roam = false;
            try { TelephonyManager tm = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE); roam = tm != null && tm.isNetworkRoaming(); } catch (Throwable t) { /* unknown */ }
            w.write(l.getTime() + "," + l.getLatitude() + "," + l.getLongitude() + "," + (l.hasAccuracy() ? Math.round(l.getAccuracy()) : 0) + "," + (l.hasSpeed() ? String.format(java.util.Locale.US, "%.1f", l.getSpeed()) : "0") + "," + (roam ? 1 : 0) + "\n");
            if (roam && !notifiedRoam) { notifiedRoam = true; alert(21, "رومنگ آن ہے · Roaming is ON", "موبائل ڈیٹا مہنگا ہو سکتا ہے · Mobile data may be expensive"); }
            w.close();
        } catch (Throwable t) { /* storage full */ }
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
        try { if (lm != null) lm.removeUpdates(this); } catch (Throwable t) { /* ignore */ }
        super.onDestroy();
    }

    @Override public void onStatusChanged(String p, int s, Bundle e) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }
}
