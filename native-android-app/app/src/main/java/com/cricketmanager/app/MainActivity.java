package com.cricketmanager.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String TAG = "CricketApp";
    private static final int SCORECARD_FILE_CHOOSER_REQUEST = 1001;
    private static final int FIRST_PERMISSION_REQUEST = 2000;
    private static final int MAX_SHARED_SCORECARD_BYTES = 10 * 1024 * 1024;
    private static final int SHARED_SCORECARD_CHUNK_BYTES = 192 * 1024;

    private static WeakReference<MainActivity> current = new WeakReference<>(null);

    interface PermissionCallback {
        void onResult(boolean granted);
    }

    private WebView webView;
    private ValueCallback<Uri[]> scorecardFileCallback;
    private Uri pendingSharedScorecardUri;
    private String pendingSharedScorecardName;
    private byte[] pendingSharedScorecardBytes;
    private boolean pageLoaded;
    private String launchRoute;
    private final List<String[]> pendingEvents = new ArrayList<>();
    private final Map<Integer, PermissionCallback> permissionCallbacks = new HashMap<>();
    private int nextPermissionRequest = FIRST_PERMISSION_REQUEST;
    private OnBackInvokedCallback backCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        current = new WeakReference<>(this);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        applyImmersiveMode();

        setContentView(R.layout.activity_main);
        Notifications.ensureChannels(this);

        webView = findViewById(R.id.webview);
        setupWebView();
        registerBackHandling();
        TripState.setListener(status -> emit("tripStatus", status));
        handleIntent(getIntent(), true);

        // The web app is bundled in the APK so it works offline.
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void applyImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    // ---- Events and callbacks for window.BCCBNative ----

    static void emitIfAlive(String event, JSONObject payload) {
        MainActivity activity = current.get();
        if (activity != null && !activity.isFinishing()) {
            activity.runOnUiThread(() -> activity.emit(event, payload));
        }
    }

    void emit(String event, JSONObject payload) {
        String json = payload == null ? "{}" : payload.toString();
        if (!pageLoaded) {
            pendingEvents.add(new String[]{event, json});
            return;
        }
        webView.evaluateJavascript(
            "window.__bccbNativeEmit && window.__bccbNativeEmit(" + JSONObject.quote(event) + "," + JSONObject.quote(json) + ");",
            null
        );
    }

    private void flushPendingEvents() {
        List<String[]> events = new ArrayList<>(pendingEvents);
        pendingEvents.clear();
        for (String[] event : events) {
            webView.evaluateJavascript(
                "window.__bccbNativeEmit && window.__bccbNativeEmit(" + JSONObject.quote(event[0]) + "," + JSONObject.quote(event[1]) + ");",
                null
            );
        }
    }

    void resolve(String callbackId, JSONObject payload) {
        complete(callbackId, true, payload == null ? new JSONObject() : payload);
    }

    void reject(String callbackId, String code, String message) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("code", code).put("message", message);
        } catch (JSONException exception) {
            Log.w(TAG, "Could not build an error payload", exception);
        }
        complete(callbackId, false, payload);
    }

    private void complete(String callbackId, boolean ok, JSONObject payload) {
        if (callbackId == null) {
            return;
        }
        String script = "window.__bccbNativeResolve && window.__bccbNativeResolve("
            + JSONObject.quote(callbackId) + "," + ok + "," + JSONObject.quote(payload.toString()) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    void requestRuntimePermissions(String[] permissions, PermissionCallback callback) {
        int requestCode = nextPermissionRequest++;
        permissionCallbacks.put(requestCode, callback);
        requestPermissions(permissions, requestCode);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        PermissionCallback callback = permissionCallbacks.remove(requestCode);
        if (callback == null) {
            return;
        }
        boolean granted = false;
        for (int result : grantResults) {
            granted |= result == PackageManager.PERMISSION_GRANTED;
        }
        callback.onResult(granted);
    }

    // ---- Intents: shared PDFs, deep links, and notification taps ----

    private void handleIntent(Intent intent, boolean coldStart) {
        if (intent == null) {
            return;
        }
        if (Intent.ACTION_SEND.equals(intent.getAction()) && isPdfShare(intent)) {
            handleSharedScorecardIntent(intent);
            return;
        }

        String notificationAction = intent.getStringExtra(Notifications.EXTRA_ACTION);
        if (notificationAction != null) {
            try {
                emit("notificationAction", new JSONObject()
                    .put("action", notificationAction)
                    .put("type", intent.getStringExtra(Notifications.EXTRA_TYPE))
                    .put("groupId", intent.getLongExtra(Notifications.EXTRA_GROUP_ID, 0))
                    .put("gameDayId", intent.getStringExtra(Notifications.EXTRA_GAME_DAY_ID))
                    .put("route", intent.getStringExtra(Notifications.EXTRA_ROUTE)));
            } catch (JSONException exception) {
                Log.w(TAG, "Could not read the notification", exception);
            }
            intent.removeExtra(Notifications.EXTRA_ACTION);
            return;
        }

        Uri data = intent.getData();
        if (Intent.ACTION_VIEW.equals(intent.getAction()) && data != null && "bccb".equals(data.getScheme())) {
            String route = data.toString();
            if (coldStart) {
                launchRoute = route;
            } else {
                try {
                    emit("deepLink", new JSONObject().put("route", route));
                } catch (JSONException exception) {
                    Log.w(TAG, "Could not read the link", exception);
                }
            }
        }
    }

    String consumeLaunchRoute() {
        String route = launchRoute;
        launchRoute = null;
        return route;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent, false);
    }

    // ---- Shared scorecard PDFs (legacy synchronous bridge) ----

    @SuppressWarnings("deprecation")
    private Uri getSharedScorecardUri(Intent intent) {
        Uri sharedUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (sharedUri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
            sharedUri = intent.getClipData().getItemAt(0).getUri();
        }
        return sharedUri;
    }

    private boolean isPdfShare(Intent intent) {
        String mimeType = intent.getType();
        return "application/pdf".equalsIgnoreCase(mimeType) || "application/x-pdf".equalsIgnoreCase(mimeType);
    }

    private synchronized void handleSharedScorecardIntent(Intent intent) {
        Uri sharedUri = getSharedScorecardUri(intent);
        if (sharedUri == null) {
            Log.w(TAG, "PDF share intent did not include a content URI");
            return;
        }

        clearSharedScorecard();
        pendingSharedScorecardUri = sharedUri;
        String lastPathSegment = sharedUri.getLastPathSegment();
        pendingSharedScorecardName = lastPathSegment != null && lastPathSegment.toLowerCase(Locale.ROOT).endsWith(".pdf")
            ? lastPathSegment
            : "shared-scorecard.pdf";
        emit("sharedFile", new JSONObject());
    }

    synchronized String prepareSharedScorecard() {
        if (pendingSharedScorecardBytes != null) {
            return "";
        }
        if (pendingSharedScorecardUri == null) {
            return "No shared PDF is available.";
        }

        try (
            InputStream inputStream = getContentResolver().openInputStream(pendingSharedScorecardUri);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream()
        ) {
            if (inputStream == null) {
                clearSharedScorecard();
                return "The shared PDF could not be opened.";
            }

            byte[] buffer = new byte[8192];
            int totalBytes = 0;
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                if (totalBytes + bytesRead > MAX_SHARED_SCORECARD_BYTES) {
                    clearSharedScorecard();
                    return "Shared scorecard PDFs must be 10 MB or smaller.";
                }
                outputStream.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;
            }
            if (totalBytes == 0) {
                clearSharedScorecard();
                return "The shared PDF is empty.";
            }

            pendingSharedScorecardBytes = outputStream.toByteArray();
            pendingSharedScorecardUri = null;
            return "";
        } catch (IOException | SecurityException exception) {
            Log.e(TAG, "Could not read shared scorecard", exception);
            clearSharedScorecard();
            return "The shared PDF could not be read.";
        }
    }

    synchronized String getSharedScorecardName() {
        return pendingSharedScorecardName == null ? "shared-scorecard.pdf" : pendingSharedScorecardName;
    }

    synchronized int getSharedScorecardSize() {
        return pendingSharedScorecardBytes == null ? 0 : pendingSharedScorecardBytes.length;
    }

    synchronized int getSharedScorecardChunkCount() {
        if (pendingSharedScorecardBytes == null) {
            return 0;
        }
        return (pendingSharedScorecardBytes.length + SHARED_SCORECARD_CHUNK_BYTES - 1) / SHARED_SCORECARD_CHUNK_BYTES;
    }

    synchronized String getSharedScorecardChunk(int index) {
        if (pendingSharedScorecardBytes == null || index < 0) {
            return "";
        }
        int start = index * SHARED_SCORECARD_CHUNK_BYTES;
        if (start >= pendingSharedScorecardBytes.length) {
            return "";
        }
        int length = Math.min(SHARED_SCORECARD_CHUNK_BYTES, pendingSharedScorecardBytes.length - start);
        return Base64.encodeToString(pendingSharedScorecardBytes, start, length, Base64.NO_WRAP);
    }

    synchronized void clearSharedScorecard() {
        pendingSharedScorecardUri = null;
        pendingSharedScorecardName = null;
        pendingSharedScorecardBytes = null;
    }

    // ---- WebView ----

    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webSettings.setUserAgentString(webSettings.getUserAgentString() + " CricketManagerApp/" + BuildConfig.VERSION_NAME);
        webView.addJavascriptInterface(new NativeBridge(this), "AndroidInterface");
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file:///android_asset/")) {
                    return false;
                }
                if (url.startsWith("bccb://")) {
                    try {
                        emit("deepLink", new JSONObject().put("route", url));
                    } catch (JSONException exception) {
                        Log.w(TAG, "Could not open the link", exception);
                    }
                    return true;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (ActivityNotFoundException exception) {
                    Log.w(TAG, "No app can open " + url, exception);
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                pageLoaded = true;
                view.evaluateJavascript(
                    "document.querySelector('meta[name=viewport]').setAttribute('content', "
                        + "'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');",
                    null
                );
                flushPendingEvents();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (scorecardFileCallback != null) {
                    scorecardFileCallback.onReceiveValue(null);
                }
                scorecardFileCallback = filePathCallback;

                Intent selectScorecard = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                selectScorecard.addCategory(Intent.CATEGORY_OPENABLE);
                selectScorecard.setType("application/pdf");

                try {
                    startActivityForResult(Intent.createChooser(selectScorecard, "Select a scorecard PDF"), SCORECARD_FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException exception) {
                    Log.e(TAG, "No file picker is available", exception);
                    scorecardFileCallback.onReceiveValue(null);
                    scorecardFileCallback = null;
                    return false;
                }
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != SCORECARD_FILE_CHOOSER_REQUEST || scorecardFileCallback == null) {
            return;
        }
        scorecardFileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        scorecardFileCallback = null;
    }

    // ---- Back navigation (Android 13+ uses OnBackInvokedCallback; Android 16 requires it) ----

    private void registerBackHandling() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
    }

    private void handleBack() {
        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        webView.evaluateJavascript(
            "(function(){ return !!(window.BCCBHandleBack && window.BCCBHandleBack()); })();",
            handled -> {
                if (!"true".equals(handled)) {
                    moveTaskToBack(true);
                }
            }
        );
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBack();
    }

    @Override
    protected void onResume() {
        super.onResume();
        current = new WeakReference<>(this);
        applyImmersiveMode();
        emit("resume", new JSONObject());
    }

    @Override
    protected void onDestroy() {
        if (scorecardFileCallback != null) {
            scorecardFileCallback.onReceiveValue(null);
            scorecardFileCallback = null;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        TripState.setListener(null);
        clearSharedScorecard();
        if (current.get() == this) {
            current = new WeakReference<>(null);
        }
        super.onDestroy();
    }
}
