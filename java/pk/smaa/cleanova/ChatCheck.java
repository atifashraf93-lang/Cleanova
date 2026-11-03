package pk.smaa.cleanova;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/** Looks for new chat messages in the user's rooms and shows a notification (used by the 15-minute job and the optional fast service). */
final class ChatCheck {
    static final String PREFS = "cl.chat";
    static final String CH = "cl_chat";

    static boolean quietNow(String q) {
        try {
            if (q == null || q.length() < 11) return false;
            String[] a = q.split("-"); String[] f = a[0].split(":"), t = a[1].split(":");
            int from = Integer.parseInt(f[0]) * 60 + Integer.parseInt(f[1]), to = Integer.parseInt(t[0]) * 60 + Integer.parseInt(t[1]);
            Calendar c = Calendar.getInstance(); int n = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
            return from <= to ? (n >= from && n < to) : (n >= from || n < to);
        } catch (Throwable t) { return false; }
    }

    static void notify(Context c, int id, String title, String text, String room) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Chat messages", NotificationManager.IMPORTANCE_HIGH));
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            if (open != null && room != null) open.putExtra("cl_room", room);
            PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
            b.setContentTitle(title).setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setSmallIcon(android.R.drawable.ic_dialog_email).setAutoCancel(true).setContentIntent(pi).setGroup("cl_chat_group").setDefaults(Notification.DEFAULT_ALL);
            nm.notify(id, b.build());
        } catch (Throwable t) { /* notifications not allowed */ }
    }

    static String preview(JSONObject d) {
        String k = Fs.str(d, "k");
        if ("img".equals(k)) return "📷 Photo";
        if ("voice".equals(k)) return "🎤 Voice note";
        if ("loc".equals(k)) return "📍 Location";
        if ("poll".equals(k)) return "📊 " + Fs.str(d, "t");
        if ("event".equals(k)) return "📅 " + Fs.str(d, "t");
        if ("list".equals(k)) return "✅ " + Fs.str(d, "t");
        if ("exp".equals(k)) return "💸 " + Fs.str(d, "t");
        String t = Fs.str(d, "t");
        return t.length() > 120 ? t.substring(0, 120) + "…" : t;
    }

    static void run(Context c) throws Exception {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit().putLong("lastRun", System.currentTimeMillis()).apply();
        JSONArray rooms = new JSONArray(p.getString("rooms", "[]"));
        if (rooms.length() == 0) return;
        JSONArray muted = new JSONArray(p.getString("muted", "[]"));
        boolean quiet = quietNow(p.getString("quiet", ""));
        boolean fg = System.currentTimeMillis() - p.getLong("fgTs", 0) < 45000;
        Fs fs = new Fs(c); fs.token();
        String me = fs.uid();
        for (int r = 0; r < rooms.length(); r++) {
            JSONObject room = rooms.getJSONObject(r);
            String code = room.getString("c"), name = room.optString("n", "Chat");
            long seen = p.getLong("seen_" + code, 0);
            if (seen == 0) { p.edit().putLong("seen_" + code, System.currentTimeMillis()).apply(); continue; }
            JSONObject q = new JSONObject()
                .put("from", new JSONArray().put(new JSONObject().put("collectionId", "msgs")))
                .put("where", new JSONObject().put("fieldFilter", new JSONObject().put("field", new JSONObject().put("fieldPath", "ts")).put("op", "GREATER_THAN").put("value", Fs.i(seen))))
                .put("orderBy", new JSONArray().put(new JSONObject().put("field", new JSONObject().put("fieldPath", "ts")).put("direction", "ASCENDING")))
                .put("limit", 15);
            JSONArray res = fs.query("rooms/" + code, q);
            long max = seen; int n = 0; String last = "", who = ""; StringBuilder lines = new StringBuilder();
            for (int i = 0; i < res.length(); i++) {
                JSONObject d = res.getJSONObject(i).optJSONObject("document");
                if (d == null) continue;
                long ts = Fs.lng(d, "ts"); max = Math.max(max, ts);
                if (Fs.str(d, "uid").equals(me) || "sys".equals(Fs.str(d, "k"))) continue;
                n++; who = Fs.str(d, "n"); last = room.optBoolean("p", false) ? "" : preview(d);
                if (n <= 5 && !room.optBoolean("p", false)) lines.append(lines.length() > 0 ? "\n" : "").append(who).append(": ").append(last);
            }
            p.edit().putLong("seen_" + code, max).apply();
            boolean isMuted = false;
            for (int i = 0; i < muted.length(); i++) if (code.equals(muted.optString(i))) isMuted = true;
            if (n > 0 && !quiet && !isMuted && !fg) {
                String text = room.optBoolean("p", false) ? (n + " new message(s)") : (n == 1 ? who + ": " + last : lines.toString());
                notify(c, 40000 + (code.hashCode() & 0xfff), n > 1 ? name + " (" + n + ")" : name, text, code);
            }
        }
    }
}
