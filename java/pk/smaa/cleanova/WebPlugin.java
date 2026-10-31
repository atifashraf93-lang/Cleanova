package pk.smaa.cleanova;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** In-app browser: opens a page (YouTube live, news article) in a window inside Cleanova instead of leaving the app. */
@CapacitorPlugin(name = "Web")
public class WebPlugin extends Plugin {
    private FrameLayout root, full;
    private WebView wv;
    private TextView titleV;
    private ProgressBar bar;
    private View customView;
    private WebChromeClient.CustomViewCallback customCb;
    private String curUrl = "";

    private int dp(int v) { return (int) (v * getActivity().getResources().getDisplayMetrics().density + 0.5f); }

    private TextView btn(String t, int sp) {
        TextView b = new TextView(getActivity());
        b.setText(t); b.setTextColor(Color.WHITE); b.setTextSize(sp); b.setGravity(Gravity.CENTER);
        b.setLayoutParams(new LinearLayout.LayoutParams(dp(48), dp(48)));
        return b;
    }

    private void fire(String ev) { JSObject o = new JSObject(); notifyListeners(ev, o); }

    @PluginMethod
    public void open(final PluginCall call) {
        final String url = call.getString("url", "");
        final String title = call.getString("title", "");
        final boolean ur = call.getBoolean("rtl", false);
        if (!url.startsWith("http")) { call.reject("bad url"); return; }
        getActivity().runOnUiThread(new Runnable() { public void run() {
            try {
                if (root != null) { curUrl = url; wv.loadUrl(url); if (titleV != null) titleV.setText(title); call.resolve(); return; }
                Activity a = getActivity();
                curUrl = url;
                root = new FrameLayout(a);
                root.setBackgroundColor(Color.parseColor("#0b1220"));
                root.setClickable(true);
                LinearLayout col = new LinearLayout(a);
                col.setOrientation(LinearLayout.VERTICAL);
                int sb = 0; int rid = a.getResources().getIdentifier("status_bar_height", "dimen", "android");
                if (rid > 0) sb = a.getResources().getDimensionPixelSize(rid);
                LinearLayout top = new LinearLayout(a);
                top.setOrientation(LinearLayout.HORIZONTAL); top.setGravity(Gravity.CENTER_VERTICAL);
                top.setBackgroundColor(Color.parseColor("#111a2e"));
                top.setPadding(dp(4), sb, dp(4), 0);
                TextView back = btn(ur ? "➜" : "←", 22);
                if (ur) back.setRotation(0);
                back.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { goBackOrClose(); } });
                titleV = new TextView(a);
                titleV.setText(title); titleV.setTextColor(Color.WHITE); titleV.setTextSize(16); titleV.setSingleLine(true);
                titleV.setEllipsize(android.text.TextUtils.TruncateAt.END);
                titleV.setPadding(dp(8), 0, dp(8), 0);
                titleV.setLayoutParams(new LinearLayout.LayoutParams(0, dp(48), 1f));
                titleV.setGravity(Gravity.CENTER_VERTICAL);
                TextView rl = btn("⟳", 22);
                rl.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { wv.reload(); } });
                TextView cl = btn("✕", 20);
                cl.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { close(); } });
                if (ur) { top.addView(cl); top.addView(rl); top.addView(titleV); top.addView(back); }
                else { top.addView(back); top.addView(titleV); top.addView(rl); top.addView(cl); }
                bar = new ProgressBar(a, null, android.R.attr.progressBarStyleHorizontal);
                bar.setMax(100);
                wv = new WebView(a);
                WebSettings s = wv.getSettings();
                s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
                s.setMediaPlaybackRequiresUserGesture(false);
                s.setLoadWithOverviewMode(true); s.setUseWideViewPort(true);
                s.setSupportMultipleWindows(false);
                s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
                try { s.setUserAgentString(s.getUserAgentString().replace("; wv)", ")")); } catch (Throwable t) { }
                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(wv, true);
                wv.setBackgroundColor(Color.BLACK);
                wv.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest r) {
                        String u = r.getUrl().toString();
                        return !(u.startsWith("http://") || u.startsWith("https://") || u.startsWith("about:"));
                    }
                    @Override public void onPageStarted(WebView v, String u, Bitmap b) { curUrl = u; bar.setVisibility(View.VISIBLE); }
                    @Override public void onPageFinished(WebView v, String u) { bar.setVisibility(View.GONE); }
                });
                wv.setWebChromeClient(new WebChromeClient() {
                    @Override public void onProgressChanged(WebView v, int p) { bar.setProgress(p); if (p >= 100) bar.setVisibility(View.GONE); }
                    @Override public void onShowCustomView(View v, CustomViewCallback cb) {
                        if (customView != null) { cb.onCustomViewHidden(); return; }
                        customView = v; customCb = cb;
                        full = new FrameLayout(getActivity()); full.setBackgroundColor(Color.BLACK); full.addView(v);
                        ((ViewGroup) getActivity().getWindow().getDecorView()).addView(full, new ViewGroup.LayoutParams(-1, -1));
                        getActivity().getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
                        getActivity().setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                    }
                    @Override public void onHideCustomView() { leaveFull(); }
                });
                col.addView(top, new LinearLayout.LayoutParams(-1, dp(48) + sb));
                col.addView(bar, new LinearLayout.LayoutParams(-1, dp(3)));
                col.addView(wv, new LinearLayout.LayoutParams(-1, 0, 1f));
                root.addView(col, new FrameLayout.LayoutParams(-1, -1));
                ((ViewGroup) a.getWindow().getDecorView().findViewById(android.R.id.content)).addView(root, new ViewGroup.LayoutParams(-1, -1));
                wv.loadUrl(url);
                call.resolve();
            } catch (Throwable t) { call.reject("cannot open: " + t); }
        }});
    }

    private void leaveFull() {
        try {
            if (full != null) { ((ViewGroup) getActivity().getWindow().getDecorView()).removeView(full); full = null; }
            if (customCb != null) customCb.onCustomViewHidden();
            customView = null; customCb = null;
            getActivity().getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            getActivity().setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        } catch (Throwable t) { }
    }

    private void goBackOrClose() {
        if (customView != null) { leaveFull(); return; }
        if (wv != null && wv.canGoBack()) wv.goBack(); else close();
    }

    private void close() {
        leaveFull();
        try {
            if (root != null) {
                if (wv != null) { wv.loadUrl("about:blank"); wv.stopLoading(); wv.destroy(); }
                ((ViewGroup) root.getParent()).removeView(root);
            }
        } catch (Throwable t) { }
        root = null; wv = null;
        fire("closed");
    }

    /** Hardware back: consumed here if the in-app window is open. */
    @PluginMethod
    public void back(final PluginCall call) {
        getActivity().runOnUiThread(new Runnable() { public void run() {
            JSObject o = new JSObject(); o.put("open", root != null);
            if (root != null) goBackOrClose();
            call.resolve(o);
        }});
    }

    @PluginMethod
    public void close(final PluginCall call) {
        getActivity().runOnUiThread(new Runnable() { public void run() { close(); call.resolve(); } });
    }

    @PluginMethod
    public void external(PluginCall call) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(call.getString("url", curUrl)));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Throwable t) { call.reject("cannot open: " + t); }
    }
}
