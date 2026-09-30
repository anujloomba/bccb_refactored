import {
  deleteMyDevice,
  getMyDevice,
  listDevices,
  registerDevice,
  requireAdmin,
  requireDevice,
  resetPlayerClaims,
  serializeDevice,
  updateMyDevice,
  type DeviceRow
} from './deviceAuth';
import {
  haversineMeters,
  reversePlace,
  routeTravel,
  searchPlaces,
  ROUTE_ATTRIBUTION,
  SEARCH_ATTRIBUTION,
  type LatLng
} from './geo';
import {
  HttpError,
  jsonResponse,
  optionalFiniteNumber,
  optionalTrimmedString,
  parseLatitude,
  parseLongitude,
  readJsonObject,
  requiredTrimmedString,
  type CorsHeaders
} from './http';
import { sendPush, type PushNotification, type PushTarget } from './push';
import { formatDay, formatTime, isValidTimeZone, relativeDayLabel } from './time';

export type RsvpResponse = 'yes' | 'no' | 'maybe';

export interface GameDayRow {
  id: string;
  group_id: number;
  title: string;
  starts_at: string;
  reach_by: string;
  timezone: string;
  venue_name: string;
  venue_address: string | null;
  venue_lat: number;
  venue_lng: number;
  notes: string | null;
  status: 'scheduled' | 'cancelled';
  created_by_device: string | null;
  reminder_sent_at: string | null;
  last_nudged_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RsvpRow {
  game_day_id: string;
  player_id: string;
  response: RsvpResponse;
}

interface TossRow {
  id: string;
  group_id: number;
  game_day_id: string | null;
  payload: string;
  created_at: string;
}

interface TripRow {
  game_day_id: string;
  player_id: string;
  device_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  status: 'travelling' | 'arrived' | 'stopped';
  distance_meters: number | null;
  eta_seconds: number | null;
  eta_computed_at: string | null;
  /** The sharing phone's own trip start time (ms), so late updates from a stopped trip can be recognised. */
  client_started_ms: number | null;
  started_at: string;
  updated_at: string;
}

interface GameContext {
  roster: Array<{ id: string; name: string }>;
  rosterIds: Set<string>;
  rsvps: RsvpRow[];
  tossByGame: Map<string, TossRow>;
  travellersByGame: Map<string, number>;
}

const HOUR_MS = 60 * 60 * 1000;
export const TRIP_OPENS_BEFORE_REACH_MS = 4 * HOUR_MS;
export const TRIP_CLOSES_AFTER_START_MS = 2 * HOUR_MS;
export const TRIP_STOP_AFTER_START_MS = HOUR_MS;
export const ARRIVAL_RADIUS_METERS = 150;
const ETA_REFRESH_MS = 3 * 60 * 1000;
const TRIP_MIN_UPDATE_INTERVAL_MS = 5 * 1000;
const STALE_TRIP_MS = 10 * 60 * 1000;
const ROUTE_CALLS_PER_HOUR = 40;
const NUDGE_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_UPCOMING_GAMES = 20;
const MAX_REACH_BEFORE_START_MS = 6 * HOUR_MS;
const LIST_GRACE_AFTER_START_MS = 6 * HOUR_MS;
const MAX_TOSS_PAYLOAD_BYTES = 8 * 1024;
const RSVP_RESPONSES: ReadonlySet<string> = new Set(['yes', 'no', 'maybe']);

export function tripWindow(game: Pick<GameDayRow, 'starts_at' | 'reach_by'>) {
  const startsAt = Date.parse(game.starts_at);
  const reachBy = Date.parse(game.reach_by);
  return {
    opensAt: new Date(reachBy - TRIP_OPENS_BEFORE_REACH_MS).toISOString(),
    closesAt: new Date(startsAt + TRIP_CLOSES_AFTER_START_MS).toISOString(),
    stopAfter: new Date(startsAt + TRIP_STOP_AFTER_START_MS).toISOString()
  };
}

function serializeToss(row: TossRow | null | undefined) {
  if (!row) return null;
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(row.payload) as Record<string, unknown>;
  } catch (error) {
    console.warn('Ignoring an unreadable toss payload.', error);
  }
  return { ...payload, id: row.id, gameDayId: row.game_day_id, createdAt: row.created_at };
}

function serializeGameDay(game: GameDayRow, context: GameContext, myPlayerId: string | null) {
  const rsvps = { yes: [] as string[], maybe: [] as string[], no: [] as string[] };
  let myResponse: RsvpResponse | null = null;
  context.rsvps.forEach(rsvp => {
    if (rsvp.game_day_id !== game.id || !context.rosterIds.has(rsvp.player_id)) return;
    rsvps[rsvp.response].push(rsvp.player_id);
    if (rsvp.player_id === myPlayerId) myResponse = rsvp.response;
  });
  const responded = rsvps.yes.length + rsvps.maybe.length + rsvps.no.length;
  return {
    id: game.id,
    groupId: game.group_id,
    title: game.title,
    startsAt: game.starts_at,
    reachBy: game.reach_by,
    timezone: game.timezone,
    venue: {
      name: game.venue_name,
      address: game.venue_address,
      lat: game.venue_lat,
      lng: game.venue_lng
    },
    notes: game.notes,
    status: game.status,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
    rsvps,
    counts: {
      yes: rsvps.yes.length,
      maybe: rsvps.maybe.length,
      no: rsvps.no.length,
      pending: Math.max(0, context.rosterIds.size - responded)
    },
    myResponse,
    toss: serializeToss(context.tossByGame.get(game.id)),
    travellers: context.travellersByGame.get(game.id) ?? 0,
    tripWindow: tripWindow(game)
  };
}

