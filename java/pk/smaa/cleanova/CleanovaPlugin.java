package pk.smaa.cleanova;

import android.Manifest;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.provider.Settings;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

import pk.smaa.cleanova.DupEngine.Group;
import pk.smaa.cleanova.DupEngine.Item;
import pk.smaa.cleanova.DupEngine.TrashRec;

@CapacitorPlugin(
    name = "Cleanova",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage")
    }
)
public class CleanovaPlugin extends Plugin {

    private static final long TRASH_DAYS_MS = 30L * 24 * 60 * 60 * 1000;
    private volatile boolean scanning = false;

    private File root() { return Environment.getExternalStorageDirectory(); }
    private DupEngine.Trash trash() { return new DupEngine.Trash(new File(root(), ".CleanovaTrash")); }

    private boolean hasAccess() {
        if (Build.VERSION.SDK_INT >= 30) return Environment.isExternalStorageManager();
        return getPermissionState("storage") == PermissionState.GRANTED;
    }

    @Override
    public void load() {
        new Thread(new Runnable() {
            public void run() {
                try { if (hasAccess()) trash().purgeOlderThan(TRASH_DAYS_MS); } catch (Throwable t) { /* ignore */ }
            }
        }).start();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", hasAccess());
        r.put("sdk", Build.VERSION.SDK_INT);
        try {
            StatFs s = new StatFs(root().getAbsolutePath());
            r.put("free", s.getAvailableBytes());
            r.put("total", s.getTotalBytes());
        } catch (Throwable t) { /* ignore */ }
        call.resolve(r);
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                Intent i = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            } catch (Throwable t) {
                Intent i = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            }
            call.resolve();
        } else {
            requestPermissionForAlias("storage", call, "permCallback");
        }
    }

    @PermissionCallback
    private void permCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", hasAccess());
        call.resolve(r);
    }

    private void progress(String phase, int done, int total) {
        JSObject o = new JSObject();
        o.put("phase", phase);
        o.put("done", done);
        o.put("total", total);
        notifyListeners("progress", o);
    }

    private static long dhash(File f) {
        try {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(f.getAbsolutePath(), o);
            if (o.outWidth <= 0 || o.outHeight <= 0) return 0;
            int sample = 1;
            while (o.outWidth / (sample * 2) >= 64 && o.outHeight / (sample * 2) >= 64) sample *= 2;
            o.inJustDecodeBounds = false;
            o.inSampleSize = sample;
            Bitmap b = BitmapFactory.decodeFile(f.getAbsolutePath(), o);
            if (b == null) return 0;
            Bitmap s = Bitmap.createScaledBitmap(b, 9, 8, true);
            int[] g = new int[72];
            int min = 255, max = 0;
            for (int y = 0; y < 8; y++) {
                for (int x = 0; x < 9; x++) {
                    int px = s.getPixel(x, y);
                    int v = (((px >> 16) & 255) * 30 + ((px >> 8) & 255) * 59 + (px & 255) * 11) / 100;
                    g[y * 9 + x] = v;
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
            }
            if (s != b) s.recycle();
            b.recycle();
            if (max - min < 12) return 0; /* flat image: no detail to compare */
            long h = 0;
            int bit = 0;
            for (int y = 0; y < 8; y++) {
                for (int x = 0; x < 8; x++) {
                    if (g[y * 9 + x] > g[y * 9 + x + 1]) h |= 1L << bit;
                    bit++;
                }
            }
            return h;
        } catch (Throwable t) {
            return 0;
        }
    }

    @PluginMethod
    public void scan(final PluginCall call) {
        if (!hasAccess()) { call.reject("no access"); return; }
        if (scanning) { call.reject("busy"); return; }
        final boolean wantSimilar = call.getBoolean("similar", true);
        scanning = true;
        new Thread(new Runnable() {
            public void run() {
                try {
                    DupEngine.Progress p = new DupEngine.Progress() {
                        public void on(String phase, int done, int total) { progress(phase, done, total); }
                    };
                    List<Item> items = DupEngine.walk(root(), p);
                    List<Group> exact = DupEngine.exact(items, p);
                    List<Group> sim = new ArrayList<Group>();
                    if (wantSimilar) {
                        java.util.HashSet<String> inExact = new java.util.HashSet<String>();
                        java.util.HashSet<String> skip = new java.util.HashSet<String>();
                        for (Group g : exact) {
                            for (int i = 0; i < g.items.size(); i++) {
                                inExact.add(g.items.get(i).path);
                                if (i > 0) skip.add(g.items.get(i).path); /* keep one copy of each exact group as the representative */
                            }
                        }
                        List<Item> imgs = new ArrayList<Item>();
                        for (Item it : items) if (DupEngine.isImage(it.path) && !skip.contains(it.path)) imgs.add(it);
                        sim = DupEngine.similar(imgs, new DupEngine.Hasher() {
                            public long dhash(File f) { return CleanovaPlugin.dhash(f); }
                        }, 6, p);
                    }
                    JSArray groups = new JSArray();
                    for (Group g : exact) groups.put(groupJson(g));
                    for (Group g : sim) groups.put(groupJson(g));
                    JSObject res = new JSObject();
                    res.put("groups", groups);
                    res.put("files", items.size());
                    scanning = false;
                    call.resolve(res);
                } catch (Throwable t) {
                    scanning = false;
                    call.reject("scan failed: " + t);
                }
            }
        }).start();
    }

    private JSObject groupJson(Group g) {
        JSObject o = new JSObject();
        o.put("type", g.type);
        o.put("size", g.size);
        JSArray arr = new JSArray();
        for (Item it : g.items) {
            JSObject i = new JSObject();
            i.put("path", it.path);
            i.put("size", it.size);
            i.put("mtime", it.mtime);
            arr.put(i);
        }
        o.put("items", arr);
        return o;
    }

    @PluginMethod
    public void thumbnail(final PluginCall call) {
        final String path = call.getString("path", "");
        final int size = call.getInt("size", 160);
        new Thread(new Runnable() {
            public void run() {
                JSObject r = new JSObject();
                r.put("data", "");
                try {
                    Bitmap b = null;
                    String e = DupEngine.ext(path);
                    if (DupEngine.isImage(path)) {
                        BitmapFactory.Options o = new BitmapFactory.Options();
                        o.inJustDecodeBounds = true;
                        BitmapFactory.decodeFile(path, o);
                        int sample = 1;
                        while (o.outWidth / (sample * 2) >= size && o.outHeight / (sample * 2) >= size) sample *= 2;
                        o.inJustDecodeBounds = false;
                        o.inSampleSize = sample;
                        b = BitmapFactory.decodeFile(path, o);
                    } else if (e.equals("mp4") || e.equals("mkv") || e.equals("3gp") || e.equals("mov") || e.equals("webm") || e.equals("avi")) {
                        MediaMetadataRetriever m = new MediaMetadataRetriever();
                        try {
                            m.setDataSource(path);
                            b = m.getFrameAtTime(1000000);
                            if (b == null) b = m.getFrameAtTime();
                        } finally { try { m.release(); } catch (Throwable t) { /* ignore */ } }
                    }
                    if (b != null) {
                        int w = b.getWidth(), h = b.getHeight();
                        float sc = Math.min(1f, (float) size / Math.max(w, h));
                        Bitmap s = sc < 1f ? Bitmap.createScaledBitmap(b, Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)), true) : b;
                        ByteArrayOutputStream bo = new ByteArrayOutputStream();
                        s.compress(Bitmap.CompressFormat.JPEG, 70, bo);
                        r.put("data", "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP));
                        if (s != b) s.recycle();
                        b.recycle();
                    }
                } catch (Throwable t) { /* no thumbnail */ }
                call.resolve(r);
            }
        }).start();
    }

    private List<String> strings(JSArray a) {
        List<String> out = new ArrayList<String>();
        if (a == null) return out;
        for (int i = 0; i < a.length(); i++) {
            try { out.add(a.getString(i)); } catch (Throwable t) { /* skip */ }
        }
        return out;
    }

    private void rescan(List<String> paths) {
        try {
            MediaScannerConnection.scanFile(getContext(), paths.toArray(new String[0]), null, null);
        } catch (Throwable t) { /* ignore */ }
    }

    @PluginMethod
    public void trashMove(final PluginCall call) {
        if (!hasAccess()) { call.reject("no access"); return; }
        final List<String> paths = strings(call.getArray("paths"));
        new Thread(new Runnable() {
            public void run() {
                try {
                    List<TrashRec> moved = trash().moveAll(paths);
                    long bytes = 0;
                    List<String> touched = new ArrayList<String>();
                    for (TrashRec r : moved) { bytes += r.size; touched.add(r.original); touched.add(r.stored); }
                    rescan(touched);
                    JSObject res = new JSObject();
                    res.put("moved", moved.size());
                    res.put("bytes", bytes);
                    call.resolve(res);
                } catch (Throwable t) { call.reject("move failed: " + t); }
            }
        }).start();
    }

    @PluginMethod
    public void trashList(PluginCall call) {
        try {
            JSArray arr = new JSArray();
            long total = 0;
            for (TrashRec r : trash().list()) {
                JSObject o = new JSObject();
                o.put("id", r.id);
                o.put("path", r.stored);
                o.put("original", r.original);
                o.put("size", r.size);
                o.put("ts", r.ts);
                arr.put(o);
                total += r.size;
            }
            JSObject res = new JSObject();
            res.put("items", arr);
            res.put("bytes", total);
            call.resolve(res);
        } catch (Throwable t) { call.reject("list failed: " + t); }
    }

    @PluginMethod
    public void trashRestore(final PluginCall call) {
        final List<String> ids = strings(call.getArray("ids"));
        new Thread(new Runnable() {
            public void run() {
                try {
                    List<String> back = trash().restore(ids);
                    rescan(back);
                    JSObject res = new JSObject();
                    res.put("restored", back.size());
                    call.resolve(res);
                } catch (Throwable t) { call.reject("restore failed: " + t); }
            }
        }).start();
    }

    @PluginMethod
    public void trashEmpty(final PluginCall call) {
        final JSArray idsArr = call.getArray("ids");
        new Thread(new Runnable() {
            public void run() {
                try {
                    long freed = trash().purge(idsArr == null ? null : strings(idsArr));
                    JSObject res = new JSObject();
                    res.put("freed", freed);
                    call.resolve(res);
                } catch (Throwable t) { call.reject("empty failed: " + t); }
            }
        }).start();
    }
}
