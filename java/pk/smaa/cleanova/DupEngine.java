package pk.smaa.cleanova;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Pure Java duplicate finder (no Android classes) so it can be tested on a normal computer. */
public class DupEngine {

    public interface Progress { void on(String phase, int done, int total); }

    /** Returns a 64-bit perceptual hash of an image, or 0 if the image cannot be read or has no detail. */
    public interface Hasher { long dhash(File f); }

    public static class Item {
        public String path;
        public long size;
        public long mtime;
        Item(String p, long s, long m) { path = p; size = s; mtime = m; }
    }

    public static class Group {
        public String type; /* exact | similar */
        public List<Item> items = new ArrayList<Item>();
        public long size;   /* size of one copy */
        Group(String t) { type = t; }
    }

    public static final long MIN_SIZE = 1024;
    private static final Set<String> IMAGE_EXT = new HashSet<String>(Arrays.asList("jpg", "jpeg", "png", "webp", "bmp", "heic", "heif"));

    public static String ext(String name) {
        int i = name.lastIndexOf('.');
        return i < 0 ? "" : name.substring(i + 1).toLowerCase();
    }
    public static boolean isImage(String path) { return IMAGE_EXT.contains(ext(path)); }

    /* ---------- walk ---------- */
    public static List<Item> walk(File root, Progress p) { return walk(root, p, null, null); }

    /** skip: absolute folder paths never entered. emptyOut (optional): receives folders that contain nothing at all. */
    public static List<Item> walk(File root, Progress p, List<String> skip, List<String> emptyOut) {
        List<Item> out = new ArrayList<Item>();
        ArrayList<File> stack = new ArrayList<File>();
        stack.add(root);
        Set<String> seenDirs = new HashSet<String>();
        Set<String> skipSet = new HashSet<String>();
        if (skip != null) skipSet.addAll(skip);
        Set<String> keepRoot = new HashSet<String>(Arrays.asList("DCIM", "Download", "Pictures", "Movies", "Music", "Documents", "Alarms", "Notifications", "Ringtones", "Podcasts", "Audiobooks", "Recordings", "Android"));
        int dirs = 0;
        while (!stack.isEmpty()) {
            File d = stack.remove(stack.size() - 1);
            try {
                String canon = d.getCanonicalPath();
                if (!seenDirs.add(canon)) continue;
            } catch (IOException e) { continue; }
            File[] list = d.listFiles();
            if (list == null) continue;
            if (list.length == 0 && emptyOut != null && !d.equals(root) && !(d.getParentFile() != null && d.getParentFile().equals(root) && keepRoot.contains(d.getName()))) emptyOut.add(d.getAbsolutePath());
            if ((++dirs & 63) == 0 && p != null) p.on("walk", out.size(), 0);
            for (File f : list) {
                String n = f.getName();
                if (n.startsWith(".")) continue;                       /* hidden files and folders, thumbnails, our own trash */
                if (f.isDirectory()) {
                    if (skipSet.contains(f.getAbsolutePath())) continue;
                    if (d.equals(root) && n.equals("Android")) {         /* other apps' private data; only Android/media (WhatsApp lives there on new phones) */
                        File m = new File(f, "media");
                        if (m.isDirectory() && !skipSet.contains(m.getAbsolutePath())) stack.add(m);
                        continue;
                    }
                    if (Files.isSymbolicLink(f.toPath())) continue;
                    stack.add(f);
                } else if (f.isFile()) {
                    long len = f.length();
                    if (len < MIN_SIZE) continue;
                    if (Files.isSymbolicLink(f.toPath())) continue;
                    out.add(new Item(f.getAbsolutePath(), len, f.lastModified()));
                }
            }
        }
        if (p != null) p.on("walk", out.size(), out.size());
        return out;
    }

