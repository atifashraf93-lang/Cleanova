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
        final boolean wantQuality = call.getBoolean("quality", true);
        final List<String> skip = strings(call.getArray("skip"));
        scanning = true;
        new Thread(new Runnable() {
            public void run() {
                try {
                    DupEngine.Progress p = new DupEngine.Progress() {
                        public void on(String phase, int done, int total) { progress(phase, done, total); }
                    };
                    List<String> emptyDirs = new ArrayList<String>();
                    List<Item> items = DupEngine.walk(root(), p, skip, emptyDirs);
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
                    DupEngine.Extras ex = DupEngine.extras(items, root().getAbsolutePath(), System.currentTimeMillis());
                    JSArray blurry = wantQuality ? quality(items, p) : new JSArray();
                    JSObject extras = new JSObject();
                    extras.put("large", itemsJson(ex.large));
                    extras.put("wa", itemsJson(ex.wa));
                    extras.put("shots", itemsJson(ex.shots));
                    extras.put("junk", itemsJson(ex.junk));
                    extras.put("old", itemsJson(ex.old));
                    extras.put("blurry", blurry);
                    JSArray ed = new JSArray();
                    for (int i = 0; i < emptyDirs.size() && i < 500; i++) ed.put(emptyDirs.get(i));
                    extras.put("empty", ed);
                    JSArray groups = new JSArray();
                    for (Group g : exact) groups.put(groupJson(g));
                    for (Group g : sim) groups.put(groupJson(g));
                    JSObject res = new JSObject();
                    res.put("groups", groups);
                    res.put("files", items.size());
                    res.put("extras", extras);
                    scanning = false;
                    call.resolve(res);
                } catch (Throwable t) {
                    scanning = false;
                    call.reject("scan failed: " + t);
                }
            }
        }).start();
    }

    private JSArray itemsJson(List<Item> l) {
        JSArray arr = new JSArray();
        for (Item it : l) {
            JSObject i = new JSObject();
            i.put("path", it.path);
            i.put("size", it.size);
            i.put("mtime", it.mtime);
            arr.put(i);
        }
        return arr;
    }

    /** Looks at recent camera photos and returns the blurriest or darkest ones (the user reviews each). */
    private JSArray quality(List<Item> items, DupEngine.Progress p) {
        List<Item> c = new ArrayList<Item>();
        for (Item it : items) {
            String low = it.path.toLowerCase();
            if (DupEngine.isImage(it.path) && it.size >= 60 * 1024 && (low.contains("/dcim/") || low.contains("/pictures/")) && !low.contains("screenshot")) c.add(it);
        }
        java.util.Collections.sort(c, new java.util.Comparator<Item>() {
            public int compare(Item a, Item b) { return a.mtime == b.mtime ? 0 : (a.mtime < b.mtime ? 1 : -1); }
        });
        int n = Math.min(c.size(), 1500);
        List<Object[]> bad = new ArrayList<Object[]>();
        for (int i = 0; i < n; i++) {
            if ((i & 15) == 0) p.on("quality", i, n);
            Item it = c.get(i);
            try {
                BitmapFactory.Options o = new BitmapFactory.Options();
                o.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(it.path, o);
                if (o.outWidth <= 0) continue;
                int sample = 1;
                while (o.outWidth / (sample * 2) >= 128 && o.outHeight / (sample * 2) >= 128) sample *= 2;
                o.inJustDecodeBounds = false;
                o.inSampleSize = sample;
                Bitmap b = BitmapFactory.decodeFile(it.path, o);
                if (b == null) continue;
                Bitmap s = Bitmap.createScaledBitmap(b, 128, 128, true);
                int[] g = new int[128 * 128];
                long sum = 0;
                for (int y = 0; y < 128; y++) for (int x = 0; x < 128; x++) {
                    int px = s.getPixel(x, y);
                    int v = (((px >> 16) & 255) * 30 + ((px >> 8) & 255) * 59 + (px & 255) * 11) / 100;
                    g[y * 128 + x] = v; sum += v;
                }
                if (s != b) s.recycle();
                b.recycle();
                double mean = sum / (128.0 * 128.0), lv = DupEngine.lapVar(g, 128, 128);
                if (mean < 30) bad.add(new Object[] { it, "dark", mean });
                else if (lv < 25) bad.add(new Object[] { it, "blur", lv * 4 });
            } catch (Throwable t) { /* skip this photo */ }
        }
        java.util.Collections.sort(bad, new java.util.Comparator<Object[]>() {
            public int compare(Object[] a, Object[] b) { return Double.compare((Double) a[2], (Double) b[2]); }
        });
        JSArray out = new JSArray();
        for (int i = 0; i < bad.size() && i < 200; i++) {
            Item it = (Item) bad.get(i)[0];
            JSObject o = new JSObject();
            o.put("path", it.path); o.put("size", it.size); o.put("mtime", it.mtime); o.put("reason", (String) bad.get(i)[1]);
            out.put(o);
        }
        p.on("quality", n, n);
        return out;
    }

    @PluginMethod
    public void dirs(PluginCall call) {
        JSArray arr = new JSArray();
        File[] l = root().listFiles();
        if (l != null) {
            java.util.Arrays.sort(l);
            for (File f : l) {
                String n = f.getName();
                if (f.isDirectory() && !n.startsWith(".") && !n.equals("Android")) { JSObject o = new JSObject(); o.put("name", n); o.put("path", f.getAbsolutePath()); arr.put(o); }
            }
        }
        JSObject r = new JSObject();
        r.put("dirs", arr);
        call.resolve(r);
    }

    @PluginMethod
    public void deleteEmptyDirs(final PluginCall call) {
        if (!hasAccess()) { call.reject("no access"); return; }
        final List<String> paths = strings(call.getArray("paths"));
        new Thread(new Runnable() {
            public void run() {
                int n = 0;
                for (String p : paths) {
                    File f = new File(p);
                    String[] kids = f.list();
                    if (f.isDirectory() && kids != null && kids.length == 0 && f.delete()) n++; /* only truly empty folders */
                }
                JSObject r = new JSObject();
                r.put("deleted", n);
                call.resolve(r);
            }
        }).start();
    }

    @PluginMethod
    public void trashPurge(final PluginCall call) {
        final long days = call.getInt("days", 30);
        new Thread(new Runnable() {
            public void run() {
                try { if (hasAccess() && days > 0) trash().purgeOlderThan(days * 86400000L); } catch (Throwable t) { /* ignore */ }
                call.resolve();
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
