import { isAdminGroup } from './auth';
import {
  HttpError,
  jsonResponse,
  optionalTrimmedString,
  randomToken,
  readJsonObject,
  sha256Hex,
  timingSafeEqual,
  type CorsHeaders
} from './http';

export interface DeviceRow {
  device_id: string;
  group_id: number;
  token_hash: string;
  player_id: string | null;
  platform: string;
  push_token: string | null;
  app_version: string | null;
  route_window_start: number;
  route_calls: number;
  created_at: string;
  last_seen_at: string;
}

interface GroupRow {
  id: number;
  group_name: string;
  password_hash: string | null;
  admin_password_hash: string | null;
}

const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const PLATFORMS = new Set(['android', 'ios', 'web']);
const LAST_SEEN_REFRESH_MS = 60 * 60 * 1000;
const MAX_PUSH_TOKEN_LENGTH = 4096;

function parseBearer(request: Request): { deviceId: string; secret: string } | null {
  const match = (request.headers.get('Authorization') || '')
    .match(/^Bearer\s+([A-Za-z0-9-]{8,64})\.([A-Za-z0-9_-]{20,128})$/);
  return match ? { deviceId: match[1], secret: match[2] } : null;
}

async function findAuthenticatedDevice(request: Request, env: Env, groupId: number): Promise<DeviceRow | null> {
  const credentials = parseBearer(request);
  if (!credentials) return null;
  const device = await env.cricket_mgr.prepare(
    'SELECT * FROM group_devices WHERE device_id = ? AND group_id = ?'
  ).bind(credentials.deviceId, groupId).first<DeviceRow>();
  if (!device || !timingSafeEqual(device.token_hash, await sha256Hex(credentials.secret))) {
    return null;
  }
  return device;
}

export async function requireDevice(request: Request, env: Env, groupId: number): Promise<DeviceRow> {
  const device = await findAuthenticatedDevice(request, env, groupId);
  if (!device) {
    throw new HttpError(401, 'This device is not registered for Game Day. Sign in to the group again.');
  }
  const lastSeen = Date.parse(device.last_seen_at);
  if (!Number.isFinite(lastSeen) || Date.now() - lastSeen > LAST_SEEN_REFRESH_MS) {
    await env.cricket_mgr.prepare(
      'UPDATE group_devices SET last_seen_at = ? WHERE device_id = ?'
    ).bind(new Date().toISOString(), device.device_id).run();
  }
  return device;
}

export async function requireAdmin(request: Request, env: Env, groupId: number): Promise<void> {
  if (!(await isAdminGroup(env, groupId, request.headers.get('X-Admin-Password-Hash')))) {
    throw new HttpError(403, 'This action requires an administrator login.');
  }
}

function parsePlatform(value: unknown): string {
  return typeof value === 'string' && PLATFORMS.has(value) ? value : 'web';
}

function parsePushToken(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > MAX_PUSH_TOKEN_LENGTH) {
    throw new HttpError(400, 'The push token is invalid.');
  }
  return value;
}

export function serializeDevice(device: Pick<DeviceRow, 'device_id' | 'player_id' | 'platform' | 'push_token'>) {
  return {
    deviceId: device.device_id,
    playerId: device.player_id,
    platform: device.platform,
    hasPush: Boolean(device.push_token)
  };
}

async function clearDuplicatePushToken(env: Env, pushToken: string | null, deviceId: string): Promise<void> {
  if (!pushToken) return;
  await env.cricket_mgr.prepare(
    'UPDATE group_devices SET push_token = NULL WHERE push_token = ? AND device_id != ?'
  ).bind(pushToken, deviceId).run();
}