async function loadGameContext(env: Env, groupId: number, games: GameDayRow[]): Promise<GameContext> {
  const roster = await env.cricket_mgr.prepare(
    'SELECT Player_ID AS id, Name AS name FROM player_data WHERE group_id = ? ORDER BY Name COLLATE NOCASE'
  ).bind(groupId).all<{ id: string; name: string }>();
  const context: GameContext = {
    roster: roster.results || [],
    rosterIds: new Set((roster.results || []).map(player => player.id)),
    rsvps: [],
    tossByGame: new Map(),
    travellersByGame: new Map()
  };
  if (games.length === 0) return context;

  const ids = games.map(game => game.id);
  const placeholders = ids.map(() => '?').join(', ');
  const [rsvps, tosses, travellers] = await env.cricket_mgr.batch([
    env.cricket_mgr.prepare(
      `SELECT game_day_id, player_id, response FROM game_day_rsvps WHERE game_day_id IN (${placeholders})`
    ).bind(...ids),
    env.cricket_mgr.prepare(
      `SELECT * FROM group_tosses WHERE group_id = ? AND game_day_id IN (${placeholders}) ORDER BY created_at DESC`
    ).bind(groupId, ...ids),
    env.cricket_mgr.prepare(`
      SELECT game_day_id, COUNT(*) AS count FROM trip_locations
      WHERE status = 'travelling' AND game_day_id IN (${placeholders}) GROUP BY game_day_id
    `).bind(...ids)
  ]);
  context.rsvps = (rsvps.results || []) as RsvpRow[];
  ((tosses.results || []) as TossRow[]).forEach(toss => {
    if (toss.game_day_id && !context.tossByGame.has(toss.game_day_id)) context.tossByGame.set(toss.game_day_id, toss);
  });
  ((travellers.results || []) as Array<{ game_day_id: string; count: number }>).forEach(row => {
    context.travellersByGame.set(row.game_day_id, row.count);
  });
  return context;
}

async function loadGame(env: Env, groupId: number, gameDayId: string): Promise<GameDayRow> {
  const game = await env.cricket_mgr.prepare(
    'SELECT * FROM game_days WHERE id = ? AND group_id = ?'
  ).bind(gameDayId, groupId).first<GameDayRow>();
  if (!game) throw new HttpError(404, 'Game day not found.');
  return game;
}

async function gameDayResponse(
  env: Env,
  groupId: number,
  game: GameDayRow,
  device: DeviceRow,
  corsHeaders: CorsHeaders,
  status = 200
): Promise<Response> {
  const context = await loadGameContext(env, groupId, [game]);
  return jsonResponse({ gameDay: serializeGameDay(game, context, device.player_id) }, corsHeaders, status);
}

function parseIsoInstant(value: unknown, field: string): Date {
  const time = typeof value === 'string' && value.length <= 40 ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(time)) throw new HttpError(400, `${field} must be an ISO date and time.`);
  return new Date(time);
}

interface GameDayInput {
  title: string;
  startsAt: string;
  reachBy: string;
  timezone: string;
  venueName: string;
  venueAddress: string | null;
  venueLat: number;
  venueLng: number;
  notes: string | null;
}

function parseGameDayInput(body: Record<string, unknown>, existing: GameDayRow | null): GameDayInput {
  const pick = (key: string, fallback: unknown) => (key in body ? body[key] : fallback);
  const rawVenue = pick('venue', existing ? {
    name: existing.venue_name,
    address: existing.venue_address,
    lat: existing.venue_lat,
    lng: existing.venue_lng
  } : undefined);
  if (!rawVenue || typeof rawVenue !== 'object' || Array.isArray(rawVenue)) {
    throw new HttpError(400, 'Choose a venue for the game.');
  }
  const venue = rawVenue as Record<string, unknown>;

  const startsAt = parseIsoInstant(pick('startsAt', existing?.starts_at), 'Start time');
  const reachBy = parseIsoInstant(pick('reachBy', existing?.reach_by), 'Reach-by time');
  const timezone = pick('timezone', existing?.timezone);
  if (!isValidTimeZone(timezone)) throw new HttpError(400, 'A valid time zone is required.');

  const startChanged = !existing || startsAt.toISOString() !== existing.starts_at;
  if (startChanged && startsAt.getTime() <= Date.now() + 60_000) {
    throw new HttpError(400, 'The game must start in the future.');
  }
  if (reachBy.getTime() > startsAt.getTime()) {
    throw new HttpError(400, 'The reach-by time must be at or before the start time.');
  }
  if (startsAt.getTime() - reachBy.getTime() > MAX_REACH_BEFORE_START_MS) {
    throw new HttpError(400, 'The reach-by time must be within 6 hours of the start time.');
  }

  return {
    title: optionalTrimmedString(pick('title', existing?.title), 'Title', 80) ?? 'Game Day',
    startsAt: startsAt.toISOString(),
    reachBy: reachBy.toISOString(),
    timezone,
    venueName: requiredTrimmedString(venue.name, 'Venue name', 120),
    venueAddress: optionalTrimmedString(venue.address, 'Venue address', 250),
    venueLat: parseLatitude(venue.lat, 'Venue latitude'),
    venueLng: parseLongitude(venue.lng, 'Venue longitude'),
    notes: optionalTrimmedString(pick('notes', existing?.notes), 'Notes', 500)
  };
}