    /* ---------- extra lists: large files, WhatsApp, screenshots, junk, old downloads ---------- */
    public static class Extras {
        public List<Item> large = new ArrayList<Item>(), wa = new ArrayList<Item>(), shots = new ArrayList<Item>(),
            junk = new ArrayList<Item>(), old = new ArrayList<Item>();
        public List<String> junkReason = new ArrayList<String>();
    }
    private static final Set<String> TMP_EXT = new HashSet<String>(Arrays.asList("tmp", "temp", "bak", "crdownload", "part", "log", "old", "dmp"));
    private static final Comparator<Item> BY_SIZE_DESC = new Comparator<Item>() {
        public int compare(Item a, Item b) { return a.size == b.size ? 0 : (a.size < b.size ? 1 : -1); }
    };
    private static void cap(List<Item> l, int n) { Collections.sort(l, BY_SIZE_DESC); while (l.size() > n) l.remove(l.size() - 1); }

    public static Extras extras(List<Item> items, String rootPath, long now) {
        Extras x = new Extras();
        String dl = (rootPath + "/Download/").toLowerCase();
        for (Item it : items) {
            String low = it.path.toLowerCase(), e = ext(low);
            if (it.size >= 50L * 1024 * 1024) x.large.add(it);
            boolean wa = (low.contains("/whatsapp/media/") || low.contains("/whatsapp business/media/")) && !low.contains("stickers") && !low.contains("profile photos") && !low.contains("/.statuses/");
            if (wa && now - it.mtime > 14L * 86400000) x.wa.add(it);
            if (low.contains("screenshot") && (e.equals("png") || e.equals("jpg") || e.equals("jpeg") || e.equals("webp"))) x.shots.add(it);
            if (TMP_EXT.contains(e) || e.equals("apk")) { x.junk.add(it); }
            if (low.startsWith(dl) && now - it.mtime > 30L * 86400000) x.old.add(it);
        }
        cap(x.large, 200); cap(x.wa, 8000); cap(x.shots, 5000); cap(x.junk, 3000); cap(x.old, 3000);
        return x;
    }

    /** Variance of a 4-neighbour Laplacian over a grayscale image (low = blurry). */
    public static double lapVar(int[] g, int w, int h) {
        double sum = 0, sum2 = 0; int n = 0;
        for (int y = 1; y < h - 1; y++) for (int x = 1; x < w - 1; x++) {
            int c = g[y * w + x];
            double l = 4 * c - g[y * w + x - 1] - g[y * w + x + 1] - g[(y - 1) * w + x] - g[(y + 1) * w + x];
            sum += l; sum2 += l * l; n++;
        }
        if (n == 0) return 1e9;
        double m = sum / n;
        return sum2 / n - m * m;
    }


    /* ---------- duplicate contacts ---------- */
    public static class ContactRec {
        public long id; public String name; public List<String> numbers = new ArrayList<String>();
        public ContactRec(long id, String name) { this.id = id; this.name = name == null ? "" : name; }
    }
    public static class ContactGroup {
        public String reason; /* number | name */
        public List<ContactRec> contacts = new ArrayList<ContactRec>();
    }
    /** Digits only; the last 10 digits identify a number whether it is written 0300..., +92300... or 0092300.... Too-short numbers are ignored. */
    public static String normNumber(String n) {
        if (n == null) return "";
        StringBuilder d = new StringBuilder();
        for (int i = 0; i < n.length(); i++) { char c = n.charAt(i); if (c >= '0' && c <= '9') d.append(c); }
        String x = d.toString();
        if (x.length() < 7) return "";
        return x.length() > 10 ? x.substring(x.length() - 10) : x;
    }
    public static String normName(String n) { return n == null ? "" : n.trim().toLowerCase().replaceAll("\\s+", " "); }

