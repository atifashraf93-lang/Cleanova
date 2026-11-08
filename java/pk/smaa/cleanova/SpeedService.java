package pk.smaa.cleanova;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Shows the current GPS speed outside the app: an ongoing notification and, if allowed, a small floating circle over other apps.
 * Started only by the user from the speed screen. Nothing is stored or sent anywhere. Stops from the notification button or a long press on the circle.
 */
public class SpeedService extends Service implements LocationListener {
    static final String CH = "cl_speed";
    static final String ACT_STOP = "pk.smaa.cleanova.SPEED_STOP";
    static final int NID = 7301;
    static volatile boolean running = false;
    static volatile float lastKmh = 0f;

    private LocationManager lm;
    private NotificationManager nm;
    private WindowManager wm;
    private View bubble;
    private TextView bubNum, bubUnit;
    private GradientDrawable bubBg;
    private WindowManager.LayoutParams lp;
    private Location last;
    private boolean mph = false, wantBubble = false;
    private int limit = 0;
    private long lastNote = 0, lastBeep = 0;
    private int shownVal = -1;

    @Override public IBinder onBind(Intent i) { return null; }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACT_STOP.equals(intent.getAction())) { stopSelf(); return START_NOT_STICKY; }
        if (intent != null) {
            mph = intent.getBooleanExtra("mph", false);
            limit = intent.getIntExtra("limit", 0);
            wantBubble = intent.getBooleanExtra("bubble", false);
        }
        nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Speed", NotificationManager.IMPORTANCE_LOW));
        try {
            Notification n = note(0, false);
            if (Build.VERSION.SDK_INT >= 29) startForeground(NID, n, 8); else startForeground(NID, n);
        } catch (Throwable t) { running = false; stopSelf(); return START_NOT_STICKY; }
        running = true;
        if (lm == null) lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        try {
            lm.removeUpdates(this);
            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, this);
        } catch (SecurityException e) { running = false; stopSelf(); return START_NOT_STICKY; }
        showBubble(wantBubble);
        return START_NOT_STICKY;
    }

    private Notification note(int val, boolean over) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        String unit = mph ? "mph" : "km/h";
        b.setSmallIcon(android.R.drawable.ic_menu_mylocation).setOngoing(true).setOnlyAlertOnce(true)
            .setContentTitle(val + " " + unit + (over ? "  ⚠" : ""))
            .setContentText((limit > 0 ? "حد " + limit + " · " : "") + "Cleanova Life · رفتار");
        if (Build.VERSION.SDK_INT >= 21) b.setColor(over ? 0xFFE5484D : 0xFF1FA37A);
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open != null) b.setContentIntent(PendingIntent.getActivity(this, 0, open, Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        Intent stop = new Intent(this, SpeedService.class).setAction(ACT_STOP);
        PendingIntent sp = PendingIntent.getService(this, 1, stop, Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        if (Build.VERSION.SDK_INT >= 23) b.addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "روکیں / Stop", sp).build());
        else b.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", sp);
        return b.build();
    }

    private void showBubble(boolean on) {
        try {
            if (!on) { hideBubble(); return; }
            if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) { hideBubble(); return; }
            if (bubble != null) return;
            wm = (WindowManager) getSystemService(WINDOW_SERVICE);
            LinearLayout root = new LinearLayout(this);
            root.setOrientation(LinearLayout.VERTICAL);
            root.setGravity(Gravity.CENTER);
            bubBg = new GradientDrawable();
            bubBg.setShape(GradientDrawable.OVAL);
            bubBg.setColor(0xE61FA37A);
            bubBg.setStroke(dp(2), 0x66FFFFFF);
            root.setBackground(bubBg);
            bubNum = new TextView(this);
            bubNum.setTextColor(Color.WHITE);
            bubNum.setTextSize(26);
            bubNum.setTypeface(Typeface.DEFAULT_BOLD);
            bubNum.setGravity(Gravity.CENTER);
            bubNum.setText("0");
            bubUnit = new TextView(this);
            bubUnit.setTextColor(0xCCFFFFFF);
            bubUnit.setTextSize(10);
            bubUnit.setGravity(Gravity.CENTER);
            bubUnit.setText(mph ? "mph" : "km/h");
            root.addView(bubNum);
            root.addView(bubUnit);
            int size = dp(84);
            int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
            lp = new WindowManager.LayoutParams(size, size, type, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, PixelFormat.TRANSLUCENT);
            lp.gravity = Gravity.TOP | Gravity.START;
            SharedPreferences sp = getSharedPreferences("cl.speed", MODE_PRIVATE);
            lp.x = sp.getInt("x", dp(16));
            lp.y = sp.getInt("y", dp(140));
            root.setOnTouchListener(new View.OnTouchListener() {
                float dx, dy; int sx, sy; boolean moved; long down;
                @Override public boolean onTouch(View v, MotionEvent e) {
                    switch (e.getAction()) {
                        case MotionEvent.ACTION_DOWN: dx = e.getRawX(); dy = e.getRawY(); sx = lp.x; sy = lp.y; moved = false; down = System.currentTimeMillis(); return true;
                        case MotionEvent.ACTION_MOVE:
                            if (Math.abs(e.getRawX() - dx) > dp(8) || Math.abs(e.getRawY() - dy) > dp(8)) moved = true;
                            if (moved) { lp.x = sx + Math.round(e.getRawX() - dx); lp.y = sy + Math.round(e.getRawY() - dy); try { wm.updateViewLayout(bubble, lp); } catch (Throwable t) { /* gone */ } }
                            return true;
                        case MotionEvent.ACTION_UP:
                            if (moved) { getSharedPreferences("cl.speed", MODE_PRIVATE).edit().putInt("x", lp.x).putInt("y", lp.y).apply(); }
                            else if (System.currentTimeMillis() - down > 800) { stopSelf(); }
                            else { Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName()); if (open != null) { open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(open); } }
                            return true;
                        default: return false;
                    }
                }
            });
            wm.addView(root, lp);
            bubble = root;
        } catch (Throwable t) { bubble = null; }
    }

    private void hideBubble() {
        try { if (bubble != null && wm != null) wm.removeView(bubble); } catch (Throwable t) { /* ignore */ }
        bubble = null;
    }

    @Override
    public void onLocationChanged(Location l) {
        if (l == null) return;
        float v = l.hasSpeed() ? l.getSpeed() : 0f;
        if (!l.hasSpeed() && last != null) { float dt = (l.getTime() - last.getTime()) / 1000f; if (dt > 0.5f) v = l.distanceTo(last) / dt; }
        if (l.hasAccuracy() && l.getAccuracy() > 60f) v = 0f;
        if (v < 0.6f) v = 0f;
        last = l;
        float kmh = v * 3.6f;
        lastKmh = kmh;
        int val = Math.round(mph ? v * 2.23694f : kmh);
        boolean over = limit > 0 && val > limit;
        boolean near = limit > 0 && val > limit - 10 && !over;
        long now = System.currentTimeMillis();
        if (val != shownVal || now - lastNote > 5000) {
            shownVal = val; lastNote = now;
            try { nm.notify(NID, note(val, over)); } catch (Throwable t) { /* ignore */ }
        }
        if (bubble != null && bubNum != null) {
            bubNum.setText(String.valueOf(val));
            bubBg.setColor(over ? 0xE6E5484D : near ? 0xE6D98A1E : 0xE61FA37A);
        }
        if (over && now - lastBeep > 4000) {
            lastBeep = now;
            try { new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80).startTone(ToneGenerator.TONE_PROP_BEEP, 300); } catch (Throwable t) { /* no sound */ }
            try { Vibrator vb = (Vibrator) getSystemService(VIBRATOR_SERVICE); if (vb != null) vb.vibrate(300); } catch (Throwable t) { /* ignore */ }
        }
    }

    @Override public void onStatusChanged(String p, int s, Bundle b) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }

    @Override
    public void onDestroy() {
        running = false; lastKmh = 0f;
        try { if (lm != null) lm.removeUpdates(this); } catch (Throwable t) { /* ignore */ }
        hideBubble();
        super.onDestroy();
    }
}
