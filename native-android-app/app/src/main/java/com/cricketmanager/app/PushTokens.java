package com.cricketmanager.app;

import android.content.Context;

import com.google.firebase.FirebaseApp;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Firebase availability checks and push-token registration with the Worker. */
final class PushTokens {
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    private PushTokens() {
    }

    /** Firebase is only initialised when the build included google-services.json. */
    static boolean isConfigured(Context context) {
        try {
            return !FirebaseApp.getApps(context).isEmpty();
        } catch (RuntimeException exception) {
            return false;
        }
    }

    static void uploadIfNeeded(Context context) {
        Context appContext = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            SessionStore.Session session = SessionStore.load(appContext);
            String token = SessionStore.pushToken(appContext);
            if (session == null || token == null || token.equals(SessionStore.uploadedPushToken(appContext))) {
                return;
            }
            try {
                JSONObject body = new JSONObject().put("push_token", token).put("platform", "android");
                if (BccbApi.groupRequest(session, "PUT", "/devices/me", body).ok()) {
                    SessionStore.setUploadedPushToken(appContext, token);
                }
            } catch (JSONException exception) {
                // The body contains only strings; this cannot happen.
            }
        });
    }
}