    public static List<ContactGroup> contactGroups(List<ContactRec> all) {
        int n = all.size();
        int[] p = new int[n];
        for (int i = 0; i < n; i++) p[i] = i;
        Map<String, Integer> byNum = new HashMap<String, Integer>(), byName = new HashMap<String, Integer>();
        boolean[] numLinked = new boolean[n];
        List<int[]> numEdges = new ArrayList<int[]>();
        for (int i = 0; i < n; i++) {
            ContactRec c = all.get(i);
            for (String raw : c.numbers) {
                String k = normNumber(raw); if (k.isEmpty()) continue;
                Integer j = byNum.get(k);
                if (j == null) byNum.put(k, i); else if (j != i) { union(p, i, j); numEdges.add(new int[] { i, j }); }
            }
        }
        for (int[] e : numEdges) { numLinked[e[0]] = true; numLinked[e[1]] = true; }
        for (int i = 0; i < n; i++) {
            String k = normName(all.get(i).name);
            if (k.length() < 2) continue;
            Integer j = byName.get(k);
            if (j == null) byName.put(k, i); else union(p, i, j);
        }
        Map<Integer, ContactGroup> gs = new LinkedHashMap<Integer, ContactGroup>();
        for (int i = 0; i < n; i++) {
            int r = find(p, i);
            ContactGroup g = gs.get(r);
            if (g == null) { g = new ContactGroup(); g.reason = "name"; gs.put(r, g); }
            g.contacts.add(all.get(i));
            if (numLinked[i]) g.reason = "number";
        }
        List<ContactGroup> out = new ArrayList<ContactGroup>();
        for (ContactGroup g : gs.values()) {
            if (g.contacts.size() < 2) continue;
            Collections.sort(g.contacts, new Comparator<ContactRec>() {
                public int compare(ContactRec a, ContactRec b) { return b.numbers.size() - a.numbers.size(); }
            });
            out.add(g);
        }
        return out;
    }
    private static void union(int[] p, int a, int b) { int ra = find(p, a), rb = find(p, b); if (ra != rb) p[ra] = rb; }

