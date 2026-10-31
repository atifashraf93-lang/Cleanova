package pk.smaa.cleanova;

import android.os.Build;
import android.os.Environment;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;

/** Keeps a copy of the app's data in Documents/Cleanova so it survives uninstall. */
@CapacitorPlugin(name = "Backup")
public class BackupPlugin extends Plugin {
    private File dir() { return new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "Cleanova"); }
    private File main() { return new File(dir(), "cleanova-backup.json"); }

    private boolean allowed() {
        try { if (Build.VERSION.SDK_INT >= 30) return Environment.isExternalStorageManager(); } catch (Throwable t) { }
        return true;
    }

    @PluginMethod
    public void write(PluginCall call) {
        String text = call.getString("text", "");
        if (text.length() < 10) { call.reject("empty"); return; }
        try {
            File d = dir(); if (!d.exists()) d.mkdirs();
            File m = main(), tmp = new File(d, "cleanova-backup.tmp"), prev = new File(d, "cleanova-backup.prev.json");
            FileOutputStream o = new FileOutputStream(tmp); o.write(text.getBytes("UTF-8")); o.getFD().sync(); o.close();
            if (m.exists()) { if (prev.exists()) prev.delete(); m.renameTo(prev); }
            if (!tmp.renameTo(m)) throw new Exception("rename failed");
            JSObject r = new JSObject(); r.put("path", m.getAbsolutePath()); r.put("size", m.length()); call.resolve(r);
        } catch (Throwable t) {
            JSObject r = new JSObject(); r.put("allowed", allowed());
            call.reject("write failed: " + t + (allowed() ? "" : " (all-files access not allowed)"));
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        JSObject r = new JSObject();
        r.put("allowed", allowed());
        try {
            File m = main();
            if (!m.exists() || m.length() < 10) { File p = new File(dir(), "cleanova-backup.prev.json"); if (p.exists() && p.length() > 10) m = p; else { r.put("exists", false); r.put("path", main().getAbsolutePath()); call.resolve(r); return; } }
            FileInputStream in = new FileInputStream(m); ByteArrayOutputStream b = new ByteArrayOutputStream(); byte[] buf = new byte[16384]; int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            in.close();
            r.put("exists", true); r.put("text", b.toString("UTF-8")); r.put("mtime", m.lastModified()); r.put("path", m.getAbsolutePath());
            call.resolve(r);
        } catch (Throwable t) { r.put("exists", false); r.put("error", String.valueOf(t)); call.resolve(r); }
    }
}
