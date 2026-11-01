package pk.smaa.cleanova;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/** Saves files the user makes inside Cleanova (PDF, images) to Downloads/Cleanova and opens or shares them. */
@CapacitorPlugin(name = "Files")
public class FilesPlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        try {
            String name = call.getString("name", "file").replaceAll("[\\\\/:*?\"<>|]", "_");
            String mime = call.getString("mime", "application/octet-stream");
            byte[] bytes = Base64.decode(call.getString("data", ""), Base64.DEFAULT);
            Context c = getContext();
            String path;
            String uri;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Cleanova");
                Uri u = c.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (u == null) { call.reject("cannot create file"); return; }
                OutputStream os = c.getContentResolver().openOutputStream(u);
                os.write(bytes);
                os.close();
                uri = u.toString();
                path = "Downloads/Cleanova/" + name;
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Cleanova");
                dir.mkdirs();
                File f = new File(dir, name);
                FileOutputStream fo = new FileOutputStream(f);
                fo.write(bytes);
                fo.close();
                path = f.getAbsolutePath();
                uri = Uri.fromFile(f).toString();
            }
            JSObject r = new JSObject();
            r.put("path", path);
            r.put("uri", uri);
            call.resolve(r);
        } catch (Throwable t) { call.reject("save failed: " + t); }
    }

    @PluginMethod
    public void open(PluginCall call) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(Uri.parse(call.getString("uri", "")), call.getString("mime", "*/*"));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(i);
            call.resolve();
        } catch (Throwable t) { call.reject("cannot open: " + t); }
    }

    @PluginMethod
    public void share(PluginCall call) {
        try {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType(call.getString("mime", "*/*"));
            i.putExtra(Intent.EXTRA_STREAM, Uri.parse(call.getString("uri", "")));
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent ch = Intent.createChooser(i, "Cleanova");
            ch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(ch);
            call.resolve();
        } catch (Throwable t) { call.reject("cannot share: " + t); }
    }
}