    /* ---------- exact copies ---------- */
    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder(b.length * 2);
        for (int i = 0; i < b.length; i++) s.append(String.format("%02x", b[i] & 0xff));
        return s.toString();
    }

    /** Hash of size + 3 chunks (start, middle, end). Cheap pre-filter for large files. */
    private static String sampleHash(File f, long size) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.update(Long.toString(size).getBytes("UTF-8"));
        RandomAccessFile r = new RandomAccessFile(f, "r");
        try {
            int chunk = 128 * 1024;
            byte[] buf = new byte[chunk];
            long[] offs = { 0, Math.max(0, size / 2 - chunk / 2), Math.max(0, size - chunk) };
            for (long off : offs) {
                r.seek(off);
                int n = r.read(buf, 0, (int) Math.min(chunk, size - off));
                if (n > 0) md.update(buf, 0, n);
            }
        } finally { r.close(); }
        return hex(md.digest());
    }

    private static String fullHash(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        FileInputStream in = new FileInputStream(f);
        try {
            byte[] buf = new byte[256 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
        } finally { in.close(); }
        return hex(md.digest());
    }

    public static List<Group> exact(List<Item> items, Progress p) {
        Map<Long, List<Item>> bySize = new HashMap<Long, List<Item>>();
        for (Item it : items) {
            List<Item> l = bySize.get(it.size);
            if (l == null) { l = new ArrayList<Item>(); bySize.put(it.size, l); }
            l.add(it);
        }
        List<List<Item>> cands = new ArrayList<List<Item>>();
        int total = 0;
        for (List<Item> l : bySize.values()) if (l.size() > 1) { cands.add(l); total += l.size(); }
        List<Group> out = new ArrayList<Group>();
        int done = 0;
        for (List<Item> l : cands) {
            Map<String, List<Item>> bySample = new HashMap<String, List<Item>>();
            for (Item it : l) {
                done++;
                if (p != null && (done & 15) == 0) p.on("hash", done, total);
                try {
                    String k = it.size <= 384 * 1024 ? fullHash(new File(it.path)) : sampleHash(new File(it.path), it.size);
                    List<Item> g = bySample.get(k);
                    if (g == null) { g = new ArrayList<Item>(); bySample.put(k, g); }
                    g.add(it);
                } catch (Exception e) { /* unreadable file: skip */ }
            }
            for (List<Item> g : bySample.values()) {
                if (g.size() < 2) continue;
                List<Item> confirmed = g;
                if (g.get(0).size > 384 * 1024) { /* confirm large files with a full hash */
                    Map<String, List<Item>> byFull = new HashMap<String, List<Item>>();
                    for (Item it : g) {
                        try {
                            String k = fullHash(new File(it.path));
                            List<Item> x = byFull.get(k);
                            if (x == null) { x = new ArrayList<Item>(); byFull.put(k, x); }
                            x.add(it);
                        } catch (Exception e) { /* skip */ }
                    }
                    for (List<Item> x : byFull.values()) if (x.size() > 1) addGroup(out, "exact", x);
                } else addGroup(out, "exact", confirmed);
            }
        }
        if (p != null) p.on("hash", total, total);
        return out;
    }

    private static void addGroup(List<Group> out, String type, List<Item> items) {
        Group g = new Group(type);
        g.items.addAll(items);
        g.size = items.get(0).size;
        out.add(g);
    }

    /* ---------- similar photos ---------- */
    public static List<Group> similar(List<Item> images, Hasher h, int maxDist, Progress p) {
        int n = Math.min(images.size(), 30000);
        long[] hs = new long[n];
        boolean[] ok = new boolean[n];
        for (int i = 0; i < n; i++) {
            if (p != null && (i & 15) == 0) p.on("similar", i, n);
            long v = 0;
            try { v = h.dhash(new File(images.get(i).path)); } catch (Throwable t) { v = 0; }
            hs[i] = v; ok[i] = v != 0;
        }
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        for (int i = 0; i < n; i++) {
            if (!ok[i]) continue;
            for (int j = i + 1; j < n; j++) {
                if (ok[j] && Long.bitCount(hs[i] ^ hs[j]) <= maxDist) {
                    int a = find(parent, i), b = find(parent, j);
                    if (a != b) parent[a] = b;
                }
            }
        }
        Map<Integer, List<Item>> groups = new HashMap<Integer, List<Item>>();
        for (int i = 0; i < n; i++) {
            if (!ok[i]) continue;
            int r = find(parent, i);
            List<Item> l = groups.get(r);
            if (l == null) { l = new ArrayList<Item>(); groups.put(r, l); }
            l.add(images.get(i));
        }
        List<Group> out = new ArrayList<Group>();
        for (List<Item> l : groups.values()) {
            if (l.size() < 2 || l.size() > 40) continue; /* very large clusters are usually unrelated flat images */
            Collections.sort(l, new Comparator<Item>() { public int compare(Item a, Item b) { return Long.compare(b.size, a.size); } });
            addGroup(out, "similar", l);
        }
        if (p != null) p.on("similar", n, n);
        return out;
    }

    private static int find(int[] parent, int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    /* ---------- trash (move, never delete straight away) ---------- */
    public static class TrashRec {
        public String id, original, stored;
        public long size, ts;
    }

    public static class Trash {
        private final File dir;
        private final File index;
        public Trash(File dir) { this.dir = dir; this.index = new File(dir, "index.tsv"); }

        private static String enc(String s) { try { return URLEncoder.encode(s, "UTF-8"); } catch (Exception e) { return s; } }
        private static String dec(String s) { try { return URLDecoder.decode(s, "UTF-8"); } catch (Exception e) { return s; } }

        public synchronized List<TrashRec> list() {
            List<TrashRec> out = new ArrayList<TrashRec>();
            if (!index.exists()) return out;
            try {
                for (String line : Files.readAllLines(index.toPath(), java.nio.charset.StandardCharsets.UTF_8)) {
                    String[] p = line.split("\t");
                    if (p.length < 5) continue;
                    TrashRec r = new TrashRec();
                    r.id = p[0]; r.original = dec(p[1]); r.stored = dec(p[2]); r.size = Long.parseLong(p[3]); r.ts = Long.parseLong(p[4]);
                    if (new File(r.stored).exists()) out.add(r);
                }
            } catch (Exception e) { /* empty */ }
            return out;
        }

        private void save(List<TrashRec> l) throws IOException {
            dir.mkdirs();
            StringBuilder sb = new StringBuilder();
            for (TrashRec r : l) sb.append(r.id).append('\t').append(enc(r.original)).append('\t').append(enc(r.stored)).append('\t').append(r.size).append('\t').append(r.ts).append('\n');
            Files.write(index.toPath(), sb.toString().getBytes("UTF-8"));
        }

        private static boolean moveFile(File from, File to) {
            if (from.renameTo(to)) return true;
            try { /* different volume: copy then delete */
                Files.copy(from.toPath(), to.toPath());
                if (to.length() == from.length()) return from.delete();
                to.delete();
            } catch (Exception e) { to.delete(); }
            return false;
        }

        /** Moves files into the trash. Returns the records that were moved. */
        public synchronized List<TrashRec> moveAll(List<String> paths) throws IOException {
            dir.mkdirs();
            List<TrashRec> all = list(), moved = new ArrayList<TrashRec>();
            long now = System.currentTimeMillis();
            int n = 0;
            for (String path : paths) {
                File f = new File(path);
                if (!f.isFile()) continue;
                TrashRec r = new TrashRec();
                r.id = Long.toString(now, 36) + "-" + (n++) + "-" + Integer.toString((int) (Math.random() * 46656), 36);
                r.original = f.getAbsolutePath();
                r.size = f.length();
                r.ts = now;
                r.stored = new File(dir, r.id + "." + ext(f.getName())).getAbsolutePath();
                if (moveFile(f, new File(r.stored))) { all.add(r); moved.add(r); }
            }
            save(all);
            return moved;
        }

        /** Puts files back where they came from (adds " (restored)" if the name is taken). Returns the restored paths. */
        public synchronized List<String> restore(List<String> ids) throws IOException {
            List<TrashRec> all = list(), keep = new ArrayList<TrashRec>();
            List<String> restored = new ArrayList<String>();
            Set<String> want = new HashSet<String>(ids);
            for (TrashRec r : all) {
                if (!want.contains(r.id)) { keep.add(r); continue; }
                File to = new File(r.original);
                if (to.exists()) {
                    String name = to.getName(), e = ext(name);
                    String base = e.isEmpty() ? name : name.substring(0, name.length() - e.length() - 1);
                    to = new File(to.getParentFile(), base + " (restored)" + (e.isEmpty() ? "" : "." + e));
                }
                if (to.getParentFile() != null) to.getParentFile().mkdirs();
                if (moveFile(new File(r.stored), to)) restored.add(to.getAbsolutePath()); else keep.add(r);
            }
            save(keep);
            return restored;
        }

        /** Deletes forever. ids == null means everything. Returns bytes freed. */
        public synchronized long purge(List<String> ids) throws IOException {
            List<TrashRec> all = list(), keep = new ArrayList<TrashRec>();
            Set<String> want = ids == null ? null : new HashSet<String>(ids);
            long freed = 0;
            for (TrashRec r : all) {
                if (want == null || want.contains(r.id)) { if (new File(r.stored).delete()) freed += r.size; else keep.add(r); }
                else keep.add(r);
            }
            save(keep);
            return freed;
        }

        public synchronized long purgeOlderThan(long maxAgeMs) throws IOException {
            List<String> old = new ArrayList<String>();
            long now = System.currentTimeMillis();
            for (TrashRec r : list()) if (now - r.ts > maxAgeMs) old.add(r.id);
            return old.isEmpty() ? 0 : purge(old);
        }
    }
}
