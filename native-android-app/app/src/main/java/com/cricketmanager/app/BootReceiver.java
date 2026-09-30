package com.cricketmanager.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restores game-day alarms after reboots, updates, clock changes, and permission changes. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(action)) {
            GameAlarms.rescheduleAll(context);
        }
    }
}