function whenPhrase(label: string): string {
  return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : `on ${label}`;
}

export function describeGame(game: GameDayRow, now = new Date()) {
  const startsAt = new Date(game.starts_at);
  return {
    day: formatDay(startsAt, game.timezone),
    relativeDay: relativeDayLabel(startsAt, game.timezone, now),
    start: formatTime(startsAt, game.timezone),
    reach: formatTime(new Date(game.reach_by), game.timezone)
  };
}

function gameRoute(game: GameDayRow, suffix = ''): string {
  return `bccb://game-day/${game.id}${suffix}`;
}

function inviteNotification(game: GameDayRow): PushNotification {
  const { day, start, reach } = describeGame(game);
  return {
    type: 'game_invite',
    title: `🏏 ${game.title}: ${day}`,
    body: `${start} at ${game.venue_name} · reach by ${reach}. Are you in?`,
    groupId: game.group_id,
    gameDayId: game.id,
    route: gameRoute(game),
    category: 'GAME_INVITE',
    actionsRequireClaim: true
  };
}

function updateNotification(game: GameDayRow): PushNotification {
  const { day, start, reach } = describeGame(game);
  return {
    type: 'game_updated',
    title: `📝 Game updated: ${day}`,
    body: `Now ${start} at ${game.venue_name} · reach by ${reach}.`,
    groupId: game.group_id,
    gameDayId: game.id,
    route: gameRoute(game)
  };
}

function cancelNotification(game: GameDayRow): PushNotification {
  const { day } = describeGame(game);
  return {
    type: 'game_cancelled',
    title: `❌ Game cancelled: ${day}`,
    body: `${game.title} at ${game.venue_name} is off. Any alarm for it has been removed.`,
    groupId: game.group_id,
    gameDayId: game.id,
    route: gameRoute(game),
    contentAvailable: true
  };
}

function nudgeNotification(game: GameDayRow): PushNotification {
  const { day, start } = describeGame(game);
  return {
    type: 'game_nudge',
    title: `⏳ Are you in for ${day}?`,
    body: `${start} at ${game.venue_name}. Let the group know.`,
    groupId: game.group_id,
    gameDayId: game.id,
    route: gameRoute(game),
    category: 'GAME_INVITE',
    actionsRequireClaim: true
  };
}

export function alarmReminderNotification(game: GameDayRow, now: Date): PushNotification {
  const { relativeDay, start, reach } = describeGame(game, now);
  return {
    type: 'alarm_reminder',
    title: '⏰ Set your game-day alarm',
    body: `Game ${whenPhrase(relativeDay)} at ${start}, ${game.venue_name}. Reach by ${reach}. Tap for your recommended alarm.`,
    groupId: game.group_id,
    gameDayId: game.id,
    route: gameRoute(game, '/alarm')
  };
}

export function maybeReminderNotification(game: GameDayRow, now: Date): PushNotification {
  const { relativeDay, start } = describeGame(game, now);
  return {
    type: 'maybe_reminder',
    title: '🤔 Still a maybe?',
    body: `Game ${whenPhrase(relativeDay)} at ${start}, ${game.venue_name}. Are you in?`,
    groupId: game.group_id,
    gameDayId: game.id,
    route: gameRoute(game),
    category: 'GAME_INVITE',
    actionsRequireClaim: true
  };
}

interface TargetFilter {
  excludeDeviceId?: string;
  /** Only devices claimed by these players (plus unclaimed devices when includeUnclaimed is set). */
  playerIds?: string[];
  /** Devices claimed by any player except these. */
  excludePlayerIds?: string[];
  includeUnclaimed?: boolean;
}

export async function selectPushTargets(env: Env, groupId: number, filter: TargetFilter = {}): Promise<PushTarget[]> {
  const rows = await env.cricket_mgr.prepare(
    'SELECT device_id, platform, push_token, player_id FROM group_devices WHERE group_id = ? AND push_token IS NOT NULL'
  ).bind(groupId).all<{ device_id: string; platform: string; push_token: string; player_id: string | null }>();
  return (rows.results || [])
    .filter(row => row.device_id !== filter.excludeDeviceId)
    .filter(row => {
      if (!row.player_id) return filter.includeUnclaimed ?? !filter.playerIds;
      if (filter.playerIds && !filter.playerIds.includes(row.player_id)) return false;
      if (filter.excludePlayerIds && filter.excludePlayerIds.includes(row.player_id)) return false;
      return true;
    })
    .map(row => ({ deviceId: row.device_id, platform: row.platform, pushToken: row.push_token, playerId: row.player_id }));
}

export async function deliverPush(env: Env, targets: PushTarget[], notification: PushNotification): Promise<void> {
  try {
    const result = await sendPush(env, targets, notification);
    if (result.failed > 0) console.warn(`${result.failed} ${notification.type} push messages failed.`);
  } catch (error) {
    console.error(`Could not deliver ${notification.type} push messages.`, error);
  }
}

