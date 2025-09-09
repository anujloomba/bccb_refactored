package com.cricketmanager.app;

import android.app.Activity;
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

public class MainActivity extends Activity {
    
    private WebView webView;
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
        
        // Load the cricket app
        webView.loadUrl(URL);
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
        webSettings.setUserAgentString(userAgent + " CricketManagerApp/1.0");
        
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
                // Hide any remaining browser UI elements
                view.evaluateJavascript(
                    "document.querySelector('meta[name=viewport]').setAttribute('content', " +
                    "'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');", null);
            }
        });
        
        // Set web chrome client for better app experience
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                // You can add a progress bar here if needed
            }
        });
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
    }
}
