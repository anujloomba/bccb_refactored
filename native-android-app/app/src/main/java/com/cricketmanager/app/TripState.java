package com.cricketmanager.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONException;
import org.json.JSONObject;

/** Persisted live-trip status shared by the tracking service and the web app. */
final class TripState {
    private static final String PREFS = "bccb_trip_state";
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    interface Listener {
        void onTripStatus(JSONObject status);
    }

    private static volatile Listener listener;

    private TripState() {
    }

    static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void setListener(Listener value) {
        listener = value;
    }

    static void start(Context context, String gameDayId, long groupId, double venueLat, double venueLng, String venueName, long stopAfter) {
        prefs(context).edit()
            .clear()
            .putBoolean("active", true)
            .putString("gameDayId", gameDayId)
            .putLong("groupId", groupId)
            .putString("venueLat", Double.toString(venueLat))
            .putString("venueLng", Double.toString(venueLng))
            .putString("venueName", venueName)
            .putLong("stopAfter", stopAfter)
            .putLong("startedAt", System.currentTimeMillis())
            .apply();
        publish(context);
    }

    static void recordUpdate(Context context) {
        prefs(context).edit()
            .putLong("lastUpdateAt", System.currentTimeMillis())
            .remove("lastError")
            .apply();
        publish(context);
    }

    static void recordError(Context context, String message) {
        prefs(context).edit().putString("lastError", message).apply();
        publish(context);
    }

    static void stop(Context context, boolean arrived, String error) {
        SharedPreferences.Editor editor = prefs(context).edit()
            .putBoolean("active", false)
            .putBoolean("arrived", arrived);
        if (error == null) {
            editor.remove("lastError");
        } else {
            editor.putString("lastError", error);
        }
        editor.apply();
        publish(context);
    }

    static boolean isActive(Context context) {
        return prefs(context).getBoolean("active", false);
    }

    /** When the current trip started on this phone. Also identifies the trip to the server. */
    static long startedAt(Context context) {
        return prefs(context).getLong("startedAt", 0);
    }

    static String gameDayId(Context context) {
        return prefs(context).getString("gameDayId", null);
    }

    static JSONObject snapshot(Context context) {
        SharedPreferences prefs = prefs(context);
        JSONObject status = new JSONObject();
        try {
            status.put("active", prefs.getBoolean("active", false));
            status.put("arrived", prefs.getBoolean("arrived", false));
            if (prefs.contains("gameDayId")) status.put("gameDayId", prefs.getString("gameDayId", null));
            if (prefs.contains("startedAt")) status.put("startedAt", prefs.getLong("startedAt", 0));
            if (prefs.contains("lastUpdateAt")) status.put("lastUpdateAt", prefs.getLong("lastUpdateAt", 0));
            if (prefs.contains("lastError")) status.put("lastError", prefs.getString("lastError", null));
        } catch (JSONException exception) {
            // Values are primitives and strings; this cannot happen.
        }
        return status;
    }

    private static void publish(Context context) {
        Listener current = listener;
        if (current == null) {
            return;
        }
        JSONObject status = snapshot(context);
        MAIN.post(() -> current.onTripStatus(status));
    }
}