async function listGameDays(request: Request, env: Env, groupId: number, corsHeaders: CorsHeaders): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  const games = await env.cricket_mgr.prepare(
    'SELECT * FROM game_days WHERE group_id = ? AND starts_at >= ? ORDER BY starts_at ASC LIMIT 25'
  ).bind(groupId, new Date(Date.now() - LIST_GRACE_AFTER_START_MS).toISOString()).all<GameDayRow>();
  const context = await loadGameContext(env, groupId, games.results || []);
  const latestToss = await env.cricket_mgr.prepare(
    'SELECT * FROM group_tosses WHERE group_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(groupId).first<TossRow>();
  return jsonResponse({
    gameDays: (games.results || []).map(game => serializeGameDay(game, context, device.player_id)),
    players: context.roster,
    me: serializeDevice(device),
    latestToss: serializeToss(latestToss),
    serverTime: new Date().toISOString()
  }, corsHeaders);
}

async function createGameDay(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  groupId: number,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const input = parseGameDayInput(await readJsonObject(request), null);
  const now = new Date().toISOString();
  const upcoming = await env.cricket_mgr.prepare(
    "SELECT COUNT(*) AS count FROM game_days WHERE group_id = ? AND status = 'scheduled' AND starts_at > ?"
  ).bind(groupId, now).first<{ count: number }>();
  if ((upcoming?.count ?? 0) >= MAX_UPCOMING_GAMES) {
    throw new HttpError(409, `A group can have at most ${MAX_UPCOMING_GAMES} upcoming game days.`);
  }

  const id = crypto.randomUUID();
  await env.cricket_mgr.prepare(`
    INSERT INTO game_days (id, group_id, title, starts_at, reach_by, timezone, venue_name, venue_address,
      venue_lat, venue_lng, notes, status, created_by_device, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)
  `).bind(
    id, groupId, input.title, input.startsAt, input.reachBy, input.timezone, input.venueName, input.venueAddress,
    input.venueLat, input.venueLng, input.notes, device.device_id, now, now
  ).run();

  const game = await loadGame(env, groupId, id);
  ctx.waitUntil(selectPushTargets(env, groupId, { excludeDeviceId: device.device_id })
    .then(targets => deliverPush(env, targets, inviteNotification(game))));
  return gameDayResponse(env, groupId, game, device, corsHeaders, 201);
}

async function updateGameDay(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  groupId: number,
  gameDayId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const existing = await loadGame(env, groupId, gameDayId);
  if (existing.status === 'cancelled') throw new HttpError(409, 'Cancelled games cannot be edited.');
  const input = parseGameDayInput(await readJsonObject(request), existing);
  const scheduleChanged = input.startsAt !== existing.starts_at || input.reachBy !== existing.reach_by;
  const venueChanged = input.venueName !== existing.venue_name
    || input.venueLat !== existing.venue_lat
    || input.venueLng !== existing.venue_lng;

  await env.cricket_mgr.prepare(`
    UPDATE game_days SET title = ?, starts_at = ?, reach_by = ?, timezone = ?, venue_name = ?, venue_address = ?,
      venue_lat = ?, venue_lng = ?, notes = ?, updated_at = ?,
      reminder_sent_at = CASE WHEN ? THEN NULL ELSE reminder_sent_at END
    WHERE id = ? AND group_id = ?
  `).bind(
    input.title, input.startsAt, input.reachBy, input.timezone, input.venueName, input.venueAddress,
    input.venueLat, input.venueLng, input.notes, new Date().toISOString(), scheduleChanged ? 1 : 0,
    gameDayId, groupId
  ).run();

  const game = await loadGame(env, groupId, gameDayId);
  if (scheduleChanged || venueChanged) {
    ctx.waitUntil(selectPushTargets(env, groupId, { excludeDeviceId: device.device_id })
      .then(targets => deliverPush(env, targets, updateNotification(game))));
  }
  return gameDayResponse(env, groupId, game, device, corsHeaders);
}

async function cancelGameDay(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  groupId: number,
  gameDayId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const existing = await loadGame(env, groupId, gameDayId);
  if (existing.status === 'cancelled') return gameDayResponse(env, groupId, existing, device, corsHeaders);

  await env.cricket_mgr.batch([
    env.cricket_mgr.prepare(
      "UPDATE game_days SET status = 'cancelled', updated_at = ? WHERE id = ? AND group_id = ?"
    ).bind(new Date().toISOString(), gameDayId, groupId),
    env.cricket_mgr.prepare('DELETE FROM trip_locations WHERE game_day_id = ?').bind(gameDayId)
  ]);
  const game = await loadGame(env, groupId, gameDayId);
  ctx.waitUntil(selectPushTargets(env, groupId, { excludeDeviceId: device.device_id })
    .then(targets => deliverPush(env, targets, cancelNotification(game))));
  return gameDayResponse(env, groupId, game, device, corsHeaders);
}

async function nudgeGameDay(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  groupId: number,
  gameDayId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const game = await loadGame(env, groupId, gameDayId);
  if (game.status !== 'scheduled' || Date.parse(game.starts_at) <= Date.now()) {
    throw new HttpError(409, 'Only upcoming games can be nudged.');
  }
  const lastNudged = game.last_nudged_at ? Date.parse(game.last_nudged_at) : 0;
  const waitMs = lastNudged + NUDGE_COOLDOWN_MS - Date.now();
  if (waitMs > 0) {
    throw new HttpError(429, `You can nudge again in ${Math.ceil(waitMs / 60_000)} minutes.`);
  }

  const responded = await env.cricket_mgr.prepare(
    'SELECT player_id FROM game_day_rsvps WHERE game_day_id = ?'
  ).bind(gameDayId).all<{ player_id: string }>();
  const targets = await selectPushTargets(env, groupId, {
    excludeDeviceId: device.device_id,
    excludePlayerIds: (responded.results || []).map(row => row.player_id),
    includeUnclaimed: true
  });
  await env.cricket_mgr.prepare(
    'UPDATE game_days SET last_nudged_at = ? WHERE id = ?'
  ).bind(new Date().toISOString(), gameDayId).run();
  ctx.waitUntil(deliverPush(env, targets, nudgeNotification(game)));
  return jsonResponse({ nudged: targets.length }, corsHeaders);
}

