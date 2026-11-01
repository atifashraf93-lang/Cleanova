package pk.smaa.cleanova;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobParameters;
import android.app.job.JobService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/** Every ~15 minutes checks the family circle for new alerts (SOS, arrivals, low battery) and shows a notification. */
public class FamilyJob extends JobService {
    static final String PREFS = "cl.famjob";
    static final String CH = "cl_family";

    @Override public boolean onStartJob(final JobParameters p) {
        new Thread(new Runnable() { @Override public void run() {
            try { check(FamilyJob.this); } catch (Throwable t) { getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString("err", String.valueOf(t)).apply(); }
            jobFinished(p, false);
        } }).start();
        return true;
    }
    @Override public boolean onStopJob(JobParameters p) { return true; }

    static void notify(Context c, int id, String title, String text) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Family alerts", NotificationManager.IMPORTANCE_HIGH));
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
            b.setContentTitle(title).setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setSmallIcon(android.R.drawable.ic_dialog_info).setAutoCancel(true).setContentIntent(pi);
            nm.notify(id, b.build());
        } catch (Throwable t) { /* notifications not allowed */ }
    }

    static String text(String type, String name, String zone) {
        if ("sos".equals(type)) return "🆘 " + name + " ne SOS bheja hai";
        if ("enter".equals(type)) return "📍 " + name + " " + zone + " pohanch gaya/gayi";
        if ("leave".equals(type)) return "📍 " + name + " " + zone + " se nikal gaya/gayi";
        if ("low".equals(type)) return "🔋 " + name + " ki battery " + zone + "% reh gayi";
        if ("stop".equals(type)) return "⚠️ " + name + " ne location sharing band kar di";
        return name;
    }

    static void check(Context c) throws Exception {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String code = p.getString("code", ""); if (code.length() == 0) return;
        Fs fs = new Fs(c); fs.token();
        String me = fs.uid();
        long seen = p.getLong("seen", System.currentTimeMillis()), max = seen;
        JSONObject r = fs.list("circles/" + code + "/events", "orderBy=ts%20desc&pageSize=15");
        JSONArray docs = r.optJSONArray("documents");
        if (docs != null) for (int i = docs.length() - 1; i >= 0; i--) {
            JSONObject d = docs.getJSONObject(i);
            long ts = Fs.lng(d, "ts");
            if (ts <= seen) continue;
            max = Math.max(max, ts);
            if (Fs.str(d, "uid").equals(me)) continue;
            String type = Fs.str(d, "type");
            notify(c, (int) (ts % 100000), "Family", text(type, Fs.str(d, "name"), Fs.str(d, "zone")));
        }
        p.edit().putLong("seen", max).apply();
        JSONObject m = fs.list("circles/" + code + "/members", "pageSize=60");
        JSONArray ms = m.optJSONArray("documents");
        long now = System.currentTimeMillis();
        if (ms != null) for (int i = 0; i < ms.length(); i++) {
            JSONObject d = ms.getJSONObject(i);
            String path = d.optString("name", ""), uid = path.substring(path.lastIndexOf('/') + 1);
            if (uid.equals(me) || !Fs.bool(d, "ok") || !"child".equals(Fs.str(d, "role")) || Fs.bool(d, "off")) continue;
            long ts = Fs.lng(d, "ts");
            if (ts > 0 && now - ts > 90 * 60000L && now - p.getLong("st_" + uid, 0) > 4 * 3600000L) {
                p.edit().putLong("st_" + uid, now).apply();
                notify(c, 90000 + (uid.hashCode() & 0xfff), "Family", "⚠️ " + Fs.str(d, "name") + " ka phone " + (now - ts) / 3600000L + " ghante se rabte mein nahi");
            }
        }
    }
}
