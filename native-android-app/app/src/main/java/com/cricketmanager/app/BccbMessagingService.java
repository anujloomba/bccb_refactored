package com.cricketmanager.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;

/** Receives Game Day pushes and renders them with In / Maybe / Out reply actions. */
public class BccbMessagingService extends FirebaseMessagingService {
    static final String CATEGORY_GAME_INVITE = "GAME_INVITE";

    @Override
    public void onNewToken(@NonNull String token) {
        SessionStore.setPushToken(this, token);
        PushTokens.uploadIfNeeded(this);
        try {
            MainActivity.emitIfAlive("pushToken", new JSONObject().put("token", token));
        } catch (JSONException exception) {
            // The payload contains only strings; this cannot happen.
        }
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        if (data.isEmpty()) {
            return;
        }
        SessionStore.Session session = SessionStore.load(this);
        long groupId = parseLong(data.get("groupId"));
        if (session == null || session.groupId != groupId) {
            return;
        }

        String type = value(data, "type");
        String gameDayId = value(data, "gameDayId");
        String title = value(data, "title");
        String body = value(data, "body");
        String route = value(data, "route");
        if ("game_cancelled".equals(type) && !gameDayId.isEmpty()) {
            GameAlarms.cancelForGame(this, gameDayId);
        }

        Notifications.ensureChannels(this);
        int notificationId = Notifications.idFor("game:" + gameDayId);
        String channel = "alarm_reminder".equals(type) ? Notifications.CHANNEL_REMINDERS : Notifications.CHANNEL_INVITES;
        NotificationCompat.Builder builder = Notifications.base(this, channel, title, body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory("alarm_reminder".equals(type) ? NotificationCompat.CATEGORY_REMINDER : NotificationCompat.CATEGORY_EVENT)
            .setContentIntent(Notifications.openApp(this, notificationId, route, "open", type, gameDayId, groupId));
        if (CATEGORY_GAME_INVITE.equals(data.get("category")) && session.playerId != null) {
            builder.addAction(0, "✅ In", rsvpIntent(this, notificationId, gameDayId, groupId, "yes", title))
                .addAction(0, "🤔 Maybe", rsvpIntent(this, notificationId, gameDayId, groupId, "maybe", title))
                .addAction(0, "❌ Out", rsvpIntent(this, notificationId, gameDayId, groupId, "no", title));
        }
        Notifications.post(this, notificationId, builder);

        try {
            MainActivity.emitIfAlive("pushReceived", new JSONObject()
                .put("type", type)
                .put("groupId", groupId)
                .put("gameDayId", gameDayId)
                .put("route", route)
                .put("title", title)
                .put("body", body));
        } catch (JSONException exception) {
            // The payload contains only strings and numbers; this cannot happen.
        }
    }

    static PendingIntent rsvpIntent(Context context, int notificationId, String gameDayId, long groupId, String response, String title) {
        Intent intent = new Intent(context, NotificationActionReceiver.class)
            .setAction(NotificationActionReceiver.ACTION_RSVP + "." + response)
            .putExtra(NotificationActionReceiver.EXTRA_RESPONSE, response)
            .putExtra(NotificationActionReceiver.EXTRA_TITLE, title)
            .putExtra(Notifications.EXTRA_GAME_DAY_ID, gameDayId)
            .putExtra(Notifications.EXTRA_GROUP_ID, groupId)
            .putExtra(Notifications.EXTRA_NOTIFICATION_ID, notificationId);
        return PendingIntent.getBroadcast(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    private static String value(Map<String, String> data, String key) {
        String value = data.get(key);
        return value == null ? "" : value;
    }

    private static long parseLong(String value) {
        try {
            return value == null ? 0 : Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return 0;
        }
    }
}