async function replyToGameDay(
  request: Request,
  env: Env,
  groupId: number,
  gameDayId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  if (!device.player_id) throw new HttpError(409, 'Choose who you are on the roster before replying.');
  const body = await readJsonObject<Record<string, unknown>>(request);
  if (typeof body.response !== 'string' || !RSVP_RESPONSES.has(body.response)) {
    throw new HttpError(400, 'Reply with yes, no, or maybe.');
  }
  const game = await loadGame(env, groupId, gameDayId);
  if (game.status !== 'scheduled') throw new HttpError(409, 'This game has been cancelled.');
  if (Date.parse(game.starts_at) <= Date.now()) throw new HttpError(409, 'Replies close when the game starts.');

  await env.cricket_mgr.prepare(`
    INSERT INTO game_day_rsvps (game_day_id, player_id, response, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(game_day_id, player_id) DO UPDATE SET response = excluded.response, updated_at = excluded.updated_at
  `).bind(gameDayId, device.player_id, body.response, new Date().toISOString()).run();
  return gameDayResponse(env, groupId, game, device, corsHeaders);
}

function parsePoint(value: unknown): LatLng {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'A location with lat and lng is required.');
  }
  const point = value as Record<string, unknown>;
  return { lat: parseLatitude(point.lat), lng: parseLongitude(point.lng) };
}

async function estimateTravelToGame(
  request: Request,
  env: Env,
  groupId: number,
  gameDayId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  const game = await loadGame(env, groupId, gameDayId);
  const from = parsePoint((await readJsonObject<Record<string, unknown>>(request)).from);

  const hourWindow = Math.floor(Date.now() / HOUR_MS);
  const calls = device.route_window_start === hourWindow ? device.route_calls : 0;
  if (calls >= ROUTE_CALLS_PER_HOUR) {
    throw new HttpError(429, 'Too many travel-time requests from this device. Try again later.');
  }
  await env.cricket_mgr.prepare(
    'UPDATE group_devices SET route_window_start = ?, route_calls = ? WHERE device_id = ?'
  ).bind(hourWindow, calls + 1, device.device_id).run();

  const travel = await routeTravel(env, from, { lat: game.venue_lat, lng: game.venue_lng });
  return jsonResponse({
    travel: {
      ...travel,
      attribution: travel.source === 'openrouteservice' ? ROUTE_ATTRIBUTION : null
    },
    gameDay: {
      id: game.id,
      startsAt: game.starts_at,
      reachBy: game.reach_by,
      timezone: game.timezone,
      updatedAt: game.updated_at
    }
  }, corsHeaders);
}

function currentEtaSeconds(trip: TripRow, nowMs: number): number | null {
  if (trip.status === 'arrived') return 0;
  if (trip.eta_seconds === null || !trip.eta_computed_at) return null;
  const elapsedSeconds = Math.max(0, (nowMs - Date.parse(trip.eta_computed_at)) / 1000);
  return Math.max(0, Math.round(trip.eta_seconds - elapsedSeconds));
}

function serializeTrip(trip: TripRow, nowMs = Date.now()) {
  return {
    playerId: trip.player_id,
    lat: trip.lat,
    lng: trip.lng,
    accuracy: trip.accuracy,
    heading: trip.heading,
    speed: trip.speed,
    status: trip.status,
    distanceMeters: trip.distance_meters === null ? null : Math.round(trip.distance_meters),
    etaSeconds: currentEtaSeconds(trip, nowMs),
    startedAt: trip.started_at,
    updatedAt: trip.updated_at,
    stale: trip.status === 'travelling' && nowMs - Date.parse(trip.updated_at) > STALE_TRIP_MS
  };
}

function assertTripWindowOpen(game: GameDayRow, nowMs: number): void {
  if (game.status !== 'scheduled') throw new HttpError(409, 'This game has been cancelled.');
  const window = tripWindow(game);
  if (nowMs < Date.parse(window.opensAt)) {
    throw new HttpError(409, 'Live trips open 4 hours before the reach-by time.');
  }
  if (nowMs > Date.parse(window.closesAt)) {
    throw new HttpError(409, 'Live trips for this game have closed.');
  }
}

/** The phone's trip start time in milliseconds, which identifies one sharing session. */
function parseTripMarker(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const marker = typeof value === 'string' ? Number(value) : value;
  if (typeof marker !== 'number' || !Number.isFinite(marker) || marker <= 0 || marker > 8_640_000_000_000_000) {
    throw new HttpError(400, 'The trip start time is invalid.');
  }
  return Math.floor(marker);
}

/** True when an update belongs to a trip the player has already stopped (or an even older one). */
function isFromStoppedTrip(existing: TripRow | null, marker: number | null): boolean {
  if (!existing || existing.status !== 'stopped' || existing.client_started_ms === null) return false;
  return marker === null || marker <= existing.client_started_ms;
}

