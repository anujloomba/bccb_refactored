package com.cricketmanager.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

/** Game Day session shared by the web app, push handling, RSVP actions, and trip tracking. */
final class SessionStore {
    private static final String PREFS = "bccb_game_day_session";

    static final class Session {
        final String apiBase;
        final long groupId;
        final String groupName;
        final String deviceId;
        final String deviceToken;
        final String playerId;

        Session(String apiBase, long groupId, String groupName, String deviceId, String deviceToken, String playerId) {
            this.apiBase = apiBase;
            this.groupId = groupId;
            this.groupName = groupName;
            this.deviceId = deviceId;
            this.deviceToken = deviceToken;
            this.playerId = playerId;
        }
    }

    private SessionStore() {
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static Session load(Context context) {
        SharedPreferences prefs = prefs(context);
        String token = prefs.getString("deviceToken", null);
        String apiBase = prefs.getString("apiBase", null);
        long groupId = prefs.getLong("groupId", 0);
        if (token == null || apiBase == null || groupId <= 0) {
            return null;
        }
        return new Session(
            apiBase,
            groupId,
            prefs.getString("groupName", ""),
            prefs.getString("deviceId", ""),
            token,
            prefs.getString("playerId", null)
        );
    }

    static void save(Context context, JSONObject args) {
        String apiBase = args.optString("apiBase", "");
        if (!apiBase.startsWith("https://") && !apiBase.startsWith("http://")) {
            throw new IllegalArgumentException("A valid API address is required.");
        }
        long previousGroupId = prefs(context).getLong("groupId", 0);
        long groupId = args.optLong("groupId", 0);
        SharedPreferences.Editor editor = prefs(context).edit()
            .putString("apiBase", apiBase.replaceAll("/+$", ""))
            .putLong("groupId", groupId)
            .putString("groupName", args.optString("groupName", ""))
            .putString("deviceId", args.optString("deviceId", ""))
            .putString("deviceToken", args.optString("deviceToken", ""));
        String playerId = args.isNull("playerId") ? null : args.optString("playerId", null);
        if (playerId == null || playerId.isEmpty()) {
            editor.remove("playerId");
        } else {
            editor.putString("playerId", playerId);
        }
        if (previousGroupId != groupId) {
            editor.remove("uploadedPushToken");
        }
        editor.apply();
    }

    static void clear(Context context) {
        String pushToken = pushToken(context);
        SharedPreferences.Editor editor = prefs(context).edit().clear();
        if (pushToken != null) {
            editor.putString("pushToken", pushToken);
        }
        editor.apply();
    }

    static String pushToken(Context context) {
        return prefs(context).getString("pushToken", null);
    }

    static void setPushToken(Context context, String token) {
        prefs(context).edit().putString("pushToken", token).apply();
    }

    static String uploadedPushToken(Context context) {
        return prefs(context).getString("uploadedPushToken", null);
    }

    static void setUploadedPushToken(Context context, String token) {
        prefs(context).edit().putString("uploadedPushToken", token).apply();
    }

    static boolean wasPermissionRequested(Context context, String permission) {
        return prefs(context).getBoolean("asked:" + permission, false);
    }

    static void markPermissionRequested(Context context, String permission) {
        prefs(context).edit().putBoolean("asked:" + permission, true).apply();
    }
}
