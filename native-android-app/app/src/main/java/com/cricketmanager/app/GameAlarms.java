package com.cricketmanager.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.AlarmClock;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Iterator;
import java.util.Locale;

/** Schedules game-day wake-up alarms and time-to-leave nudges, and restores them after reboots. */
final class GameAlarms {
    private static final String TAG = "GameAlarms";
    private static final String PREFS = "bccb_game_alarms";
    private static final long CLOCK_APP_WINDOW_MS = 23L * 60 * 60 * 1000 + 30L * 60 * 1000;
    private static final long KEEP_AFTER_FIRE_MS = 6L * 60 * 60 * 1000;

    static final String MODE_EXACT = "exact";
    static final String MODE_CLOCK = "clock";

    static final class AlarmException extends Exception {
        final String code;

        AlarmException(String code, String message) {
            super(message);
            this.code = code;
        }
    }

    private GameAlarms() {
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean canScheduleExact(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        return manager != null && manager.canScheduleExactAlarms();
    }

    static JSONObject schedule(Context context, JSONObject args) throws AlarmException, JSONException {
        String id = args.optString("id", "");
        long alarmAt = args.optLong("alarmAt", 0);
        long leaveAt = args.optLong("leaveAt", 0);
        long now = System.currentTimeMillis();
        if (id.isEmpty() || alarmAt <= now) {
            throw new AlarmException("invalid_time", "Choose an alarm time in the future.");
        }

        JSONObject alarm = new JSONObject()
            .put("id", id)
            .put("gameDayId", args.optString("gameDayId", ""))
            .put("groupId", args.optLong("groupId", 0))
            .put("alarmAt", alarmAt)
            .put("leaveAt", leaveAt)
            .put("title", args.optString("title", "Game day"))
            .put("body", args.optString("body", ""))
            .put("leaveTitle", args.optString("leaveTitle", "Time to leave"))
            .put("leaveBody", args.optString("leaveBody", ""))
            .put("venueName", args.optString("venueName", ""));

        boolean useClockApp = args.optBoolean("useClockApp", false);
        // Check everything before touching the existing alarm, so a failed change leaves it in place.
        if (useClockApp) {
            if (alarmAt - now > CLOCK_APP_WINDOW_MS) {
                throw new AlarmException(
                    "too_early",
                    "Your Clock app can only set this alarm within 24 hours of it ringing. Try again the day before, or allow exact alarms."
                );
            }
        } else {
            if (!canScheduleExact(context)) {
                throw new AlarmException("exact_alarm_denied", "Allow alarms and reminders for BCCB Cricket first.");
            }
            if (!Notifications.hasPostPermission(context)) {
                throw new AlarmException("notifications_denied", "Turn on notifications for BCCB Cricket so your alarm can ring.");
            }
        }

        cancel(context, id);
        if (useClockApp) {
            setClockAppAlarm(context, alarm);
            alarm.put("mode", MODE_CLOCK);
        } else {
            alarm.put("mode", MODE_EXACT);
            scheduleWakeUp(context, alarm);
        }
        scheduleLeaveNudge(context, alarm);
        store(context, alarm);

        return new JSONObject()
            .put("scheduled", true)
            .put("mode", alarm.getString("mode"))
            .put("alarmAt", alarmAt);
    }

    private static PendingIntent receiverIntent(Context context, String action, String id, int flags) {
        Intent intent = new Intent(context, AlarmReceiver.class)
            .setAction(action)
            .setData(Uri.parse("bccb-alarm://" + action.substring(action.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) + "/" + Uri.encode(id)))
            .putExtra(AlarmReceiver.EXTRA_ALARM_ID, id);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | flags);
    }