async function updateTrip(
  request: Request,
  env: Env,
  groupId: number,
  gameDayId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  if (!device.player_id) throw new HttpError(409, 'Choose who you are on the roster before sharing a trip.');
  const game = await loadGame(env, groupId, gameDayId);
  const nowMs = Date.now();
  assertTripWindowOpen(game, nowMs);

  const body = await readJsonObject<Record<string, unknown>>(request);
  const point = { lat: parseLatitude(body.lat), lng: parseLongitude(body.lng) };
  const accuracy = optionalFiniteNumber(body.accuracy, 'Accuracy', 0, 100_000);
  const heading = optionalFiniteNumber(body.heading, 'Heading', 0, 360);
  const speed = optionalFiniteNumber(body.speed, 'Speed', 0, 150);
  const marker = parseTripMarker(body.tripStartedAt);
  const window = tripWindow(game);

  const existing = await env.cricket_mgr.prepare(
    'SELECT * FROM trip_locations WHERE game_day_id = ? AND player_id = ?'
  ).bind(gameDayId, device.player_id).first<TripRow>();
  if (isFromStoppedTrip(existing, marker)) {
    throw new HttpError(409, 'You stopped sharing this trip.');
  }
  if (
    existing
    && existing.status === 'travelling'
    && existing.device_id === device.device_id
    && nowMs - Date.parse(existing.updated_at) < TRIP_MIN_UPDATE_INTERVAL_MS
  ) {
    return jsonResponse({ trip: serializeTrip(existing, nowMs), arrived: false, stopAfter: window.stopAfter }, corsHeaders);
  }

  const venue = { lat: game.venue_lat, lng: game.venue_lng };
  const distanceMeters = haversineMeters(point, venue);
  const arrived = distanceMeters <= ARRIVAL_RADIUS_METERS;
  let etaSeconds = existing?.eta_seconds ?? null;
  let etaComputedAt = existing?.eta_computed_at ?? null;
  const etaIsStale = !etaComputedAt || nowMs - Date.parse(etaComputedAt) >= ETA_REFRESH_MS || existing?.status !== 'travelling';
  if (arrived) {
    etaSeconds = 0;
    etaComputedAt = new Date(nowMs).toISOString();
  } else if (etaIsStale) {
    etaSeconds = (await routeTravel(env, point, venue)).durationSeconds;
    etaComputedAt = new Date(nowMs).toISOString();
  }

  const nowIso = new Date(nowMs).toISOString();
  const trip: TripRow = {
    game_day_id: gameDayId,
    player_id: device.player_id,
    device_id: device.device_id,
    lat: point.lat,
    lng: point.lng,
    accuracy,
    heading,
    speed,
    status: arrived ? 'arrived' : 'travelling',
    distance_meters: distanceMeters,
    eta_seconds: etaSeconds,
    eta_computed_at: etaComputedAt,
    client_started_ms: marker ?? existing?.client_started_ms ?? null,
    started_at: existing && existing.status === 'travelling' ? existing.started_at : nowIso,
    updated_at: nowIso
  };
  await env.cricket_mgr.prepare(`
    INSERT INTO trip_locations (game_day_id, player_id, device_id, lat, lng, accuracy, heading, speed, status,
      distance_meters, eta_seconds, eta_computed_at, client_started_ms, started_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_day_id, player_id) DO UPDATE SET device_id = excluded.device_id, lat = excluded.lat,
      lng = excluded.lng, accuracy = excluded.accuracy, heading = excluded.heading, speed = excluded.speed,
      status = excluded.status, distance_meters = excluded.distance_meters, eta_seconds = excluded.eta_seconds,
      eta_computed_at = excluded.eta_computed_at, client_started_ms = excluded.client_started_ms,
      started_at = excluded.started_at, updated_at = excluded.updated_at
  `).bind(
    trip.game_day_id, trip.player_id, trip.device_id, trip.lat, trip.lng, trip.accuracy, trip.heading, trip.speed,
    trip.status, trip.distance_meters, trip.eta_seconds, trip.eta_computed_at, trip.client_started_ms,
    trip.started_at, trip.updated_at
  ).run();

  return jsonResponse({ trip: serializeTrip(trip, nowMs), arrived, stopAfter: window.stopAfter }, corsHeaders);
}

async function stopTrip(
  request: Request,
  env: Env,
  groupId: number,
  gameDayId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  await loadGame(env, groupId, gameDayId);
  const marker = parseTripMarker(new URL(request.url).searchParams.get('tripStartedAt'));
  const nowIso = new Date().toISOString();
  // Stopped trips stay as location-free markers until the scheduled purge, so an update that was already
  // in flight when the player tapped Stop cannot put them back on the map.
  const clearLocation = `status = 'stopped', lat = 0, lng = 0, accuracy = NULL, heading = NULL, speed = NULL,
    distance_meters = NULL, eta_seconds = NULL, eta_computed_at = NULL`;
  const statements = [
    env.cricket_mgr.prepare(`
      UPDATE trip_locations SET ${clearLocation}, updated_at = ?
      WHERE game_day_id = ? AND device_id = ? AND player_id IS NOT ?
    `).bind(nowIso, gameDayId, device.device_id, device.player_id)
  ];
  if (device.player_id) {
    statements.push(env.cricket_mgr.prepare(`
      INSERT INTO trip_locations (game_day_id, player_id, device_id, lat, lng, status, client_started_ms, started_at, updated_at)
      VALUES (?, ?, ?, 0, 0, 'stopped', ?, ?, ?)
      ON CONFLICT(game_day_id, player_id) DO UPDATE SET ${clearLocation},
        client_started_ms = CASE
          WHEN excluded.client_started_ms IS NULL THEN trip_locations.client_started_ms
          WHEN trip_locations.client_started_ms IS NULL THEN excluded.client_started_ms
          ELSE MAX(trip_locations.client_started_ms, excluded.client_started_ms)
        END,
        updated_at = excluded.updated_at
    `).bind(gameDayId, device.player_id, device.device_id, marker, nowIso, nowIso));
  }
  await env.cricket_mgr.batch(statements);
  return jsonResponse({ stopped: true }, corsHeaders);
}

