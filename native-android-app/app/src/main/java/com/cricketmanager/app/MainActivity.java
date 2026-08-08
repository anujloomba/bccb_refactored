package com.cricketmanager.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final int SCORECARD_FILE_CHOOSER_REQUEST = 1001;
    private static final int MAX_SHARED_SCORECARD_BYTES = 10 * 1024 * 1024;
    private static final int SHARED_SCORECARD_CHUNK_BYTES = 192 * 1024;

    private WebView webView;
    private ValueCallback<Uri[]> scorecardFileCallback;
    private Uri pendingSharedScorecardUri;
    private String pendingSharedScorecardName;
    private byte[] pendingSharedScorecardBytes;
    private boolean pageLoaded;
    private static final String URL = "https://anujloomba.github.io/bccb_refactored/";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Make the activity fullscreen
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                           WindowManager.LayoutParams.FLAG_FULLSCREEN);
        
        // Hide navigation bar and status bar for true fullscreen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
        
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webview);
        setupWebView();
        handleSharedScorecardIntent(getIntent());
        
        // Load the cricket app
        // Load the web app from embedded assets (standalone/offline)
        webView.loadUrl("file:///android_asset/index.html");
    }

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
        return "application/pdf".equalsIgnoreCase(mimeType)
            || "application/x-pdf".equalsIgnoreCase(mimeType);
    }

    private synchronized void handleSharedScorecardIntent(Intent intent) {
        if (!Intent.ACTION_SEND.equals(intent.getAction()) || !isPdfShare(intent)) {
            return;
        }

        Uri sharedUri = getSharedScorecardUri(intent);
        if (sharedUri == null) {
            Log.w("CricketApp", "PDF share intent did not include a content URI");
            return;
        }

        clearSharedScorecard();
        pendingSharedScorecardUri = sharedUri;
        String lastPathSegment = sharedUri.getLastPathSegment();
        pendingSharedScorecardName = lastPathSegment != null
            && lastPathSegment.toLowerCase().endsWith(".pdf")
            ? lastPathSegment
            : "shared-scorecard.pdf";
        notifyWebAppOfSharedScorecard();
    }

    private synchronized boolean hasSharedScorecard() {
        return pendingSharedScorecardUri != null || pendingSharedScorecardBytes != null;
    }

    private void notifyWebAppOfSharedScorecard() {
        if (!pageLoaded || !hasSharedScorecard()) {
            return;
        }

        webView.post(() -> webView.evaluateJavascript(
            "(function deliverSharedScorecard(attempt) {"
                + "if (window.cricketApp && typeof window.cricketApp.receiveSharedScorecard === 'function') {"
                + "window.cricketApp.receiveSharedScorecard(); return;"
                + "}"
                + "if (attempt < 20) {"
                + "window.setTimeout(function() { deliverSharedScorecard(attempt + 1); }, 100);"
                + "}"
                + "})(0);",
            null
        ));
    }

    private synchronized String prepareSharedScorecard() {
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
            Log.e("CricketApp", "Could not read shared scorecard", exception);
            clearSharedScorecard();
            return "The shared PDF could not be read.";
        }
    }

    private synchronized String getSharedScorecardName() {
        return pendingSharedScorecardName == null ? "shared-scorecard.pdf" : pendingSharedScorecardName;
    }

    private synchronized int getSharedScorecardSize() {
        return pendingSharedScorecardBytes == null ? 0 : pendingSharedScorecardBytes.length;
    }

    private synchronized int getSharedScorecardChunkCount() {
        if (pendingSharedScorecardBytes == null) {
            return 0;
        }
        return (pendingSharedScorecardBytes.length + SHARED_SCORECARD_CHUNK_BYTES - 1)
            / SHARED_SCORECARD_CHUNK_BYTES;
    }

    private synchronized String getSharedScorecardChunk(int index) {
        if (pendingSharedScorecardBytes == null || index < 0) {
            return "";
        }
        int start = index * SHARED_SCORECARD_CHUNK_BYTES;
        if (start >= pendingSharedScorecardBytes.length) {
            return "";
        }
        int length = Math.min(
            SHARED_SCORECARD_CHUNK_BYTES,
            pendingSharedScorecardBytes.length - start
        );
        return Base64.encodeToString(
            pendingSharedScorecardBytes,
            start,
            length,
            Base64.NO_WRAP
        );
    }

    private synchronized void clearSharedScorecard() {
        pendingSharedScorecardUri = null;
        pendingSharedScorecardName = null;
        pendingSharedScorecardBytes = null;
    }
    
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        
        // Enable JavaScript
        webSettings.setJavaScriptEnabled(true);
        
        // Enable remote debugging for development
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        
        // Enable local storage
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        
        // Allow mixed content
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        
        // Set user agent to include app identifier
        String userAgent = webSettings.getUserAgentString();
        webSettings.setUserAgentString(userAgent + " CricketManagerApp/" + BuildConfig.VERSION_NAME);
        
        // Add JavaScript interface for debugging
        webView.addJavascriptInterface(new WebViewInterface(), "AndroidInterface");
        
        // Enable zoom controls
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        
        // Set web view client to handle navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Keep navigation within the app for your domain
                if (url.startsWith("https://anujloomba.github.io/")) {
                    return false; // Let WebView handle it
                }
                // Open external links in browser
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
                return true;
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                pageLoaded = true;
                // Hide any remaining browser UI elements
                view.evaluateJavascript(
                    "document.querySelector('meta[name=viewport]').setAttribute('content', " +
                    "'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');", null);
                notifyWebAppOfSharedScorecard();
            }
        });
        
        // Set web chrome client for better app experience
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                // You can add a progress bar here if needed
            }

            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams
            ) {
                if (scorecardFileCallback != null) {
                    scorecardFileCallback.onReceiveValue(null);
                }
                scorecardFileCallback = filePathCallback;

                Intent selectScorecard = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                selectScorecard.addCategory(Intent.CATEGORY_OPENABLE);
                selectScorecard.setType("application/pdf");

                try {
                    startActivityForResult(
                        Intent.createChooser(selectScorecard, "Select a scorecard PDF"),
                        SCORECARD_FILE_CHOOSER_REQUEST
                    );
                    return true;
                } catch (ActivityNotFoundException exception) {
                    Log.e("CricketApp", "No file picker is available", exception);
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

        scorecardFileCallback.onReceiveValue(
            WebChromeClient.FileChooserParams.parseResult(resultCode, data)
        );
        scorecardFileCallback = null;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSharedScorecardIntent(intent);
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        // Maintain fullscreen when app resumes
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    @Override
    protected void onDestroy() {
        if (scorecardFileCallback != null) {
            scorecardFileCallback.onReceiveValue(null);
            scorecardFileCallback = null;
        }
        clearSharedScorecard();
        super.onDestroy();
    }
    
    // JavaScript Interface for debugging and communication
    private class WebViewInterface {
        @JavascriptInterface
        public void logMessage(String message) {
            Log.d("CricketApp", "JS: " + message);
        }
        
        @JavascriptInterface
        public void logError(String error) {
            Log.e("CricketApp", "JS Error: " + error);
        }

        @JavascriptInterface
        public String prepareSharedScorecard() {
            return MainActivity.this.prepareSharedScorecard();
        }

        @JavascriptInterface
        public String getSharedScorecardName() {
            return MainActivity.this.getSharedScorecardName();
        }

        @JavascriptInterface
        public int getSharedScorecardSize() {
            return MainActivity.this.getSharedScorecardSize();
        }

        @JavascriptInterface
        public int getSharedScorecardChunkCount() {
            return MainActivity.this.getSharedScorecardChunkCount();
        }

        @JavascriptInterface
        public String getSharedScorecardChunk(int index) {
            return MainActivity.this.getSharedScorecardChunk(index);
        }

        @JavascriptInterface
        public void clearSharedScorecard() {
            MainActivity.this.clearSharedScorecard();
        }
    }
}
