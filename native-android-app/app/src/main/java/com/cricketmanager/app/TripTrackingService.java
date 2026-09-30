package com.cricketmanager.app;

import android.Manifest;
import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;

/**
 * Shares the player's live location with the group while they travel to the ground. Runs as a
 * location foreground service started from the app, so only while-in-use location access is needed.
 */
public class TripTrackingService extends Service {
    static final String ACTION_START = "com.cricketmanager.app.trip.START";
    static final String ACTION_STOP = "com.cricketmanager.app.trip.STOP";
    static final String EXTRA_REMOTE_DELETE = "com.cricketmanager.app.extra.REMOTE_DELETE";

    private static final String TAG = "TripTracking";
    private static final int NOTIFICATION_ID = 4242;
    private static final long UPDATE_INTERVAL_MS = 20_000;
    private static final long MIN_UPLOAD_INTERVAL_MS = 15_000;
    private static final float ARRIVAL_RADIUS_METERS = 150f;

    private final ExecutorService uploads = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable autoStop = () -> finish(false, false, null);
    private static volatile boolean running;
    private FusedLocationProviderClient locations;
    private LocationCallback callback;
    private long lastUploadAt;
    private boolean stopping;
    private int latestStartId;

    static void start(Context context) {
        Intent intent = new Intent(context, TripTrackingService.class).setAction(ACTION_START);
        ContextCompat.startForegroundService(context, intent);
    }

    /**
     * Restarts sharing if the app process was killed mid-trip, or closes a trip that has ended.
     * Call only while the app is in the foreground.
     */
    static void resumeIfNeeded(Context context) {
        if (running || !TripState.isActive(context)) {
            return;
        }
        long stopAfter = TripState.prefs(context).getLong("stopAfter", 0);
        boolean permitted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if ((stopAfter > 0 && stopAfter <= System.currentTimeMillis()) || !permitted) {
            TripState.stop(context, false, null);
            return;
        }
        try {
            start(context);
        } catch (RuntimeException exception) {
            TripState.stop(context, false, "Open the app to start sharing your trip.");
        }
    }

