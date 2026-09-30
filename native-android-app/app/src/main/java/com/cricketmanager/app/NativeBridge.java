package com.cricketmanager.app;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;

import androidx.core.content.ContextCompat;
import androidx.core.location.LocationManagerCompat;

import com.google.android.gms.location.CurrentLocationRequest;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

/**
 * The Android side of the native bridge contract (tools/native-bridge-contract.json), exposed to the
 * web app as window.AndroidInterface. Every contract method is dispatched from {@link #invoke}.
 */
final class NativeBridge {
    private static final String TAG = "CricketApp";
    private static final String NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";

    private final MainActivity activity;
    private final Context context;

    NativeBridge(MainActivity activity) {
        this.activity = activity;
        this.context = activity.getApplicationContext();
    }

    @JavascriptInterface
    public void logMessage(String message) {
        Log.d(TAG, "JS: " + message);
    }

    @JavascriptInterface
    public void logError(String error) {
        Log.e(TAG, "JS Error: " + error);
    }

    @JavascriptInterface
    public String prepareSharedScorecard() {
        return activity.prepareSharedScorecard();
    }

    @JavascriptInterface
    public String getSharedScorecardName() {
        return activity.getSharedScorecardName();
    }

    @JavascriptInterface
    public int getSharedScorecardSize() {
        return activity.getSharedScorecardSize();
    }

    @JavascriptInterface
    public int getSharedScorecardChunkCount() {
        return activity.getSharedScorecardChunkCount();
    }

    @JavascriptInterface
    public String getSharedScorecardChunk(int index) {
        return activity.getSharedScorecardChunk(index);
    }

    @JavascriptInterface
    public void clearSharedScorecard() {
        activity.clearSharedScorecard();
    }

    @JavascriptInterface
    public void invoke(String method, String argsJson, String callbackId) {
        JSONObject parsed;
        try {
            parsed = argsJson == null || argsJson.isEmpty() ? new JSONObject() : new JSONObject(argsJson);
        } catch (JSONException exception) {
            activity.reject(callbackId, "invalid_arguments", "The app sent unreadable data.");
            return;
        }
        JSONObject args = parsed;
        activity.runOnUiThread(() -> {
            try {
                dispatch(method, args, callbackId);
            } catch (Exception exception) {
                Log.e(TAG, "Native call " + method + " failed", exception);
                activity.reject(callbackId, "native_error", exception.getMessage() == null ? "Something went wrong." : exception.getMessage());
            }
        });
    }

    private void dispatch(String method, JSONObject args, String callbackId) throws JSONException {
        switch (method) {
            case "getCapabilities":
                activity.resolve(callbackId, new JSONObject()
                    .put("platform", "android")
                    .put("appVersion", BuildConfig.VERSION_NAME)
                    .put("push", PushTokens.isConfigured(context))
                    .put("alarms", "exact")
                    .put("backgroundLocation", true)
                    .put("sharedFiles", true));
                break;
            case "setSession":
                SessionStore.save(context, args);
                PushTokens.uploadIfNeeded(context);
                activity.resolve(callbackId, new JSONObject());
                break;
            case "clearSession":
                TripTrackingService.stop(context, false);
                GameAlarms.cancelAll(context);
                SessionStore.clear(context);
                activity.resolve(callbackId, new JSONObject());
                break;
            case "getPushToken":
                resolvePushToken(callbackId);
                break;
            case "requestPushPermission":
                if (pushPermission().equals("prompt")) {
                    SessionStore.markPermissionRequested(context, NOTIFICATIONS);
                    activity.requestRuntimePermissions(new String[]{NOTIFICATIONS}, granted -> resolvePushToken(callbackId));
                } else {
                    resolvePushToken(callbackId);
                }
                break;
            case "getLocationPermission":
                activity.resolve(callbackId, new JSONObject().put("permission", locationPermission()));
                break;
            case "requestLocationPermission":
                if (locationPermission().equals("prompt")) {
                    SessionStore.markPermissionRequested(context, Manifest.permission.ACCESS_FINE_LOCATION);
                    activity.requestRuntimePermissions(
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                        granted -> resolveLocationPermission(callbackId)
                    );
                } else {
                    resolveLocationPermission(callbackId);
                }
                break;
            case "getCurrentPosition":
                getCurrentPosition(callbackId, args.optLong("timeoutMs", 15000));
                break;
            case "getAlarmPermission":
                activity.resolve(callbackId, alarmPermission());
                break;
            case "requestAlarmPermission":
                if (pushPermission().equals("prompt")) {
                    SessionStore.markPermissionRequested(context, NOTIFICATIONS);
                    activity.requestRuntimePermissions(new String[]{NOTIFICATIONS}, granted -> requestExactAlarms(callbackId));
                } else {
                    requestExactAlarms(callbackId);
                }
                break;
            case "scheduleGameAlarm":
                // Like iOS, ask for notification access first: the alarm rings through a notification.
                if (!args.optBoolean("useClockApp", false) && pushPermission().equals("prompt")) {
                    SessionStore.markPermissionRequested(context, NOTIFICATIONS);
                    activity.requestRuntimePermissions(new String[]{NOTIFICATIONS}, granted -> scheduleGameAlarm(callbackId, args));
                } else {
                    scheduleGameAlarm(callbackId, args);
                }
                break;
            case "cancelGameAlarm":
                activity.resolve(callbackId, GameAlarms.cancel(context, args.optString("id", "")));
                break;
            case "getScheduledAlarms":
                activity.resolve(callbackId, new JSONObject().put("alarms", GameAlarms.list(context)));
                break;
            case "startTrip":
                startTrip(callbackId, args);
                break;
            case "stopTrip":
                TripTrackingService.stop(context, false);
                activity.resolve(callbackId, new JSONObject().put("stopped", true));
                break;
            case "getTripStatus":
                TripTrackingService.resumeIfNeeded(context);
                activity.resolve(callbackId, TripState.snapshot(context));
                break;
            case "consumeLaunchRoute":
                activity.resolve(callbackId, new JSONObject().put("route", activity.consumeLaunchRoute()));
                break;
            case "openSettings":
                openSettings(args.optString("target", "app"));
                activity.resolve(callbackId, new JSONObject());
                break;
            case "openExternalUrl":
                openExternalUrl(callbackId, args.optString("url", ""));
                break;
            default:
                activity.reject(callbackId, "unsupported", method + " is not available in this version of the app.");
        }
    }

