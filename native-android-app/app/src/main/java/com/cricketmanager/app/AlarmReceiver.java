package com.cricketmanager.app;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

/** Rings the game-day alarm and posts the time-to-leave nudge. */
public class AlarmReceiver extends BroadcastReceiver {
    static final String ACTION_FIRE = "com.cricketmanager.app.alarm.FIRE";
    static final String ACTION_LEAVE = "com.cricketmanager.app.alarm.LEAVE";
    static final String ACTION_STOP = "com.cricketmanager.app.alarm.STOP";
    static final String EXTRA_ALARM_ID = "com.cricketmanager.app.extra.ALARM_ID";
    private static final long RING_TIMEOUT_MS = 10L * 60 * 1000;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            Notifications.cancel(context, intent.getIntExtra(Notifications.EXTRA_NOTIFICATION_ID, 0));
            return;
        }

        String id = intent.getStringExtra(EXTRA_ALARM_ID);
        JSONObject alarm = id == null ? null : GameAlarms.find(context, id);
        if (alarm == null) {
            return;
        }
        Notifications.ensureChannels(context);
        if (ACTION_FIRE.equals(action)) {
            ring(context, alarm);
        } else if (ACTION_LEAVE.equals(action)) {
            nudgeToLeave(context, alarm);
        }
    }

    private static PendingIntent startTripIntent(Context context, JSONObject alarm, int requestCode) {
        String gameDayId = alarm.optString("gameDayId");
        return Notifications.openApp(
            context,
            requestCode,
            "bccb://game-day/" + gameDayId + "/trip",
            "start_trip",
            "leave_now",
            gameDayId,
            alarm.optLong("groupId")
        );
    }

    private void ring(Context context, JSONObject alarm) {
        String gameDayId = alarm.optString("gameDayId");
        int notificationId = Notifications.idFor("alarm:" + gameDayId);
        Intent stop = new Intent(context, AlarmReceiver.class)
            .setAction(ACTION_STOP)
            .putExtra(Notifications.EXTRA_NOTIFICATION_ID, notificationId);
        PendingIntent stopIntent = PendingIntent.getBroadcast(
            context,
            notificationId,
            stop,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = Notifications.base(context, Notifications.CHANNEL_ALARMS, alarm.optString("title"), alarm.optString("body"))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(false)
            .setOngoing(true)
            .setTimeoutAfter(RING_TIMEOUT_MS)
            .setContentIntent(Notifications.openApp(
                context,
                notificationId,
                "bccb://game-day/" + gameDayId,
                "open",
                "alarm",
                gameDayId,
                alarm.optLong("groupId")
            ))
            .setDeleteIntent(stopIntent)
            .addAction(0, "⏹ Stop", stopIntent)
            .addAction(0, "🚗 Start trip", startTripIntent(context, alarm, notificationId + 1));
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setSound(Notifications.alarmSound(), AudioManager.STREAM_ALARM)
                .setVibrate(Notifications.ALARM_VIBRATION);
        }
        android.app.Notification notification = builder.build();
        notification.flags |= android.app.Notification.FLAG_INSISTENT;
        if (Notifications.hasPostPermission(context)) {
            try {
                androidx.core.app.NotificationManagerCompat.from(context).notify(notificationId, notification);
            } catch (SecurityException exception) {
                // Notifications were turned off after the alarm was set.
            }
        }
    }

    private void nudgeToLeave(Context context, JSONObject alarm) {
        String gameDayId = alarm.optString("gameDayId");
        int notificationId = Notifications.idFor("leave:" + gameDayId);
        Notifications.cancel(context, Notifications.idFor("alarm:" + gameDayId));
        NotificationCompat.Builder builder = Notifications.base(
                context,
                Notifications.CHANNEL_REMINDERS,
                alarm.optString("leaveTitle"),
                alarm.optString("leaveBody")
            )
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(startTripIntent(context, alarm, notificationId))
            .addAction(0, "🚗 Start trip", startTripIntent(context, alarm, notificationId + 1));
        Notifications.post(context, notificationId, builder);
    }
}