export async function registerDevice(
  request: Request,
  env: Env,
  groupId: number,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const body = await readJsonObject<Record<string, unknown>>(request);
  const deviceId = typeof body.device_id === 'string' && DEVICE_ID_PATTERN.test(body.device_id)
    ? body.device_id
    : null;
  if (!deviceId) throw new HttpError(400, 'A valid device identifier is required.');

  const group = await env.cricket_mgr.prepare(
    'SELECT id, group_name, password_hash, admin_password_hash FROM groups WHERE id = ?'
  ).bind(groupId).first<GroupRow>();
  if (!group) throw new HttpError(404, 'Group not found.');
  if (group.group_name === 'guest') {
    throw new HttpError(403, 'Game Day needs your own group. Create or join a group first.');
  }
  if (typeof body.group_name !== 'string' || body.group_name.trim().toLowerCase() !== group.group_name.toLowerCase()) {
    throw new HttpError(401, 'The group name does not match this group.');
  }

  const adminHash = typeof body.admin_password_hash === 'string' ? body.admin_password_hash : '';
  const memberHash = typeof body.group_password_hash === 'string' ? body.group_password_hash : '';
  const isAdmin = Boolean(adminHash && group.admin_password_hash && timingSafeEqual(adminHash, group.admin_password_hash));
  const isMember = group.password_hash
    ? Boolean(memberHash && timingSafeEqual(memberHash, group.password_hash))
    : true;
  if (!isAdmin && !isMember) {
    throw new HttpError(401, 'The group password is incorrect.');
  }

  const platform = parsePlatform(body.platform);
  const appVersion = optionalTrimmedString(body.app_version, 'App version', 32);
  const pushToken = parsePushToken(body.push_token);
  // A device that proves its current credentials keeps its roster claim and active trip when it re-registers.
  const currentDevice = await findAuthenticatedDevice(request, env, groupId);
  const keepsClaim = Boolean(currentDevice && currentDevice.device_id === deviceId);
  const keptPlayerId = keepsClaim && currentDevice ? currentDevice.player_id : null;

  const secret = randomToken(32);
  const now = new Date().toISOString();
  const statements = keepsClaim
    ? []
    : [env.cricket_mgr.prepare('DELETE FROM trip_locations WHERE device_id = ?').bind(deviceId)];
  await env.cricket_mgr.batch([
    ...statements,
    env.cricket_mgr.prepare('DELETE FROM group_devices WHERE device_id = ?').bind(deviceId),
    env.cricket_mgr.prepare(`
      INSERT INTO group_devices (device_id, group_id, token_hash, player_id, platform, push_token, app_version, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(deviceId, groupId, await sha256Hex(secret), keptPlayerId, platform, pushToken, appVersion, now, now)
  ]);
  await clearDuplicatePushToken(env, pushToken, deviceId);

  return jsonResponse({
    device: {
      ...serializeDevice({ device_id: deviceId, player_id: keptPlayerId, platform, push_token: pushToken }),
      token: `${deviceId}.${secret}`
    },
    group: {
      id: group.id,
      name: group.group_name,
      hasMemberPassword: Boolean(group.password_hash),
      isAdmin
    }
  }, corsHeaders, 201);
}

async function findPlayer(env: Env, groupId: number, playerId: string | null) {
  if (!playerId) return null;
  return env.cricket_mgr.prepare(
    'SELECT Player_ID AS id, Name AS name FROM player_data WHERE Player_ID = ? AND group_id = ?'
  ).bind(playerId, groupId).first<{ id: string; name: string }>();
}

export async function getMyDevice(
  request: Request,
  env: Env,
  groupId: number,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  const player = await findPlayer(env, groupId, device.player_id);
  return jsonResponse({ device: serializeDevice(device), player }, corsHeaders);
}

export async function updateMyDevice(
  request: Request,
  env: Env,
  groupId: number,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  const body = await readJsonObject<Record<string, unknown>>(request);
  const updated: DeviceRow = { ...device };
  let otherDevicesForPlayer = 0;

  if ('push_token' in body) updated.push_token = parsePushToken(body.push_token);
  if ('platform' in body) updated.platform = parsePlatform(body.platform);
  if ('app_version' in body) updated.app_version = optionalTrimmedString(body.app_version, 'App version', 32);
  if ('player_id' in body) {
    if (body.player_id === null) {
      updated.player_id = null;
    } else if (typeof body.player_id === 'string' && body.player_id.length > 0 && body.player_id.length <= 128) {
      const player = await env.cricket_mgr.prepare(
        'SELECT Player_ID FROM player_data WHERE Player_ID = ? AND group_id = ?'
      ).bind(body.player_id, groupId).first<{ Player_ID: string }>();
      if (!player) throw new HttpError(400, 'That player is not in this group.');
      updated.player_id = player.Player_ID;
      const others = await env.cricket_mgr.prepare(
        'SELECT COUNT(*) AS count FROM group_devices WHERE group_id = ? AND player_id = ? AND device_id != ?'
      ).bind(groupId, player.Player_ID, device.device_id).first<{ count: number }>();
      otherDevicesForPlayer = others?.count ?? 0;
    } else {
      throw new HttpError(400, 'Choose a player from the roster.');
    }
  }

  const statements = [
    env.cricket_mgr.prepare(`
      UPDATE group_devices SET player_id = ?, platform = ?, push_token = ?, app_version = ?, last_seen_at = ?
      WHERE device_id = ?
    `).bind(
      updated.player_id,
      updated.platform,
      updated.push_token,
      updated.app_version,
      new Date().toISOString(),
      device.device_id
    )
  ];
  if (device.player_id && device.player_id !== updated.player_id) {
    statements.push(env.cricket_mgr.prepare('DELETE FROM trip_locations WHERE device_id = ?').bind(device.device_id));
  }
  await env.cricket_mgr.batch(statements);
  await clearDuplicatePushToken(env, updated.push_token, device.device_id);

  const player = await findPlayer(env, groupId, updated.player_id);
  return jsonResponse({ device: serializeDevice(updated), player, otherDevicesForPlayer }, corsHeaders);
}

export async function deleteMyDevice(
  request: Request,
  env: Env,
  groupId: number,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const device = await requireDevice(request, env, groupId);
  await env.cricket_mgr.batch([
    env.cricket_mgr.prepare('DELETE FROM trip_locations WHERE device_id = ?').bind(device.device_id),
    env.cricket_mgr.prepare('DELETE FROM group_devices WHERE device_id = ?').bind(device.device_id)
  ]);
  return jsonResponse({ success: true }, corsHeaders);
}

export async function listDevices(
  request: Request,
  env: Env,
  groupId: number,
  corsHeaders: CorsHeaders
): Promise<Response> {
  await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const devices = await env.cricket_mgr.prepare(`
    SELECT device_id, player_id, platform, push_token, last_seen_at
    FROM group_devices WHERE group_id = ? ORDER BY last_seen_at DESC
  `).bind(groupId).all<Pick<DeviceRow, 'device_id' | 'player_id' | 'platform' | 'push_token' | 'last_seen_at'>>();
  return jsonResponse({
    devices: (devices.results || []).map(device => ({
      ...serializeDevice(device),
      lastSeenAt: device.last_seen_at
    }))
  }, corsHeaders);
}

export async function resetPlayerClaims(
  request: Request,
  env: Env,
  groupId: number,
  playerId: string,
  corsHeaders: CorsHeaders
): Promise<Response> {
  await requireDevice(request, env, groupId);
  await requireAdmin(request, env, groupId);
  const result = await env.cricket_mgr.batch([
    env.cricket_mgr.prepare(`
      DELETE FROM trip_locations WHERE player_id = ?
        AND game_day_id IN (SELECT id FROM game_days WHERE group_id = ?)
    `).bind(playerId, groupId),
    env.cricket_mgr.prepare(
      'UPDATE group_devices SET player_id = NULL WHERE group_id = ? AND player_id = ?'
    ).bind(groupId, playerId)
  ]);
  return jsonResponse({ success: true, devicesReset: result[1]?.meta?.changes ?? 0 }, corsHeaders);
}