async function listTrips(
  request: Request,
  env: Env,
  groupId: number,
  gameDayId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  await requireDevice(request, env, groupId);
  const game = await loadGame(env, groupId, gameDayId);
  const nowMs = Date.now();
  const window = tripWindow(game);
  const isOpen = game.status === 'scheduled'
    && nowMs >= Date.parse(window.opensAt)
    && nowMs <= Date.parse(window.closesAt);
  const trips = isOpen
    ? await env.cricket_mgr.prepare(
      "SELECT * FROM trip_locations WHERE game_day_id = ? AND status != 'stopped' ORDER BY updated_at DESC"
    ).bind(gameDayId).all<TripRow>()
    : { results: [] as TripRow[] };
  return jsonResponse({
    trips: (trips.results || []).map(trip => serializeTrip(trip, nowMs)),
    window: { ...window, isOpen },
    venue: { name: game.venue_name, lat: game.venue_lat, lng: game.venue_lng },
    serverTime: new Date(nowMs).toISOString()
  }, corsHeaders);
}

function parseTossPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'A toss result is required.');
  const toss = value as Record<string, unknown>;
  if (toss.decision !== 'bat' && toss.decision !== 'bowl') throw new HttpError(400, 'The toss decision must be bat or bowl.');
  if (!Array.isArray(toss.teams) || toss.teams.length !== 2) throw new HttpError(400, 'A toss needs exactly two teams.');
  const teams = toss.teams.map((team, index) => {
    if (!team || typeof team !== 'object' || Array.isArray(team)) throw new HttpError(400, `Team ${index + 1} is invalid.`);
    const record = team as Record<string, unknown>;
    if (!Array.isArray(record.players) || record.players.length > 40) {
      throw new HttpError(400, `Team ${index + 1} must list up to 40 players.`);
    }
    return {
      name: requiredTrimmedString(record.name, `Team ${index + 1} name`, 80),
      captainName: requiredTrimmedString(record.captainName, `Team ${index + 1} captain`, 80),
      players: record.players.map(player => requiredTrimmedString(player, 'Player name', 80))
    };
  });
  const winnerIndex = toss.winnerIndex;
  if (winnerIndex !== 0 && winnerIndex !== 1) throw new HttpError(400, 'The toss winner must be team 0 or team 1.');
  const tossedAt = parseIsoInstant(toss.tossedAt, 'Toss time').toISOString();
  const signature = optionalTrimmedString(toss.signature, 'Team signature', 200);
  return { teams, winnerIndex, decision: toss.decision, tossedAt, signature };
}

