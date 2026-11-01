package pk.smaa.cleanova.family;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

@CapacitorPlugin(
    name = "Family",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location"),
        @Permission(strings = { "android.permission.ACCESS_BACKGROUND_LOCATION" }, alias = "bgloc"),
        @Permission(strings = { "android.permission.POST_NOTIFICATIONS" }, alias = "notif")
    }
)
public class FamilyPlugin extends Plugin {
    private Context ctx() { return getContext(); }
    private SharedPreferences sp() { return ctx().getSharedPreferences(FamilyService.PREFS, Context.MODE_PRIVATE); }

    private JSObject state() {
        SharedPreferences p = sp();
        JSObject r = new JSObject();
        r.put("code", p.getString("code", "")); r.put("name", p.getString("name", "")); r.put("role", p.getString("role", "adult"));
        r.put("pin", p.getString("pin", "")); r.put("on", p.getBoolean("on", false)); r.put("ok", p.getBoolean("ok", false));
        r.put("loc", p.getBoolean("loc", true)); r.put("usage", p.getBoolean("usage", false));
        r.put("sent", p.getLong("sent", 0)); r.put("err", p.getString("err", "")); r.put("sosAt", p.getLong("sosAt", 0));
        r.put("pLoc", getPermissionState("location") == PermissionState.GRANTED);
        r.put("pBg", Build.VERSION.SDK_INT < 29 ? getPermissionState("location") == PermissionState.GRANTED : getPermissionState("bgloc") == PermissionState.GRANTED);
        r.put("pNotif", Build.VERSION.SDK_INT < 33 || getPermissionState("notif") == PermissionState.GRANTED);
        r.put("pUsage", FamilyService.hasUsage(ctx()));
        boolean batt = true;
        try { if (Build.VERSION.SDK_INT >= 23) batt = ((PowerManager) ctx().getSystemService(Context.POWER_SERVICE)).isIgnoringBatteryOptimizations(ctx().getPackageName()); } catch (Throwable t) { /* unknown */ }
        r.put("pBatt", batt);
        return r;
    }

    @PluginMethod public void state(PluginCall call) { call.resolve(state()); }

    @PluginMethod
    public void join(final PluginCall call) {
        final String code = call.getString("code", "").trim().toUpperCase(), name = call.getString("name", "").trim(), role = call.getString("role", "adult"), pin = call.getString("pin", "");
        if (code.length() < 6 || name.length() == 0) { call.reject("code or name missing"); return; }
        new Thread(new Runnable() { @Override public void run() {
            try {
                Fs fs = new Fs(ctx()); fs.token();
                try { fs.get("circles/" + code); } catch (Exception e) { call.reject("code not found"); return; }
                JSONObject f = new JSONObject().put("name", Fs.s(name)).put("role", Fs.s(role)).put("ok", Fs.b(false)).put("ts", Fs.i(System.currentTimeMillis())).put("joined", Fs.i(System.currentTimeMillis()));
                JSONObject res = fs.patch("circles/" + code + "/members/" + fs.uid(), f);
                sp().edit().putString("code", code).putString("name", name).putString("role", role).putString("pin", pin).putBoolean("loc", true).putBoolean("usage", "child".equals(role)).putBoolean("ok", Fs.bool(res, "ok")).remove("zin").remove("tt").apply();
                call.resolve(state());
            } catch (Throwable t) { call.reject("join failed: " + t.getMessage()); }
        } }).start();
    }

    @PluginMethod
    public void refresh(final PluginCall call) {
        new Thread(new Runnable() { @Override public void run() {
            try {
                String code = sp().getString("code", "");
                if (code.length() > 0) { Fs fs = new Fs(ctx()); fs.token(); JSONObject d = fs.get("circles/" + code + "/members/" + fs.uid()); sp().edit().putBoolean("ok", Fs.bool(d, "ok")).apply(); }
            } catch (Throwable t) { if (String.valueOf(t.getMessage()).contains("HTTP 403") || String.valueOf(t.getMessage()).contains("HTTP 404")) sp().edit().putBoolean("ok", false).apply(); }
            call.resolve(state());
        } }).start();
    }

    @PluginMethod
    public void start(PluginCall call) {
        try {
            Intent s = new Intent(ctx(), FamilyService.class);
            if (Build.VERSION.SDK_INT >= 26) ctx().startForegroundService(s); else ctx().startService(s);
            sp().edit().putBoolean("on", true).apply();
            call.resolve(state());
        } catch (Throwable t) { call.reject("start failed: " + t); }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            ctx().stopService(new Intent(ctx(), FamilyService.class));
            sp().edit().putBoolean("on", false).apply();
            if (call.getBoolean("notify", true)) FamilyService.notifyStop(ctx());
            call.resolve(state());
        } catch (Throwable t) { call.reject("stop failed: " + t); }
    }

    @PluginMethod
    public void setShare(PluginCall call) {
        SharedPreferences.Editor e = sp().edit();
        if (call.hasOption("loc")) e.putBoolean("loc", call.getBoolean("loc", true));
        if (call.hasOption("usage")) e.putBoolean("usage", call.getBoolean("usage", false));
        e.apply();
        if (sp().getBoolean("on", false)) {
            ctx().stopService(new Intent(ctx(), FamilyService.class));
            Intent s = new Intent(ctx(), FamilyService.class);
            try { if (Build.VERSION.SDK_INT >= 26) ctx().startForegroundService(s); else ctx().startService(s); } catch (Throwable t) { /* ignore */ }
        }
        call.resolve(state());
    }

    @PluginMethod public void sos(PluginCall call) { FamilyService.sos(ctx()); call.resolve(state()); }

    @PluginMethod
    public void leave(final PluginCall call) {
        new Thread(new Runnable() { @Override public void run() {
            try {
                String code = sp().getString("code", "");
                ctx().stopService(new Intent(ctx(), FamilyService.class));
                if (code.length() > 0) { try { Fs fs = new Fs(ctx()); fs.delete("circles/" + code + "/members/" + fs.uid()); } catch (Throwable t) { /* offline */ } }
                sp().edit().clear().apply();
            } catch (Throwable t) { /* ignore */ }
            call.resolve(state());
        } }).start();
    }

    @PluginMethod
    public void locRequest(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) { permCb(call); return; }
        requestPermissionForAlias("location", call, "permCb");
    }

    @PluginMethod
    public void bgRequest(PluginCall call) {
        if (Build.VERSION.SDK_INT < 29 || getPermissionState("bgloc") == PermissionState.GRANTED) { permCb(call); return; }
        requestPermissionForAlias("bgloc", call, "permCb");
    }

    @PluginMethod
    public void notifRequest(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notif") == PermissionState.GRANTED) { permCb(call); return; }
        requestPermissionForAlias("notif", call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) { call.resolve(state()); }

    @PluginMethod
    public void usageRequest(PluginCall call) { open(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)); call.resolve(state()); }

    @PluginMethod
    public void battRequest(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= 23) open(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx().getPackageName())));
        } catch (Throwable t) { open(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)); }
        call.resolve(state());
    }

    @PluginMethod
    public void appSettings(PluginCall call) { open(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx().getPackageName()))); call.resolve(state()); }

    private void open(Intent i) { try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); ctx().startActivity(i); } catch (Throwable t) { /* ignore */ } }
}
