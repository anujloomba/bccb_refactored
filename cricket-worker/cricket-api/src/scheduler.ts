import {
  alarmReminderNotification,
  deliverPush,
  maybeReminderNotification,
  selectPushTargets,
  type GameDayRow
} from './gameDay';
import { dayBeforeReminderAt } from './time';

const HOUR_MS = 60 * 60 * 1000;
// A "tomorrow" reminder is only useful while there is still time to plan the trip.
const LATEST_REMINDER_BEFORE_REACH_MS = 3 * HOUR_MS;
const REMINDER_LOOKAHEAD_MS = 48 * HOUR_MS;
const PURGE_TRIPS_AFTER_START_MS = 6 * HOUR_MS;
const PURGE_STALE_TRIPS_MS = 12 * HOUR_MS;

export interface ScheduledRunSummary {
  remindersSent: number;
  remindersSkipped: number;
  tripsPurged: number;
}

async function sendDayBeforeReminders(env: Env, game: GameDayRow, now: Date): Promise<void> {
  const rsvps = await env.cricket_mgr.prepare(
    "SELECT player_id, response FROM game_day_rsvps WHERE game_day_id = ? AND response IN ('yes', 'maybe')"
  ).bind(game.id).all<{ player_id: string; response: 'yes' | 'maybe' }>();
  const yesPlayers = (rsvps.results || []).filter(row => row.response === 'yes').map(row => row.player_id);
  const maybePlayers = (rsvps.results || []).filter(row => row.response === 'maybe').map(row => row.player_id);

  if (yesPlayers.length > 0) {
    const targets = await selectPushTargets(env, game.group_id, { playerIds: yesPlayers });
    await deliverPush(env, targets, alarmReminderNotification(game, now));
  }
  if (maybePlayers.length > 0) {
    const targets = await selectPushTargets(env, game.group_id, { playerIds: maybePlayers });
    await deliverPush(env, targets, maybeReminderNotification(game, now));
  }
}

export async function runScheduledTasks(env: Env, now: Date = new Date()): Promise<ScheduledRunSummary> {
  const nowMs = now.getTime();
  const summary: ScheduledRunSummary = { remindersSent: 0, remindersSkipped: 0, tripsPurged: 0 };

  const candidates = await env.cricket_mgr.prepare(`
    SELECT * FROM game_days
    WHERE status = 'scheduled' AND reminder_sent_at IS NULL AND starts_at > ? AND starts_at <= ?
    ORDER BY starts_at ASC
  `).bind(now.toISOString(), new Date(nowMs + REMINDER_LOOKAHEAD_MS).toISOString()).all<GameDayRow>();

  for (const game of candidates.results || []) {
    const reminderAt = dayBeforeReminderAt(new Date(game.starts_at), game.timezone).getTime();
    if (nowMs < reminderAt) continue;

    const tooLate = nowMs > Date.parse(game.reach_by) - LATEST_REMINDER_BEFORE_REACH_MS;
    if (tooLate) {
      summary.remindersSkipped++;
    } else {
      await sendDayBeforeReminders(env, game, now);
      summary.remindersSent++;
    }
    await env.cricket_mgr.prepare(
      'UPDATE game_days SET reminder_sent_at = ? WHERE id = ? AND reminder_sent_at IS NULL'
    ).bind(now.toISOString(), game.id).run();
  }

  const purge = await env.cricket_mgr.prepare(`
    DELETE FROM trip_locations
    WHERE updated_at < ?
       OR game_day_id IN (SELECT id FROM game_days WHERE starts_at < ? OR status = 'cancelled')
  `).bind(
    new Date(nowMs - PURGE_STALE_TRIPS_MS).toISOString(),
    new Date(nowMs - PURGE_TRIPS_AFTER_START_MS).toISOString()
  ).run();
  summary.tripsPurged = purge.meta?.changes ?? 0;

  return summary;
}
