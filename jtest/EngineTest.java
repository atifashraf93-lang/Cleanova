import pk.smaa.cleanova.DupEngine;
import pk.smaa.cleanova.DupEngine.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;

public class EngineTest {
  static void check(boolean ok, String msg) { System.out.println((ok ? "PASS " : "FAIL ") + msg); if (!ok) System.exit(1); }
  static byte[] rnd(int n, long seed) { byte[] b = new byte[n]; new Random(seed).nextBytes(b); return b; }
  static BufferedImage img(int w, int h, int mode) {
    BufferedImage im = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
      int v;
      if (mode == 0) v = (int) (128 + 100 * Math.sin(x / (double) w * 9) * Math.cos(y / (double) h * 5));
      else if (mode == 1) v = ((x / (w / 6) + y / (h / 6)) % 2) * 220 + 15;
      else v = (int) (255.0 * x / w);
      v = Math.max(0, Math.min(255, v));
      im.setRGB(x, y, (v << 16) | (v << 8) | v);
    }
    return im;
  }
  public static void main(String[] a) throws Exception {
    Path root = Files.createTempDirectory("cl");
    File r = root.toFile();
    new File(r, "DCIM/Camera").mkdirs(); new File(r, "WhatsApp/Media").mkdirs(); new File(r, "Android/data/x").mkdirs(); new File(r, ".hidden").mkdirs(); new File(r, ".CleanovaTrash").mkdirs();
    byte[] small = rnd(5000, 1), big = rnd(2_000_000, 2), big2 = rnd(2_000_000, 3);
    Files.write(new File(r, "DCIM/Camera/a.bin").toPath(), small);
    Files.write(new File(r, "WhatsApp/Media/a_copy.bin").toPath(), small);
    Files.write(new File(r, "Download-a.bin").toPath(), small);
    Files.write(new File(r, "DCIM/Camera/v.mp4").toPath(), big);
    Files.write(new File(r, "WhatsApp/Media/v.mp4").toPath(), big);
    byte[] almost = big.clone(); almost[1_000_000] ^= 1;               /* same size, same start/end, differs in the middle but not at sampled offsets? */
    almost[700_000] ^= 1;
    Files.write(new File(r, "almost.mp4").toPath(), almost);
    Files.write(new File(r, "other.mp4").toPath(), big2);
    Files.write(new File(r, "tiny.txt").toPath(), new byte[100]);        /* below minimum size */
    Files.write(new File(r, "Android/data/x/secret.bin").toPath(), small);
    Files.write(new File(r, ".hidden/h.bin").toPath(), small);
    ImageIO.write(img(400, 300, 0), "jpg", new File(r, "DCIM/Camera/p1.jpg"));
    BufferedImage big1 = img(1600, 1200, 0); ImageIO.write(big1, "jpg", new File(r, "WhatsApp/Media/p1_resized.jpg"));
    ImageIO.write(img(400, 300, 1), "png", new File(r, "DCIM/Camera/p2.png"));
    ImageIO.write(img(400, 300, 2), "png", new File(r, "DCIM/Camera/p3.png"));

    List<Item> items = DupEngine.walk(r, null);
    Set<String> names = new HashSet<String>(); for (Item i : items) names.add(new File(i.path).getName());
    check(!names.contains("secret.bin") && !names.contains("h.bin") && !names.contains("tiny.txt"), "walk skips Android/, hidden folders and tiny files");
    List<Group> ex = DupEngine.exact(items, null);
    int g3 = 0, g2 = 0; for (Group g : ex) { if (g.items.size() == 3) g3++; if (g.items.size() == 2) g2++; }
    check(ex.size() == 2 && g3 == 1 && g2 == 1, "exact: one group of 3 small copies and one group of 2 videos (got " + ex.size() + ")");
    check(ex.stream().noneMatch(g -> g.items.stream().anyMatch(i -> i.path.endsWith("almost.mp4"))), "exact: same-size file that differs in one byte is NOT grouped");

    Hasher h = f -> {
      try {
        BufferedImage im = ImageIO.read(f); if (im == null) return 0;
        long hash = 0; int bit = 0; int[][] g = new int[8][9];
        for (int y = 0; y < 8; y++) for (int x = 0; x < 9; x++) {
          int px = im.getRGB(Math.min(im.getWidth() - 1, x * im.getWidth() / 9 + im.getWidth() / 18), Math.min(im.getHeight() - 1, y * im.getHeight() / 8 + im.getHeight() / 16));
          g[y][x] = ((px >> 16 & 255) + (px >> 8 & 255) + (px & 255)) / 3;
        }
        for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) { if (g[y][x] > g[y][x + 1]) hash |= 1L << bit; bit++; }
        return hash;
      } catch (Exception e) { return 0; }
    };
    List<Item> imgs = new ArrayList<Item>(); for (Item i : items) if (DupEngine.isImage(i.path)) imgs.add(i);
    List<Group> sim = DupEngine.similar(imgs, h, 6, null);
    check(sim.size() == 1 && sim.get(0).items.size() == 2 && sim.get(0).items.get(0).path.endsWith("p1_resized.jpg"), "similar: resized copy grouped with original, bigger file first; other images separate");

    Trash t = new Trash(new File(r, ".CleanovaTrash"));
    String victim = new File(r, "WhatsApp/Media/a_copy.bin").getAbsolutePath();
    List<TrashRec> mv = t.moveAll(Arrays.asList(victim, new File(r, "Download-a.bin").getAbsolutePath(), "/does/not/exist"));
    check(mv.size() == 2 && !new File(victim).exists() && t.list().size() == 2, "trash: moves 2 files, ignores missing one");
    check(new File(r, "DCIM/Camera/a.bin").exists(), "trash: original kept");
    Files.write(new File(victim).toPath(), rnd(2000, 9));           /* original name now taken */
    List<String> back = t.restore(Collections.singletonList(mv.get(0).id));
    check(back.size() == 1 && new File(back.get(0)).exists(), "trash: restore works, name clash handled -> " + new File(back.get(0)).getName());
    long freed = t.purge(null);
    check(freed > 0 && t.list().isEmpty(), "trash: empty frees " + freed + " bytes");
    check(t.purgeOlderThan(1000) == 0, "trash: purge older on empty trash is safe");
    /* ---- v2: extras, skip, empty dirs, lapVar ---- */
    Path r2p = Files.createTempDirectory("cl2"); File r2 = r2p.toFile();
    for (String d : new String[]{"Download","DCIM/Camera","WhatsApp/Media/WhatsApp Images/Sent","Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video","Android/data/x","Emptyone","Keep/Inner","Pictures/Screenshots","Private"}) new File(r2, d).mkdirs();
    long old = System.currentTimeMillis() - 200L*86400000;
    File f1 = new File(r2, "Download/setup.apk"); Files.write(f1.toPath(), rnd(5000,9)); f1.setLastModified(old);
    File f2 = new File(r2, "WhatsApp/Media/WhatsApp Images/Sent/a.jpg"); Files.write(f2.toPath(), rnd(5000,10)); f2.setLastModified(old);
    File f3 = new File(r2, "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video/v.mp4"); Files.write(f3.toPath(), rnd(6000,11)); f3.setLastModified(old);
    Files.write(new File(r2, "Android/data/x/s.bin").toPath(), rnd(5000,12));
    Files.write(new File(r2, "Pictures/Screenshots/Screenshot_1.png").toPath(), rnd(5000,13));
    Files.write(new File(r2, "Private/p.bin").toPath(), rnd(5000,14));
    Files.write(new File(r2, "DCIM/Camera/x.tmp").toPath(), rnd(5000,15));
    Files.write(new File(r2, "Download/big.bin").toPath(), new byte[0]);
    List<String> empt = new ArrayList<String>();
    List<Item> it2 = DupEngine.walk(r2, null, Arrays.asList(new File(r2, "Private").getAbsolutePath()), empt);
    Set<String> nm = new HashSet<String>(); for (Item i : it2) nm.add(new File(i.path).getName());
    check(nm.contains("v.mp4") && !nm.contains("s.bin") && !nm.contains("p.bin"), "walk: Android/media included, Android/data and protected folder skipped");
    boolean hasEmpty = false, hasKeep = false; for (String e : empt) { if (e.endsWith("Emptyone")) hasEmpty = true; if (e.endsWith("DCIM") || e.endsWith("Download")) hasKeep = true; }
    check(hasEmpty && !hasKeep && empt.contains(new File(r2,"Keep/Inner").getAbsolutePath()), "empty folders found, standard folders never flagged");
    DupEngine.Extras xx = DupEngine.extras(it2, r2.getAbsolutePath(), System.currentTimeMillis());
    check(xx.wa.size() == 2, "whatsapp old media found (both locations): " + xx.wa.size());
    check(xx.shots.size() == 1, "screenshots found");
    check(xx.junk.size() == 2, "junk: apk + tmp -> " + xx.junk.size());
    check(xx.old.size() == 1, "old downloads (>30d) found");
    int[] sharp = new int[64*64], flat = new int[64*64];
    for (int i = 0; i < sharp.length; i++) { sharp[i] = ((i % 64) / 4 + (i / 64) / 4) % 2 * 200; flat[i] = 100 + (i % 64) / 16; }
    check(DupEngine.lapVar(sharp,64,64) > 1000 && DupEngine.lapVar(flat,64,64) < 25, "lapVar: sharp high, smooth low");
    System.out.println("ALL OK");
  }
}
