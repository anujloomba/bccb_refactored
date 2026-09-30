package com.cricketmanager.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Saves In / Maybe / Out replies straight from a notification, without opening the app. */
public class NotificationActionReceiver extends BroadcastReceiver {
    static final String ACTION_RSVP = "com.cricketmanager.app.action.RSVP";
    static final String EXTRA_RESPONSE = "com.cricketmanager.app.extra.RESPONSE";
    static final String EXTRA_TITLE = "com.cricketmanager.app.extra.TITLE";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null || !action.startsWith(ACTION_RSVP)) {
            return;
        }
        String response = intent.getStringExtra(EXTRA_RESPONSE);
        String gameDayId = intent.getStringExtra(Notifications.EXTRA_GAME_DAY_ID);
        String title = intent.getStringExtra(EXTRA_TITLE);
        long groupId = intent.getLongExtra(Notifications.EXTRA_GROUP_ID, 0);
        int notificationId = intent.getIntExtra(Notifications.EXTRA_NOTIFICATION_ID, 0);
        if (response == null || gameDayId == null) {
            return;
        }

        Context appContext = context.getApplicationContext();
        PendingResult pending = goAsync();
        EXECUTOR.execute(() -> {
            try {
                saveReply(appContext, groupId, gameDayId, response, title, notificationId);
            } finally {
                pending.finish();
            }
        });
    }

    private static void saveReply(Context context, long groupId, String gameDayId, String response, String title, int notificationId) {
        String route = "bccb://game-day/" + gameDayId;
        SessionStore.Session session = SessionStore.load(context);
        String resultTitle;
        String resultBody;
        if (session == null || session.groupId != groupId) {
            resultTitle = "Open BCCB Cricket to reply";
            resultBody = "This invite is for a group you are not signed in to on this phone.";
        } else {
            BccbApi.Result result;
            try {
                result = BccbApi.groupRequest(session, "PUT", "/game-days/" + gameDayId + "/rsvp", new JSONObject().put("response", response));
            } catch (JSONException exception) {
                return;
            }
            if (result.ok()) {
                resultTitle = "yes".equals(response) ? "✅ You're in" : "maybe".equals(response) ? "🤔 Marked as maybe" : "❌ Marked as out";
                resultBody = title == null ? "Your reply has been saved." : title;
                try {
                    MainActivity.emitIfAlive("pushReceived", new JSONObject()
                        .put("type", "rsvp_saved")
                        .put("groupId", groupId)
                        .put("gameDayId", gameDayId)
                        .put("route", route)
                        .put("title", resultTitle)
                        .put("body", resultBody));
                } catch (JSONException exception) {
                    // The payload contains only strings and numbers; this cannot happen.
                }
            } else if (result.status == 409) {
                resultTitle = "Open BCCB Cricket to reply";
                resultBody = result.message("Pick your name in the app first.");
            } else {
                resultTitle = "Reply not saved";
                resultBody = result.message("Tap to reply in the app.");
            }
        }

        NotificationCompat.Builder builder = Notifications.base(context, Notifications.CHANNEL_INVITES, resultTitle, resultBody)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setContentIntent(Notifications.openApp(context, notificationId, route, "open", "game_invite", gameDayId, groupId));
        Notifications.post(context, notificationId, builder);
    }
}
