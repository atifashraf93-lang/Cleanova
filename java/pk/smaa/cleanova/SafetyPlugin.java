package pk.smaa.cleanova;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.speech.RecognizerIntent;
import android.view.WindowManager;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;

/** App lock (fingerprint / face / device PIN), hide-in-recents, and voice dictation. */
@CapacitorPlugin(name = "Safety")
public class SafetyPlugin extends Plugin {

    private Context ctx() { return getContext(); }

    @PluginMethod
    public void biometricInfo(PluginCall call) {
        JSObject o = new JSObject();
        boolean any = false, bio = false;
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                BiometricManager bm = (BiometricManager) ctx().getSystemService(Context.BIOMETRIC_SERVICE);
                int a = BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
                any = bm.canAuthenticate(a) == BiometricManager.BIOMETRIC_SUCCESS;
                bio = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS;
            } else if (Build.VERSION.SDK_INT >= 29) {
                BiometricManager bm = (BiometricManager) ctx().getSystemService(Context.BIOMETRIC_SERVICE);
                bio = bm.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;
                any = bio;
            } else if (Build.VERSION.SDK_INT >= 28) {
                bio = ctx().getPackageManager().hasSystemFeature(PackageManager.FEATURE_FINGERPRINT);
                any = bio;
            }
        } catch (Throwable t) { /* report none */ }
        o.put("available", any);
        o.put("biometric", bio);
        call.resolve(o);
    }

    @PluginMethod
    public void biometricAuth(final PluginCall call) {
        if (Build.VERSION.SDK_INT < 28) { call.reject("unsupported"); return; }
        final Activity act = getActivity();
        act.runOnUiThread(new Runnable() {
            @Override public void run() {
                final boolean[] done = { false };
                try {
                    BiometricPrompt.Builder b = new BiometricPrompt.Builder(ctx())
                        .setTitle(call.getString("title", "Cleanova Life"))
                        .setSubtitle(call.getString("subtitle", ""));
                    if (Build.VERSION.SDK_INT >= 30) {
                        b.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                    } else {
                        b.setNegativeButton(call.getString("cancel", "Use PIN"), ctx().getMainExecutor(), new android.content.DialogInterface.OnClickListener() {
                            @Override public void onClick(android.content.DialogInterface d, int w) { if (!done[0]) { done[0] = true; call.reject("cancel"); } }
                        });
                    }
                    BiometricPrompt p = b.build();
                    p.authenticate(new CancellationSignal(), ctx().getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                        @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) {
                            if (done[0]) return; done[0] = true;
                            JSObject o = new JSObject(); o.put("ok", true); call.resolve(o);
                        }
                        @Override public void onAuthenticationError(int code, CharSequence msg) {
                            if (done[0]) return; done[0] = true; call.reject(String.valueOf(msg));
                        }
                    });
                } catch (Throwable t) { if (!done[0]) { done[0] = true; call.reject("biometric failed: " + t); } }
            }
        });
    }

    @PluginMethod
    public void secure(final PluginCall call) {
        final boolean on = call.getBoolean("on", false);
        getActivity().runOnUiThread(new Runnable() {
            @Override public void run() {
                if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                call.resolve();
            }
        });
    }

    @PluginMethod
    public void voice(PluginCall call) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", "en-US"));
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, call.getString("prompt", ""));
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        try { startActivityForResult(call, i, "voiceDone"); }
        catch (Throwable t) { call.reject("Voice input is not available on this phone"); }
    }

    @ActivityCallback
    private void voiceDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            ArrayList<String> l = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            JSArray a = new JSArray();
            if (l != null) for (String s : l) a.put(s);
            JSObject o = new JSObject(); o.put("results", a); call.resolve(o);
        } else call.reject("cancelled");
    }
}