    static void stop(Context context, boolean deleteRemote) {
        if (!TripState.isActive(context)) {
            return;
        }
        Intent intent = new Intent(context, TripTrackingService.class)
            .setAction(ACTION_STOP)
            .putExtra(EXTRA_REMOTE_DELETE, deleteRemote);
        try {
            context.startService(intent);
        } catch (IllegalStateException exception) {
            TripState.stop(context, false, null);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        latestStartId = startId;
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            finish(false, intent.getBooleanExtra(EXTRA_REMOTE_DELETE, false), null);
            return START_NOT_STICKY;
        }

        // Starts come from startForegroundService(), so Android requires startForeground() before this
        // service may stop, even when the trip turns out to be over already.
        try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                buildNotification(),
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION : 0
            );
        } catch (RuntimeException exception) {
            Log.w(TAG, "Could not start trip sharing in the foreground.", exception);
            TripState.stop(this, false, "Open the app to start sharing your trip.");
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        stopping = false;
        lastUploadAt = 0;

        long stopAfter = TripState.prefs(this).getLong("stopAfter", 0);
        if (!TripState.isActive(this) || !hasLocationPermission() || (stopAfter > 0 && stopAfter <= System.currentTimeMillis())) {
            finish(false, false, hasLocationPermission() ? null : "Location access is off.");
            return START_NOT_STICKY;
        }

        startLocationUpdates();
        running = true;
        handler.removeCallbacks(autoStop);
        if (stopAfter > 0) {
            handler.postDelayed(autoStop, stopAfter - System.currentTimeMillis());
        }
        return START_NOT_STICKY;
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private Notification buildNotification() {
        Notifications.ensureChannels(this);
        String gameDayId = TripState.gameDayId(this);
        long groupId = TripState.prefs(this).getLong("groupId", 0);
        String venue = TripState.prefs(this).getString("venueName", "the ground");
        Intent stop = new Intent(this, TripTrackingService.class)
            .setAction(ACTION_STOP)
            .putExtra(EXTRA_REMOTE_DELETE, true);
        PendingIntent stopIntent = PendingIntent.getService(
            this,
            NOTIFICATION_ID,
            stop,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        return Notifications.base(this, Notifications.CHANNEL_TRIP, "📡 Sharing your trip", "Heading to " + venue + ". The group can see you on the Game Day map.")
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(Notifications.openApp(this, NOTIFICATION_ID, "bccb://game-day/" + gameDayId + "/trip", "open", "trip", gameDayId, groupId))
            .addAction(0, "⏹ Stop sharing", stopIntent)
            .build();
    }

    @SuppressWarnings("MissingPermission")
    private void startLocationUpdates() {
        if (callback != null) {
            return;
        }
        locations = LocationServices.getFusedLocationProviderClient(this);
        callback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location location = result.getLastLocation();
                if (location != null) {
                    onLocation(location);
                }
            }
        };
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateIntervalMillis(MIN_UPLOAD_INTERVAL_MS / 2)
            .setWaitForAccurateLocation(false)
            .build();
        try {
            locations.requestLocationUpdates(request, callback, Looper.getMainLooper());
        } catch (SecurityException exception) {
            finish(false, false, "Location access is off.");
        }
    }

    private void onLocation(Location location) {
        if (stopping) {
            return;
        }
        long now = System.currentTimeMillis();
        boolean nearVenue = distanceToVenue(location) <= ARRIVAL_RADIUS_METERS;
        if (!nearVenue && now - lastUploadAt < MIN_UPLOAD_INTERVAL_MS) {
            return;
        }
        lastUploadAt = now;
        long trip = TripState.startedAt(this);
        runOnUploadThread(() -> upload(location, trip));
    }

    /** True while {@code trip} is still the trip being shared; replies for earlier trips are ignored. */
    private boolean isCurrentTrip(long trip) {
        return TripState.isActive(this) && TripState.startedAt(this) == trip;
    }

    private void finishIfCurrent(long trip, boolean arrived, String error) {
        handler.post(() -> {
            if (isCurrentTrip(trip)) {
                finish(arrived, false, error);
            }
        });
    }

    private float distanceToVenue(Location location) {
        try {
            float[] result = new float[1];
            Location.distanceBetween(
                location.getLatitude(),
                location.getLongitude(),
                Double.parseDouble(TripState.prefs(this).getString("venueLat", "0")),
                Double.parseDouble(TripState.prefs(this).getString("venueLng", "0")),
                result
            );
            return result[0];
        } catch (NumberFormatException exception) {
            return Float.MAX_VALUE;
        }
    }

    private void upload(Location location, long trip) {
        if (!isCurrentTrip(trip)) {
            return;
        }
        SessionStore.Session session = SessionStore.load(this);
        String gameDayId = TripState.gameDayId(this);
        if (session == null || gameDayId == null) {
            finishIfCurrent(trip, false, "Sign in to your group again to share your trip.");
            return;
        }
        JSONObject body = new JSONObject();
        try {
            body.put("lat", location.getLatitude()).put("lng", location.getLongitude());
            if (location.hasAccuracy()) body.put("accuracy", Math.min(location.getAccuracy(), 100000));
            if (location.hasBearing()) body.put("heading", location.getBearing());
            if (location.hasSpeed()) body.put("speed", Math.min(location.getSpeed(), 150));
            if (trip > 0) body.put("tripStartedAt", trip);
        } catch (JSONException exception) {
            return;
        }
        BccbApi.Result result = BccbApi.groupRequest(session, "POST", "/game-days/" + gameDayId + "/trip", body);
        if (!isCurrentTrip(trip)) {
            return;
        }
        if (result.ok()) {
            TripState.recordUpdate(this);
            if (result.body != null && result.body.optBoolean("arrived", false)) {
                finishIfCurrent(trip, true, null);
            }
        } else if (result.error != null || result.status >= 500 || result.status == 429) {
            TripState.recordError(this, "No connection. Retrying…");
        } else {
            finishIfCurrent(trip, false, result.message("Trip sharing stopped."));
        }
    }

    private void runOnUploadThread(Runnable task) {
        try {
            uploads.execute(task);
        } catch (RejectedExecutionException exception) {
            Log.w(TAG, "Trip sharing has already shut down.", exception);
        }
    }

    private void finish(boolean arrived, boolean deleteRemote, String error) {
        if (stopping) {
            return;
        }
        stopping = true;
        handler.removeCallbacks(autoStop);
        if (locations != null && callback != null) {
            locations.removeLocationUpdates(callback);
        }
        callback = null;

        boolean wasActive = TripState.isActive(this);
        String gameDayId = TripState.gameDayId(this);
        long trip = TripState.startedAt(this);
        String venue = TripState.prefs(this).getString("venueName", "the ground");
        long groupId = TripState.prefs(this).getLong("groupId", 0);
        if (wasActive) {
            TripState.stop(this, arrived, error);
        }
        if (arrived) {
            Notifications.post(this, Notifications.idFor("arrived:" + gameDayId), Notifications.base(
                    this,
                    Notifications.CHANNEL_REMINDERS,
                    "🏏 You've arrived",
                    "You made it to " + venue + ". Trip sharing has stopped."
                )
                .setContentIntent(Notifications.openApp(this, NOTIFICATION_ID + 1, "bccb://game-day/" + gameDayId, "open", "arrived", gameDayId, groupId)));
        }
        if (deleteRemote && gameDayId != null) {
            SessionStore.Session session = SessionStore.load(this);
            String path = "/game-days/" + gameDayId + "/trip" + (trip > 0 ? "?tripStartedAt=" + trip : "");
            if (session != null) {
                runOnUploadThread(() -> BccbApi.groupRequest(session, "DELETE", path, null));
            }
        }
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        // Stop only if no new trip has started by the time pending uploads finish.
        int stopId = latestStartId;
        runOnUploadThread(() -> stopSelf(stopId));
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacks(autoStop);
        if (locations != null && callback != null) {
            locations.removeLocationUpdates(callback);
        }
        uploads.shutdown();
        super.onDestroy();
    }
}