    private static void scheduleWakeUp(Context context, JSONObject alarm) {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) {
            return;
        }
        long alarmAt = alarm.optLong("alarmAt");
        PendingIntent fire = receiverIntent(context, AlarmReceiver.ACTION_FIRE, alarm.optString("id"), PendingIntent.FLAG_UPDATE_CURRENT);
        try {
            PendingIntent show = Notifications.openApp(
                context,
                Notifications.idFor("show:" + alarm.optString("id")),
                "bccb://game-day/" + alarm.optString("gameDayId") + "/alarm",
                "open",
                "alarm",
                alarm.optString("gameDayId"),
                alarm.optLong("groupId")
            );
            manager.setAlarmClock(new AlarmManager.AlarmClockInfo(alarmAt, show), fire);
        } catch (SecurityException exception) {
            Log.w(TAG, "Exact alarms are not allowed; using the closest allowed time.", exception);
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarmAt, fire);
        }
    }

    private static void scheduleLeaveNudge(Context context, JSONObject alarm) {
        long leaveAt = alarm.optLong("leaveAt");
        if (leaveAt <= System.currentTimeMillis()) {
            return;
        }
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        if (manager == null) {
            return;
        }
        PendingIntent leave = receiverIntent(context, AlarmReceiver.ACTION_LEAVE, alarm.optString("id"), PendingIntent.FLAG_UPDATE_CURRENT);
        if (canScheduleExact(context)) {
            try {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, leaveAt, leave);
                return;
            } catch (SecurityException exception) {
                Log.w(TAG, "Exact leave reminder was not allowed.", exception);
            }
        }
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, leaveAt, leave);
    }

    private static void setClockAppAlarm(Context context, JSONObject alarm) throws AlarmException {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(alarm.optLong("alarmAt"));
        Intent intent = new Intent(AlarmClock.ACTION_SET_ALARM)
            .putExtra(AlarmClock.EXTRA_HOUR, calendar.get(Calendar.HOUR_OF_DAY))
            .putExtra(AlarmClock.EXTRA_MINUTES, calendar.get(Calendar.MINUTE))
            .putExtra(AlarmClock.EXTRA_MESSAGE, alarm.optString("title"))
            .putExtra(AlarmClock.EXTRA_VIBRATE, true)
            .putExtra(AlarmClock.EXTRA_SKIP_UI, true)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException exception) {
            throw new AlarmException("no_clock_app", "No Clock app on this phone can take the alarm. Allow exact alarms instead.");
        }
    }

    static JSONObject cancel(Context context, String id) throws JSONException {
        AlarmManager manager = context.getSystemService(AlarmManager.class);
        JSONObject existing = find(context, id);
        if (manager != null) {
            PendingIntent fire = receiverIntent(context, AlarmReceiver.ACTION_FIRE, id, PendingIntent.FLAG_NO_CREATE);
            if (fire != null) {
                manager.cancel(fire);
                fire.cancel();
            }
            PendingIntent leave = receiverIntent(context, AlarmReceiver.ACTION_LEAVE, id, PendingIntent.FLAG_NO_CREATE);
            if (leave != null) {
                manager.cancel(leave);
                leave.cancel();
            }
        }
        remove(context, id);
        JSONObject result = new JSONObject().put("cancelled", existing != null);
        if (existing != null && MODE_CLOCK.equals(existing.optString("mode"))) {
            result.put("clockAlarmRemains", true);
        }
        return result;
    }

    static void cancelForGame(Context context, String gameDayId) {
        JSONObject all = all(context);
        Iterator<String> keys = all.keys();
        while (keys.hasNext()) {
            String id = keys.next();
            JSONObject alarm = all.optJSONObject(id);
            if (alarm != null && gameDayId.equals(alarm.optString("gameDayId"))) {
                try {
                    cancel(context, id);
                } catch (JSONException exception) {
                    Log.w(TAG, "Could not cancel alarm " + id, exception);
                }
                Notifications.cancel(context, Notifications.idFor("alarm:" + gameDayId));
            }
        }
    }

    static void cancelAll(Context context) {
        JSONObject all = all(context);
        Iterator<String> keys = all.keys();
        while (keys.hasNext()) {
            String id = keys.next();
            try {
                cancel(context, id);
            } catch (JSONException exception) {
                Log.w(TAG, "Could not cancel alarm " + id, exception);
            }
        }
        prefs(context).edit().clear().apply();
    }

    static JSONArray list(Context context) throws JSONException {
        JSONArray alarms = new JSONArray();
        JSONObject all = all(context);
        Iterator<String> keys = all.keys();
        long now = System.currentTimeMillis();
        while (keys.hasNext()) {
            JSONObject alarm = all.optJSONObject(keys.next());
            if (alarm != null && alarm.optLong("alarmAt") > now - KEEP_AFTER_FIRE_MS) {
                alarms.put(new JSONObject()
                    .put("id", alarm.optString("id"))
                    .put("gameDayId", alarm.optString("gameDayId"))
                    .put("alarmAt", alarm.optLong("alarmAt"))
                    .put("leaveAt", alarm.optLong("leaveAt"))
                    .put("mode", alarm.optString("mode")));
            }
        }
        return alarms;
    }

    /** Re-arms stored alarms after a reboot, app update, clock change, or exact-alarm permission change. */
    static void rescheduleAll(Context context) {
        JSONObject all = all(context);
        Iterator<String> keys = all.keys();
        long now = System.currentTimeMillis();
        while (keys.hasNext()) {
            String id = keys.next();
            JSONObject alarm = all.optJSONObject(id);
            if (alarm == null) {
                continue;
            }
            if (alarm.optLong("alarmAt") <= now && alarm.optLong("leaveAt") <= now) {
                if (alarm.optLong("alarmAt") < now - KEEP_AFTER_FIRE_MS) {
                    remove(context, id);
                }
                continue;
            }
            if (MODE_EXACT.equals(alarm.optString("mode")) && alarm.optLong("alarmAt") > now) {
                scheduleWakeUp(context, alarm);
            }
            scheduleLeaveNudge(context, alarm);
        }
    }

    static JSONObject find(Context context, String id) {
        return all(context).optJSONObject(id);
    }

    private static JSONObject all(Context context) {
        try {
            return new JSONObject(prefs(context).getString("alarms", "{}"));
        } catch (JSONException exception) {
            return new JSONObject();
        }
    }

    private static void store(Context context, JSONObject alarm) throws JSONException {
        JSONObject all = all(context);
        all.put(alarm.getString("id"), alarm);
        prefs(context).edit().putString("alarms", all.toString()).apply();
    }

    private static void remove(Context context, String id) {
        JSONObject all = all(context);
        all.remove(id);
        prefs(context).edit().putString("alarms", all.toString()).apply();
    }
}
