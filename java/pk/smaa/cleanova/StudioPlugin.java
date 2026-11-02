package pk.smaa.cleanova;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.PointF;
import android.graphics.Rect;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.face.Face;
import com.google.mlkit.vision.face.FaceDetection;
import com.google.mlkit.vision.face.FaceDetector;
import com.google.mlkit.vision.face.FaceDetectorOptions;
import com.google.mlkit.vision.face.FaceLandmark;
import com.google.mlkit.vision.segmentation.Segmentation;
import com.google.mlkit.vision.segmentation.SegmentationMask;
import com.google.mlkit.vision.segmentation.Segmenter;
import com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.List;

/** Photo Studio: on-device face landmarks and person/background mask (ML Kit models are bundled; nothing is uploaded). */
@CapacitorPlugin(name = "Studio")
public class StudioPlugin extends Plugin {
    private FaceDetector faceDet;
    private Segmenter seg;

    private Bitmap decode(PluginCall call) {
        String d = call.getString("data", "");
        int i = d.indexOf(',');
        if (i >= 0) d = d.substring(i + 1);
        byte[] b = Base64.decode(d, Base64.DEFAULT);
        return BitmapFactory.decodeByteArray(b, 0, b.length);
    }

    private void lm(JSObject o, String k, Face f, int type, int w, int h) {
        FaceLandmark l = f.getLandmark(type);
        if (l == null) return;
        PointF p = l.getPosition();
        JSObject q = new JSObject();
        q.put("x", p.x / w); q.put("y", p.y / h);
        o.put(k, q);
    }

    @PluginMethod
    public void faces(final PluginCall call) {
        try {
            final Bitmap bmp = decode(call);
            if (bmp == null) { call.reject("bad image"); return; }
            if (faceDet == null) {
                faceDet = FaceDetection.getClient(new FaceDetectorOptions.Builder()
                    .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
                    .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
                    .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
                    .setMinFaceSize(0.1f).build());
            }
            final int w = bmp.getWidth(), h = bmp.getHeight();
            faceDet.process(InputImage.fromBitmap(bmp, 0)).addOnSuccessListener(new OnSuccessListener<List<Face>>() {
                @Override public void onSuccess(List<Face> list) {
                    JSArray out = new JSArray();
                    for (Face f : list) {
                        JSObject o = new JSObject();
                        Rect r = f.getBoundingBox();
                        o.put("x", r.left / (double) w); o.put("y", r.top / (double) h); o.put("w", r.width() / (double) w); o.put("h", r.height() / (double) h);
                        o.put("roll", f.getHeadEulerAngleZ()); o.put("yaw", f.getHeadEulerAngleY());
                        lm(o, "le", f, FaceLandmark.LEFT_EYE, w, h); lm(o, "re", f, FaceLandmark.RIGHT_EYE, w, h);
                        lm(o, "nose", f, FaceLandmark.NOSE_BASE, w, h);
                        lm(o, "ml", f, FaceLandmark.MOUTH_LEFT, w, h); lm(o, "mr", f, FaceLandmark.MOUTH_RIGHT, w, h); lm(o, "mb", f, FaceLandmark.MOUTH_BOTTOM, w, h);
                        lm(o, "lc", f, FaceLandmark.LEFT_CHEEK, w, h); lm(o, "rc", f, FaceLandmark.RIGHT_CHEEK, w, h);
                        out.put(o);
                    }
                    JSObject r = new JSObject(); r.put("faces", out);
                    call.resolve(r);
                }
            }).addOnFailureListener(new OnFailureListener() {
                @Override public void onFailure(Exception e) { call.reject("face detection failed: " + e.getMessage()); }
            });
        } catch (Throwable t) { call.reject("faces failed: " + t); }
    }

    @PluginMethod
    public void segment(final PluginCall call) {
        try {
            final Bitmap bmp = decode(call);
            if (bmp == null) { call.reject("bad image"); return; }
            if (seg == null) seg = Segmentation.getClient(new SelfieSegmenterOptions.Builder().setDetectorMode(SelfieSegmenterOptions.SINGLE_IMAGE_MODE).build());
            seg.process(InputImage.fromBitmap(bmp, 0)).addOnSuccessListener(new OnSuccessListener<SegmentationMask>() {
                @Override public void onSuccess(SegmentationMask m) {
                    try {
                        int mw = m.getWidth(), mh = m.getHeight();
                        ByteBuffer buf = m.getBuffer();
                        int[] px = new int[mw * mh];
                        for (int i = 0; i < px.length; i++) {
                            float c = buf.getFloat();
                            int a = Math.max(0, Math.min(255, Math.round(c * 255f)));
                            px[i] = Color.argb(a, 255, 255, 255);
                        }
                        Bitmap mask = Bitmap.createBitmap(px, mw, mh, Bitmap.Config.ARGB_8888);
                        ByteArrayOutputStream bo = new ByteArrayOutputStream();
                        mask.compress(Bitmap.CompressFormat.PNG, 100, bo);
                        JSObject r = new JSObject();
                        r.put("mask", "data:image/png;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP));
                        r.put("w", mw); r.put("h", mh);
                        call.resolve(r);
                    } catch (Throwable t) { call.reject("mask failed: " + t); }
                }
            }).addOnFailureListener(new OnFailureListener() {
                @Override public void onFailure(Exception e) { call.reject("segmentation failed: " + e.getMessage()); }
            });
        } catch (Throwable t) { call.reject("segment failed: " + t); }
    }
}