    private boolean granted(String permission) {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED;
    }

    private String runtimePermission(String permission, boolean granted) {
        if (granted) {
            return "granted";
        }
        if (!SessionStore.wasPermissionRequested(context, permission) || activity.shouldShowRequestPermissionRationale(permission)) {
            return "prompt";
        }
        return "denied";
    }

    private String pushPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !granted(NOTIFICATIONS)) {
            return runtimePermission(NOTIFICATIONS, false);
        }
        return Notifications.hasPostPermission(context) ? "granted" : "denied";
    }

    private String locationPermission() {
        boolean granted = granted(Manifest.permission.ACCESS_FINE_LOCATION) || granted(Manifest.permission.ACCESS_COARSE_LOCATION);
        return runtimePermission(Manifest.permission.ACCESS_FINE_LOCATION, granted);
    }

    private void resolveLocationPermission(String callbackId) {
        try {
            activity.resolve(callbackId, new JSONObject().put("permission", locationPermission()));
        } catch (JSONException exception) {
            activity.reject(callbackId, "native_error", "Could not read the location permission.");
        }
    }

    private void resolvePushToken(String callbackId) {
        String permission = pushPermission();
        if (!PushTokens.isConfigured(context)) {
            resolvePush(callbackId, null, permission);
            return;
        }
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                String token = task.isSuccessful() ? task.getResult() : null;
                if (token != null) {
                    SessionStore.setPushToken(context, token);
                    PushTokens.uploadIfNeeded(context);
                }
                resolvePush(callbackId, token, permission);
            });
        } catch (RuntimeException exception) {
            Log.w(TAG, "Firebase push is unavailable", exception);
            resolvePush(callbackId, null, permission);
        }
    }

    private void resolvePush(String callbackId, String token, String permission) {
        try {
            activity.resolve(callbackId, new JSONObject().put("token", token == null ? JSONObject.NULL : token).put("permission", permission));
        } catch (JSONException exception) {
            activity.reject(callbackId, "native_error", "Could not read the push token.");
        }
    }

    private JSONObject alarmPermission() throws JSONException {
        return new JSONObject()
            .put("permission", GameAlarms.canScheduleExact(context) ? "granted" : "denied")
            .put("mode", "exact")
            .put("notifications", pushPermission());
    }

    private void scheduleGameAlarm(String callbackId, JSONObject args) {
        try {
            activity.resolve(callbackId, GameAlarms.schedule(context, args));
        } catch (GameAlarms.AlarmException exception) {
            activity.reject(callbackId, exception.code, exception.getMessage());
        } catch (JSONException | RuntimeException exception) {
            Log.e(TAG, "Could not schedule the game alarm", exception);
            activity.reject(callbackId, "alarm_failed", "Could not set the alarm. Please try again.");
        }
    }

    private void requestExactAlarms(String callbackId) {
        try {
            if (GameAlarms.canScheduleExact(context) || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                activity.resolve(callbackId, alarmPermission());
                return;
            }
            openSettings("alarms");
            activity.resolve(callbackId, alarmPermission().put("permission", "pending"));
        } catch (JSONException exception) {
            activity.reject(callbackId, "native_error", "Could not open alarm settings.");
        }
    }

    @SuppressWarnings("MissingPermission")
    private void getCurrentPosition(String callbackId, long timeoutMs) {
        if (!locationPermission().equals("granted")) {
            activity.reject(callbackId, "permission_denied", "Location access is off for BCCB Cricket.");
            return;
        }
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (manager != null && !LocationManagerCompat.isLocationEnabled(manager)) {
            activity.reject(callbackId, "location_off", "Turn on Location in your phone settings.");
            return;
        }
        FusedLocationProviderClient client = LocationServices.getFusedLocationProviderClient(context);
        CurrentLocationRequest request = new CurrentLocationRequest.Builder()
            .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
            .setMaxUpdateAgeMillis(60_000)
            .setDurationMillis(Math.max(5_000, Math.min(timeoutMs, 30_000)))
            .build();
        try {
            client.getCurrentLocation(request, new CancellationTokenSource().getToken())
                .addOnSuccessListener(location -> {
                    if (location != null) {
                        resolvePosition(callbackId, location);
                    } else {
                        lastKnownPosition(client, callbackId);
                    }
                })
                .addOnFailureListener(exception -> lastKnownPosition(client, callbackId));
        } catch (SecurityException exception) {
            activity.reject(callbackId, "permission_denied", "Location access is off for BCCB Cricket.");
        }
    }

    @SuppressWarnings("MissingPermission")
    private void lastKnownPosition(FusedLocationProviderClient client, String callbackId) {
        try {
            client.getLastLocation()
                .addOnSuccessListener(location -> {
                    if (location != null) {
                        resolvePosition(callbackId, location);
                    } else {
                        activity.reject(callbackId, "position_unavailable", "We couldn't find your location. Try again outdoors or check Location is on.");
                    }
                })
                .addOnFailureListener(exception -> activity.reject(callbackId, "position_unavailable", "We couldn't find your location."));
        } catch (SecurityException exception) {
            activity.reject(callbackId, "permission_denied", "Location access is off for BCCB Cricket.");
        }
    }

    private void resolvePosition(String callbackId, Location location) {
        try {
            activity.resolve(callbackId, new JSONObject()
                .put("lat", location.getLatitude())
                .put("lng", location.getLongitude())
                .put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL)
                .put("timestamp", location.getTime()));
        } catch (JSONException exception) {
            activity.reject(callbackId, "position_unavailable", "We couldn't read your location.");
        }
    }

    private void startTrip(String callbackId, JSONObject args) throws JSONException {
        if (!locationPermission().equals("granted")) {
            activity.reject(callbackId, "permission_denied", "Location access is off for BCCB Cricket.");
            return;
        }
        SessionStore.Session session = SessionStore.load(context);
        String gameDayId = args.optString("gameDayId", "");
        if (session == null || gameDayId.isEmpty()) {
            activity.reject(callbackId, "no_session", "Join Game Day on this phone first.");
            return;
        }
        long stopAfter = args.optLong("stopAfter", 0);
        if (stopAfter > 0 && stopAfter <= System.currentTimeMillis()) {
            activity.reject(callbackId, "trip_closed", "Trip sharing has closed for this game.");
            return;
        }
        TripState.start(
            context,
            gameDayId,
            args.optLong("groupId", session.groupId),
            args.optDouble("venueLat"),
            args.optDouble("venueLng"),
            args.optString("venueName", "the ground"),
            stopAfter
        );
        try {
            TripTrackingService.start(context);
            activity.resolve(callbackId, new JSONObject().put("started", true).put("startedAt", TripState.startedAt(context)));
        } catch (RuntimeException exception) {
            TripState.stop(context, false, "Could not start trip sharing.");
            activity.reject(callbackId, "start_failed", "Could not start trip sharing. Keep the app open and try again.");
        }
    }

    private void openSettings(String target) {
        String packageName = context.getPackageName();
        Intent intent;
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if ("notifications".equals(target) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName);
        } else if ("alarms".equals(target) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + packageName));
        } else if ("location".equals(target) && manager != null && !LocationManagerCompat.isLocationEnabled(manager)) {
            intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + packageName));
        }
        try {
            activity.startActivity(intent);
        } catch (ActivityNotFoundException exception) {
            activity.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + packageName)));
        }
    }

    private void openExternalUrl(String callbackId, String url) {
        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("https") && !scheme.equals("http") && !scheme.equals("geo")) {
            activity.reject(callbackId, "invalid_url", "That link can't be opened.");
            return;
        }
        try {
            activity.startActivity(new Intent(Intent.ACTION_VIEW, uri));
            activity.resolve(callbackId, new JSONObject());
        } catch (ActivityNotFoundException exception) {
            activity.reject(callbackId, "no_app", "No app on this phone can open that link.");
        }
    }
}