async function publishToss(
  request: Request,
  env: Env,
  groupId: number,
  corsHeaders: CorsHeaders
): Promise<Response> {
  await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const body = await readJsonObject<Record<string, unknown>>(request);
  const payload = parseTossPayload(body.toss);
  const serialized = JSON.stringify(payload);
  if (new TextEncoder().encode(serialized).length > MAX_TOSS_PAYLOAD_BYTES) {
    throw new HttpError(413, 'The toss result is too large.');
  }

  let gameDayId: string | null = null;
  if (typeof body.gameDayId === 'string' && body.gameDayId) {
    gameDayId = (await loadGame(env, groupId, body.gameDayId)).id;
  } else {
    const nowMs = Date.now();
    const nextGame = await env.cricket_mgr.prepare(`
      SELECT id FROM game_days WHERE group_id = ? AND status = 'scheduled' AND starts_at >= ? AND starts_at <= ?
      ORDER BY starts_at ASC LIMIT 1
    `).bind(
      groupId,
      new Date(nowMs - LIST_GRACE_AFTER_START_MS).toISOString(),
      new Date(nowMs + 72 * HOUR_MS).toISOString()
    ).first<{ id: string }>();
    gameDayId = nextGame?.id ?? null;
  }

  const row: TossRow = {
    id: crypto.randomUUID(),
    group_id: groupId,
    game_day_id: gameDayId,
    payload: serialized,
    created_at: new Date().toISOString()
  };
  await env.cricket_mgr.prepare(
    'INSERT INTO group_tosses (id, group_id, game_day_id, payload, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(row.id, row.group_id, row.game_day_id, row.payload, row.created_at).run();
  return jsonResponse({ toss: serializeToss(row) }, corsHeaders, 201);
}

async function latestToss(request: Request, env: Env, groupId: number, corsHeaders: CorsHeaders): Promise<Response> {
  await requireDevice(request, env, groupId);
  const row = await env.cricket_mgr.prepare(
    'SELECT * FROM group_tosses WHERE group_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(groupId).first<TossRow>();
  return jsonResponse({ toss: serializeToss(row) }, corsHeaders);
}

async function geoSearch(request: Request, env: Env, groupId: number, corsHeaders: CorsHeaders): Promise<Response> {
  await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const query = (new URL(request.url).searchParams.get('q') || '').trim();
  if (query.length < 3 || query.length > 120) throw new HttpError(400, 'Search for a venue with 3 to 120 characters.');
  try {
    return jsonResponse({ places: await searchPlaces(env, query), attribution: SEARCH_ATTRIBUTION }, corsHeaders);
  } catch (error) {
    console.warn('Venue search failed.', error);
    throw new HttpError(502, 'Venue search is unavailable right now. Drop a pin on the map instead.');
  }
}

async function geoReverse(request: Request, env: Env, groupId: number, corsHeaders: CorsHeaders): Promise<Response> {
  await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const params = new URL(request.url).searchParams;
  const point = { lat: parseLatitude(Number(params.get('lat'))), lng: parseLongitude(Number(params.get('lng'))) };
  try {
    return jsonResponse({ place: await reversePlace(env, point), attribution: SEARCH_ATTRIBUTION }, corsHeaders);
  } catch (error) {
    console.warn('Reverse geocoding failed.', error);
    return jsonResponse({ place: null, attribution: SEARCH_ATTRIBUTION }, corsHeaders);
  }
}

const GAME_DAY_PATH = /^\/groups\/(\d+)\/(devices|game-days|tosses|players|geo)(?:\/(.+))?$/;

/** Routes Game Day requests. Returns null for paths handled by the legacy router. */
export async function handleGameDayRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: CorsHeaders
): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(GAME_DAY_PATH);
  if (!match) return null;

  const groupId = Number(match[1]);
  const resource = match[2];
  const segments = match[3] ? match[3].split('/').map(segment => decodeURIComponent(segment)) : [];
  const method = request.method;
  // DELETE /groups/{id}/players (bulk roster wipe) stays with the legacy router.
  if (resource === 'players' && !(segments.length === 2 && segments[1] === 'claims')) return null;

  try {
    if (!Number.isSafeInteger(groupId) || groupId < 1) throw new HttpError(400, 'A valid group is required.');

    if (resource === 'devices') {
      if (segments.length === 0 && method === 'POST') return await registerDevice(request, env, groupId, corsHeaders);
      if (segments.length === 0 && method === 'GET') return await listDevices(request, env, groupId, corsHeaders);
      if (segments.length === 1 && segments[0] === 'me') {
        if (method === 'GET') return await getMyDevice(request, env, groupId, corsHeaders);
        if (method === 'PUT') return await updateMyDevice(request, env, groupId, corsHeaders);
        if (method === 'DELETE') return await deleteMyDevice(request, env, groupId, corsHeaders);
      }
    }

    if (resource === 'players' && method === 'DELETE') {
      return await resetPlayerClaims(request, env, groupId, segments[0], corsHeaders);
    }

    if (resource === 'game-days') {
      if (segments.length === 0 && method === 'GET') return await listGameDays(request, env, groupId, corsHeaders);
      if (segments.length === 0 && method === 'POST') return await createGameDay(request, env, ctx, groupId, corsHeaders);
      const [gameDayId, action] = segments;
      if (segments.length === 1) {
        if (method === 'GET') {
          const device = await requireDevice(request, env, groupId);
          return await gameDayResponse(env, groupId, await loadGame(env, groupId, gameDayId), device, corsHeaders);
        }
        if (method === 'PUT') return await updateGameDay(request, env, ctx, groupId, gameDayId, corsHeaders);
      }
      if (segments.length === 2) {
        if (action === 'cancel' && method === 'POST') return await cancelGameDay(request, env, ctx, groupId, gameDayId, corsHeaders);
        if (action === 'nudge' && method === 'POST') return await nudgeGameDay(request, env, ctx, groupId, gameDayId, corsHeaders);
        if (action === 'rsvp' && method === 'PUT') return await replyToGameDay(request, env, groupId, gameDayId, corsHeaders);
        if (action === 'route' && method === 'POST') return await estimateTravelToGame(request, env, groupId, gameDayId, corsHeaders);
        if (action === 'trip' && method === 'POST') return await updateTrip(request, env, groupId, gameDayId, corsHeaders);
        if (action === 'trip' && method === 'DELETE') return await stopTrip(request, env, groupId, gameDayId, corsHeaders);
        if (action === 'trips' && method === 'GET') return await listTrips(request, env, groupId, gameDayId, corsHeaders);
      }
    }

    if (resource === 'tosses') {
      if (segments.length === 0 && method === 'PUT') return await publishToss(request, env, groupId, corsHeaders);
      if (segments.length === 1 && segments[0] === 'latest' && method === 'GET') {
        return await latestToss(request, env, groupId, corsHeaders);
      }
    }

    if (resource === 'geo' && method === 'GET') {
      if (segments.length === 1 && segments[0] === 'search') return await geoSearch(request, env, groupId, corsHeaders);
      if (segments.length === 1 && segments[0] === 'reverse') return await geoReverse(request, env, groupId, corsHeaders);
    }

    throw new HttpError(404, 'Endpoint not found');
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, corsHeaders, error.status);
    }
    throw error;
  }
}
