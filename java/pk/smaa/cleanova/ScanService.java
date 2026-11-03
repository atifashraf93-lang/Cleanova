package pk.smaa.cleanova;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import com.getcapacitor.JSObject;

/** Keeps the phone scan alive in the background with a progress notification that has a Cancel button. */
public class ScanService extends Service {
    static final String CH = "cl_scan", CH_DONE = "cl_scan_done";
    static final int ID = 5511, ID_DONE = 5512;
    static final String CANCEL = "pk.smaa.cleanova.SCAN_CANCEL";
    static volatile boolean running, cancel;
    static volatile String phase = "";
    static volatile int done, total;
    static volatile JSObject result;
    static volatile long lastNote;

    static class Cancelled extends Error { Cancelled() { super("cancelled"); } }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent i, int f, int id) {
        if (i != null && CANCEL.equals(i.getAction())) { cancel = true; return START_NOT_STICKY; }
        try { startForeground(ID, build(this, "", 0, 0)); } catch (Throwable t) { stopSelf(); }
        return START_NOT_STICKY;
    }

    static String label(String ph) {
        if ("walk".equals(ph)) return "Counting files";
        if ("hash".equals(ph)) return "Matching identical files";
        if ("similar".equals(ph)) return "Comparing similar photos";
        if ("quality".equals(ph)) return "Checking photo quality";
        return "Scanning";
    }

    static Notification build(Context c, String ph, int d, int t) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Phone scan", NotificationManager.IMPORTANCE_LOW));
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(c, 1, open, fl);
        Intent ci = new Intent(c, ScanService.class).setAction(CANCEL);
        PendingIntent cp = PendingIntent.getService(c, 2, ci, fl);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
        b.setContentTitle("Cleanova scan").setContentText(label(ph) + (t > 0 ? " · " + d + " / " + t : d > 0 ? " · " + d : "")).setSmallIcon(android.R.drawable.ic_popup_sync).setOngoing(true).setOnlyAlertOnce(true).setContentIntent(pi);
        if (t > 0) b.setProgress(t, Math.min(d, t), false); else b.setProgress(0, 0, true);
        b.addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "Cancel", cp).build());
        return b.build();
    }

    static void update(Context c, String ph, int d, int t) {
        phase = ph; done = d; total = t;
        long now = System.currentTimeMillis();
        if (now - lastNote < 900 && d < t) return;
        lastNote = now;
        try { ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(ID, build(c, ph, d, t)); } catch (Throwable e) { /* ignore */ }
    }

    static void begin(Context c) {
        cancel = false; running = true; result = null; phase = "walk"; done = 0; total = 0;
        try {
            Intent s = new Intent(c, ScanService.class);
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
        } catch (Throwable t) { /* scan still runs, only without the notification */ }
    }

    static void end(Context c, String doneText) {
        running = false;
        try { c.stopService(new Intent(c, ScanService.class)); } catch (Throwable t) { /* ignore */ }
        if (doneText == null) return;
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH_DONE, "Scan finished", NotificationManager.IMPORTANCE_DEFAULT));
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            PendingIntent pi = PendingIntent.getActivity(c, 3, open, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH_DONE) : new Notification.Builder(c);
            b.setContentTitle("Cleanova scan finished").setContentText(doneText).setSmallIcon(android.R.drawable.stat_sys_download_done).setAutoCancel(true).setContentIntent(pi);
            nm.notify(ID_DONE, b.build());
        } catch (Throwable t) { /* ignore */ }
    }
}
