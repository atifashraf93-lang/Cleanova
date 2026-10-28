package pk.smaa.cleanova;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.BatteryManager;
import android.os.Build;
import android.os.IBinder;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.ArrayList;

/** Foreground service: records battery history and sends charge / low / heat alerts while the phone is in use or locked. */
public class MonitorService extends Service {
    static final String PREFS = "cl.mon";
    static final String CH_FG = "cl_mon_fg", CH_ALERT = "cl_mon_alert";
    private BroadcastReceiver rx;
    private long lastLog = 0;
    private int lastLevel = -1;

    static File histFile(Context c) { return new File(c.getFilesDir(), "battery-history.csv"); }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (!sp.getBoolean("on", false)) { stopSelf(); return START_NOT_STICKY; }
        channels();
        Notification n = base(CH_FG).setOngoing(true)
            .setContentTitle("Cleanova · فون مانیٹر")
            .setContentText("Battery monitor is on · بیٹری کی نگرانی جاری ہے")
            .build();
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, 0x40000000);
            else startForeground(1, n);
        } catch (Throwable t) { stopSelf(); return START_NOT_STICKY; }
        trim();
        if (rx == null) {
            rx = new BroadcastReceiver() { @Override public void onReceive(Context c, Intent i) { onBattery(i); } };
            Intent sticky = registerReceiver(rx, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (sticky != null) onBattery(sticky);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (rx != null) { try { unregisterReceiver(rx); } catch (Throwable t) { /* already gone */ } rx = null; }
        super.onDestroy();
    }

    private Notification.Builder base(String ch) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, ch) : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_lock_idle_charging);
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open != null) {
            int fl = Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
            b.setContentIntent(PendingIntent.getActivity(this, 0, open, fl));
        }
        return b;
    }

    private void channels() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.createNotificationChannel(new NotificationChannel(CH_FG, "Battery monitor", NotificationManager.IMPORTANCE_MIN));
        nm.createNotificationChannel(new NotificationChannel(CH_ALERT, "Battery alerts", NotificationManager.IMPORTANCE_HIGH));
    }

    private void alert(int id, String title, String text) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            Notification n = base(CH_ALERT).setContentTitle(title).setContentText(text).setAutoCancel(true).build();
            nm.notify(id, n);
        } catch (Throwable t) { /* notifications blocked */ }
    }

    private void onBattery(Intent b) {
        SharedPreferences sp = getSharedPreferences(PREFS, MODE_PRIVATE);
        int level = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), scale = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        if (level < 0) return;
        if (scale > 0 && scale != 100) level = Math.round(level * 100f / scale);
        int st = b.getIntExtra(BatteryManager.EXTRA_STATUS, 0);
        boolean charging = st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL;
        double temp = b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10.0;
        long now = System.currentTimeMillis();
        if (level != lastLevel || now - lastLog > 10 * 60 * 1000L) {
            lastLevel = level; lastLog = now;
            try {
                FileWriter w = new FileWriter(histFile(this), true);
                w.write(now + "," + level + "," + temp + "," + (charging ? 1 : 0) + "\n");
                w.close();
            } catch (Throwable t) { /* storage full */ }
        }
        int limit = sp.getInt("limit", 80), low = sp.getInt("low", 15), hot = sp.getInt("hot", 42);
        boolean aLimit = sp.getBoolean("aLimit", true), aLow = sp.getBoolean("aLow", true), aHot = sp.getBoolean("aHot", true);
        SharedPreferences.Editor e = sp.edit();
        if (charging) {
            if (aLimit && limit < 100 && level >= limit && !sp.getBoolean("fLimit", false)) {
                e.putBoolean("fLimit", true);
                alert(11, "بیٹری " + level + "% ہو گئی · Battery at " + level + "%", "چارجر ہٹا دیں تاکہ بیٹری کی عمر بڑھے · Unplug to protect battery life");
            }
            if (aLimit && limit >= 100 && st == BatteryManager.BATTERY_STATUS_FULL && !sp.getBoolean("fLimit", false)) {
                e.putBoolean("fLimit", true);
                alert(11, "بیٹری مکمل چارج · Battery full", "چارجر ہٹا دیں · Unplug the charger");
            }
            e.putBoolean("fLow", false);
        } else {
            e.putBoolean("fLimit", false);
            if (aLow && level <= low && !sp.getBoolean("fLow", false)) {
                e.putBoolean("fLow", true);
                alert(12, "بیٹری کم ہے: " + level + "% · Low battery: " + level + "%", "چارج پر لگائیں · Please charge your phone");
            }
            if (level > low + 5) e.putBoolean("fLow", false);
        }
        if (aHot) {
            if (temp >= hot && !sp.getBoolean("fHot", false)) {
                e.putBoolean("fHot", true);
                alert(13, "فون گرم ہے: " + temp + " °C · Phone is hot: " + temp + " °C", "چارجنگ روکیں اور ایپس بند کریں · Stop charging and close apps");
            }
            if (temp < hot - 3) e.putBoolean("fHot", false);
        }
        e.apply();
    }

    /** Keep only the last 7 days of history. */
    private void trim() {
        try {
            File f = histFile(this);
            if (!f.exists() || f.length() < 60000) return;
            long cut = System.currentTimeMillis() - 7L * 24 * 3600 * 1000;
            ArrayList<String> keep = new ArrayList<String>();
            BufferedReader r = new BufferedReader(new FileReader(f));
            String ln;
            while ((ln = r.readLine()) != null) {
                int k = ln.indexOf(',');
                if (k > 0) { try { if (Long.parseLong(ln.substring(0, k)) >= cut) keep.add(ln); } catch (NumberFormatException x) { /* skip bad line */ } }
            }
            r.close();
            FileWriter w = new FileWriter(f, false);
            for (String s : keep) w.write(s + "\n");
            w.close();
        } catch (Throwable t) { /* ignore */ }
    }
}
