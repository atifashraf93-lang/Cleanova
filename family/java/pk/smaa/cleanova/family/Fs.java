package pk.smaa.cleanova.family;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

/** Minimal Firestore + anonymous sign-in client over REST (no Google Play services needed). */
final class Fs {
    static final String KEY = "AIzaSyD2G07PmgW4wqU2lZiPQIoIvRuFyOxo6xc";
    static final String PROJECT = "cleanova-5f6f5";
    static final String BASE = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents/";
    private final SharedPreferences sp;

    Fs(Context c) { sp = c.getSharedPreferences("cf.auth", Context.MODE_PRIVATE); }

    String uid() { return sp.getString("uid", ""); }
    String refreshToken() { return sp.getString("rt", ""); }

    static String http(String method, String url, String body, String ctype, String bearer) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000); c.setReadTimeout(20000);
        c.setRequestMethod(method);
        if (bearer != null) c.setRequestProperty("Authorization", "Bearer " + bearer);
        if (body != null) {
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", ctype == null ? "application/json" : ctype);
            OutputStream o = c.getOutputStream(); o.write(body.getBytes("UTF-8")); o.close();
        }
        int code = c.getResponseCode();
        InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
        StringBuilder sb = new StringBuilder();
        if (in != null) { BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8")); String ln; while ((ln = r.readLine()) != null) sb.append(ln); r.close(); }
        if (code >= 400) throw new Exception("HTTP " + code + " " + sb);
        return sb.toString();
    }

    synchronized String token() throws Exception {
        long now = System.currentTimeMillis();
        String t = sp.getString("idt", "");
        if (t.length() > 0 && now < sp.getLong("exp", 0) - 90000) return t;
        String rt = sp.getString("rt", "");
        JSONObject j;
        if (rt.length() > 0) {
            String r = http("POST", "https://securetoken.googleapis.com/v1/token?key=" + KEY, "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(rt, "UTF-8"), "application/x-www-form-urlencoded", null);
            j = new JSONObject(r);
            sp.edit().putString("idt", j.getString("id_token")).putString("rt", j.getString("refresh_token")).putString("uid", j.getString("user_id")).putLong("exp", now + Long.parseLong(j.getString("expires_in")) * 1000L).apply();
        } else {
            String r = http("POST", "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + KEY, "{\"returnSecureToken\":true}", null, null);
            j = new JSONObject(r);
            sp.edit().putString("idt", j.getString("idToken")).putString("rt", j.getString("refreshToken")).putString("uid", j.getString("localId")).putLong("exp", now + Long.parseLong(j.getString("expiresIn")) * 1000L).apply();
        }
        return sp.getString("idt", "");
    }

    JSONObject get(String path) throws Exception { return new JSONObject(http("GET", BASE + path, null, null, token())); }
    JSONObject list(String path, String query) throws Exception { return new JSONObject(http("GET", BASE + path + (query == null ? "" : "?" + query), null, null, token())); }
    JSONObject create(String coll, JSONObject fields) throws Exception { return new JSONObject(http("POST", BASE + coll, new JSONObject().put("fields", fields).toString(), null, token())); }
    JSONObject patch(String path, JSONObject fields) throws Exception {
        StringBuilder q = new StringBuilder();
        JSONArray names = fields.names();
        if (names != null) for (int i = 0; i < names.length(); i++) q.append(i == 0 ? "?" : "&").append("updateMask.fieldPaths=").append(URLEncoder.encode(names.getString(i), "UTF-8"));
        return new JSONObject(http("PATCH", BASE + path + q, new JSONObject().put("fields", fields).toString(), null, token()));
    }
    void delete(String path) throws Exception { http("DELETE", BASE + path, null, null, token()); }

    static JSONObject s(String v) throws Exception { return new JSONObject().put("stringValue", v == null ? "" : v); }
    static JSONObject i(long v) throws Exception { return new JSONObject().put("integerValue", String.valueOf(v)); }
    static JSONObject d(double v) throws Exception { return new JSONObject().put("doubleValue", v); }
    static JSONObject b(boolean v) throws Exception { return new JSONObject().put("booleanValue", v); }

    static String str(JSONObject doc, String k) { try { return doc.getJSONObject("fields").getJSONObject(k).optString("stringValue", ""); } catch (Throwable t) { return ""; } }
    static long lng(JSONObject doc, String k) { try { JSONObject o = doc.getJSONObject("fields").getJSONObject(k); return o.has("integerValue") ? Long.parseLong(o.getString("integerValue")) : (long) o.optDouble("doubleValue", 0); } catch (Throwable t) { return 0; } }
    static boolean bool(JSONObject doc, String k) { try { return doc.getJSONObject("fields").getJSONObject(k).optBoolean("booleanValue", false); } catch (Throwable t) { return false; } }
}
