package pk.smaa.cleanova;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/** Optional "fast notifications": a visible low-priority notification keeps the app checking for new messages every ~20 seconds. */
public class ChatService extends Service {
    private volatile boolean run;

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent i, int f, int id) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel("cl_chat_fast", "Chat running", NotificationManager.IMPORTANCE_MIN));
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, "cl_chat_fast") : new Notification.Builder(this);
            b.setContentTitle("Cleanova Chat").setContentText("Fast notifications are on").setSmallIcon(android.R.drawable.ic_dialog_email).setOngoing(true);
            startForeground(4411, b.build());
        } catch (Throwable t) { stopSelf(); return START_NOT_STICKY; }
        if (!run) {
            run = true;
            new Thread(new Runnable() { @Override public void run() {
                while (run) {
                    try { ChatCheck.run(ChatService.this); } catch (Throwable t) { /* offline: try again */ }
                    try { Thread.sleep(20000); } catch (InterruptedException e) { break; }
                }
            } }).start();
        }
        return START_STICKY;
    }

    @Override public void onDestroy() { run = false; super.onDestroy(); }
}
