package com.cricketmanager.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Notification channels, deep-link intents, and shared notification styling. */
final class Notifications {
    static final String CHANNEL_INVITES = "game_invites";
    static final String CHANNEL_REMINDERS = "game_reminders";
    static final String CHANNEL_ALARMS = "game_alarms";
    static final String CHANNEL_TRIP = "trip_sharing";

    static final String EXTRA_ROUTE = "com.cricketmanager.app.extra.ROUTE";
    static final String EXTRA_ACTION = "com.cricketmanager.app.extra.ACTION";
    static final String EXTRA_TYPE = "com.cricketmanager.app.extra.TYPE";
    static final String EXTRA_GAME_DAY_ID = "com.cricketmanager.app.extra.GAME_DAY_ID";
    static final String EXTRA_GROUP_ID = "com.cricketmanager.app.extra.GROUP_ID";
    static final String EXTRA_NOTIFICATION_ID = "com.cricketmanager.app.extra.NOTIFICATION_ID";

    static final int ACCENT = Color.parseColor("#764BA2");
    static final long[] ALARM_VIBRATION = {0, 800, 400, 800, 400, 800};

    private Notifications() {
    }

    static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel invites = new NotificationChannel(CHANNEL_INVITES, "Game invites", NotificationManager.IMPORTANCE_HIGH);
        invites.setDescription("New game days, changes, cancellations, and reply reminders.");
        manager.createNotificationChannel(invites);

        NotificationChannel reminders = new NotificationChannel(CHANNEL_REMINDERS, "Game reminders", NotificationManager.IMPORTANCE_HIGH);
        reminders.setDescription("The day-before alarm reminder and the time-to-leave nudge.");
        manager.createNotificationChannel(reminders);

        NotificationChannel alarms = new NotificationChannel(CHANNEL_ALARMS, "Game-day alarms", NotificationManager.IMPORTANCE_HIGH);
        alarms.setDescription("Wake-up alarms you set for game days.");
        alarms.setSound(alarmSound(), new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build());
        alarms.enableVibration(true);
        alarms.setVibrationPattern(ALARM_VIBRATION);
        alarms.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(alarms);

        NotificationChannel trip = new NotificationChannel(CHANNEL_TRIP, "Live trip sharing", NotificationManager.IMPORTANCE_LOW);
        trip.setDescription("Shown while the group can see your trip to the ground.");
        manager.createNotificationChannel(trip);
    }

    static Uri alarmSound() {
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        return sound != null ? sound : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
    }

    static int idFor(String key) {
        return key.hashCode() & 0x7fffffff;
    }

    static boolean hasPostPermission(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    static Intent appIntent(Context context, String route, String action, String type, String gameDayId, long groupId) {
        Intent intent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(EXTRA_ROUTE, route)
            .putExtra(EXTRA_ACTION, action)
            .putExtra(EXTRA_TYPE, type)
            .putExtra(EXTRA_GAME_DAY_ID, gameDayId)
            .putExtra(EXTRA_GROUP_ID, groupId);
        if (route != null) {
            intent.setData(Uri.parse(route + (route.contains("?") ? "&" : "?") + "notification=" + action));
        }
        return intent;
    }

    static PendingIntent openApp(Context context, int requestCode, String route, String action, String type, String gameDayId, long groupId) {
        return PendingIntent.getActivity(
            context,
            requestCode,
            appIntent(context, route, action, type, gameDayId, groupId),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    static NotificationCompat.Builder base(Context context, String channel, String title, String body) {
        return new NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_bccb)
            .setColor(ACCENT)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true);
    }

    @SuppressWarnings("MissingPermission")
    static void post(Context context, int id, NotificationCompat.Builder builder) {
        if (!hasPostPermission(context)) {
            return;
        }
        try {
            NotificationManagerCompat.from(context).notify(id, builder.build());
        } catch (SecurityException exception) {
            // Notifications were disabled between the check and the post.
        }
    }

    static void cancel(Context context, int id) {
        NotificationManagerCompat.from(context).cancel(id);
    }
}
