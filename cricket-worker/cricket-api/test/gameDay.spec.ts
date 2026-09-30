import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src';
import schemaSql from '../../../DB/schema.sql?raw';
import migrationSql from '../../../DB/migrations/20261001_add_game_day.sql?raw';
import { clearGeoCaches, estimateTravel, haversineMeters } from '../src/geo';
import { buildFcmMessage, resetPushStateForTests } from '../src/push';
import { runScheduledTasks } from '../src/scheduler';
import { dayBeforeReminderAt, zonedTimeToUtc } from '../src/time';

const HOUR = 60 * 60 * 1000;
const MEMBER_HASH = 'member-hash';
const ADMIN_HASH = 'admin-hash';
const VENUE = { name: 'Oval Ground', address: '1 Cricket Way, Sydney', lat: -33.8915, lng: 151.2247 };

interface FetchCall {
	url: string;
	body: any;
}

let testEnv: Env;
let serviceAccountJson = '';
let fetchCalls: FetchCall[] = [];
let fcmResponder: (message: any) => Response;
let orsResponder: () => Response;

function splitSql(sql: string): string[] {
	return sql
		.split('\n')
		.filter(line => !line.trim().startsWith('--'))
		.join('\n')
		.split(';')
		.map(statement => statement.trim())
		.filter(Boolean);
}

async function applySql(sql: string): Promise<void> {
	await env.cricket_mgr.batch(splitSql(sql).map(statement => env.cricket_mgr.prepare(statement)));
}

async function createServiceAccountJson(): Promise<string> {
	const keyPair = await crypto.subtle.generateKey(
		{ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
		true,
		['sign', 'verify']
	) as CryptoKeyPair;
	const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey) as ArrayBuffer);
	let binary = '';
	pkcs8.forEach(byte => {
		binary += String.fromCharCode(byte);
	});
	const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(binary).match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;
	return JSON.stringify({
		project_id: 'bccb-test',
		client_email: 'push@bccb-test.iam.gserviceaccount.com',
		private_key: pem,
		token_uri: 'https://oauth2.googleapis.com/token'
	});
}

function installFetchMock(): void {
	fetchCalls = [];
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
		let body: any = typeof init?.body === 'string' ? init.body : undefined;
		try {
			body = body ? JSON.parse(body) : undefined;
		} catch {
			// Form-encoded bodies stay as text.
		}
		fetchCalls.push({ url, body });
		if (url.startsWith('https://oauth2.googleapis.com/token')) {
			return Response.json({ access_token: 'test-access-token', expires_in: 3600 });
		}
		if (url.startsWith('https://fcm.googleapis.com/')) return fcmResponder(body);
		if (url.startsWith('https://api.openrouteservice.org/')) return orsResponder();
		if (url.startsWith('https://nominatim.openstreetmap.org/search')) {
			return Response.json([{
				lat: '-33.8915',
				lon: '151.2247',
				name: 'Sydney Cricket Ground',
				display_name: 'Sydney Cricket Ground, Moore Park, Sydney'
			}]);
		}
		if (url.startsWith('https://nominatim.openstreetmap.org/reverse')) {
			return Response.json({ lat: '-33.8915', lon: '151.2247', name: '', display_name: 'Driver Avenue, Moore Park, Sydney' });
		}
		throw new Error(`Unexpected fetch to ${url}`);
	});
}

function fcmMessages(): any[] {
	return fetchCalls.filter(call => call.url.startsWith('https://fcm.googleapis.com/')).map(call => call.body.message);
}

async function call(
	method: string,
	path: string,
	options: { body?: unknown; token?: string; admin?: string; env?: Env } = {}
): Promise<{ status: number; body: any }> {
	const headers = new Headers({ 'Content-Type': 'application/json' });
	if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
	if (options.admin) headers.set('X-Admin-Password-Hash', options.admin);
	const request = new Request<unknown, IncomingRequestCfProperties>(`https://example.com${path}`, {
		method,
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body)
	});
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, options.env ?? testEnv, ctx);
	await waitOnExecutionContext(ctx);
	return { status: response.status, body: await response.json() };
}

function groupNameFor(groupId: number): string {
	return groupId === 7 ? 'lions' : groupId === 8 ? 'tigers' : 'guest';
}

async function register(
	deviceId: string,
	options: {
		groupId?: number;
		groupName?: string;
		member?: string | null;
		admin?: string;
		platform?: string;
		pushToken?: string | null;
		token?: string;
	} = {}
) {
	const groupId = options.groupId ?? 7;
	return call('POST', `/groups/${groupId}/devices`, {
		token: options.token,
		body: {
			device_id: deviceId,
			group_name: options.groupName ?? groupNameFor(groupId),
			group_password_hash: options.member === undefined ? MEMBER_HASH : options.member,
			admin_password_hash: options.admin,
			platform: options.platform ?? 'android',
			push_token: options.pushToken ?? null,
			app_version: '2.2.0'
		}
	});
}

async function device(
	deviceId: string,
	playerId?: string,
	options: Parameters<typeof register>[1] = {}
): Promise<string> {
	const response = await register(deviceId, options);
	expect(response.status).toBe(201);
	const token = response.body.device.token as string;
	if (playerId) {
		const claim = await call('PUT', `/groups/${options.groupId ?? 7}/devices/me`, { token, body: { player_id: playerId } });
		expect(claim.status).toBe(200);
	}
	return token;
}

function gameInput(overrides: Record<string, unknown> = {}) {
	const startsAt = new Date(Date.now() + 3 * 24 * HOUR);
	return {
		title: 'Saturday Social',
		startsAt: startsAt.toISOString(),
		reachBy: new Date(startsAt.getTime() - 30 * 60 * 1000).toISOString(),
		timezone: 'Australia/Sydney',
		venue: VENUE,
		notes: 'Bring whites',
		...overrides
	};
}

async function createGame(adminToken: string, overrides: Record<string, unknown> = {}) {
	const response = await call('POST', '/groups/7/game-days', { token: adminToken, admin: ADMIN_HASH, body: gameInput(overrides) });
	expect(response.status).toBe(201);
	return response.body.gameDay;
}

function soonGame(minutesUntilStart = 120) {
	const startsAt = new Date(Date.now() + minutesUntilStart * 60 * 1000);
	return { startsAt: startsAt.toISOString(), reachBy: new Date(startsAt.getTime() - 30 * 60 * 1000).toISOString() };
}

async function insertGame(id: string, startsAt: Date, reachBy: Date, timezone = 'Australia/Sydney'): Promise<void> {
	const now = new Date().toISOString();
	await env.cricket_mgr.prepare(`
		INSERT INTO game_days (id, group_id, title, starts_at, reach_by, timezone, venue_name, venue_lat, venue_lng,
			status, created_at, updated_at)
		VALUES (?, 7, 'Game Day', ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
	`).bind(id, startsAt.toISOString(), reachBy.toISOString(), timezone, VENUE.name, VENUE.lat, VENUE.lng, now, now).run();
}

beforeAll(async () => {
	await applySql(schemaSql);
	await applySql(migrationSql);
	serviceAccountJson = await createServiceAccountJson();
});

beforeEach(async () => {
	testEnv = { ...env, FCM_SERVICE_ACCOUNT_JSON: serviceAccountJson, ORS_API_KEY: 'ors-test-key' };
	installFetchMock();
	clearGeoCaches();
	resetPushStateForTests();
	fcmResponder = () => Response.json({ name: 'projects/bccb-test/messages/1' });
	orsResponder = () => Response.json({ routes: [{ summary: { duration: 1500, distance: 14200 } }] });
	await env.cricket_mgr.batch([
		...['trip_locations', 'group_tosses', 'game_day_rsvps', 'game_days', 'group_devices', 'player_data', 'groups']
			.map(table => env.cricket_mgr.prepare(`DELETE FROM ${table}`)),
		env.cricket_mgr.prepare(`
			INSERT INTO groups (id, group_name, password_hash, admin_password_hash)
			VALUES (1, 'guest', NULL, NULL), (7, 'lions', ?, ?), (8, 'tigers', NULL, 'tigers-admin')
		`).bind(MEMBER_HASH, ADMIN_HASH),
		env.cricket_mgr.prepare(`
			INSERT INTO player_data (Player_ID, group_id, Name)
			VALUES ('p1', 7, 'Alice'), ('p2', 7, 'Bob'), ('p3', 7, 'Chen'), ('p4', 7, 'Dev'), ('t1', 8, 'Tom')
		`)
	]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Game Day device registration', () => {
	it('rejects the shared guest group and incorrect credentials', async () => {
		expect((await register('device-guest-1', { groupId: 1, member: null })).status).toBe(403);
		expect((await register('device-wrong-1', { member: 'wrong' })).status).toBe(401);
		expect((await register('device-wrong-2', { groupName: 'tigers' })).status).toBe(401);
		expect((await register('bad id!', {})).status).toBe(400);
	});

	it('accepts member, administrator, and open-group registrations', async () => {
		const member = await register('device-member-1');
		expect(member.status).toBe(201);
		expect(member.body).toMatchObject({
			device: { deviceId: 'device-member-1', playerId: null, platform: 'android', hasPush: false },
			group: { id: 7, name: 'lions', hasMemberPassword: true, isAdmin: false }
		});
		expect(member.body.device.token).toMatch(/^device-member-1\.[A-Za-z0-9_-]{40,}$/);

		const admin = await register('device-admin-1', { member: null, admin: ADMIN_HASH });
		expect(admin.status).toBe(201);
		expect(admin.body.group.isAdmin).toBe(true);

		const open = await register('device-open-1', { groupId: 8, member: null });
		expect(open.status).toBe(201);
		expect(open.body.group.hasMemberPassword).toBe(false);

		const stored = await env.cricket_mgr.prepare(
			"SELECT token_hash FROM group_devices WHERE device_id = 'device-member-1'"
		).first<{ token_hash: string }>();
		expect(stored?.token_hash).toMatch(/^[0-9a-f]{64}$/);
		expect(stored?.token_hash).not.toContain(member.body.device.token.split('.')[1]);
	});

	it('requires valid device credentials for Game Day routes', async () => {
		expect((await call('GET', '/groups/7/game-days')).status).toBe(401);
		expect((await call('GET', '/groups/7/game-days', { token: 'device-member-1.not-a-real-secret-value' })).status).toBe(401);
		const token = await device('device-member-1');
		expect((await call('GET', '/groups/8/game-days', { token })).status).toBe(401);
		expect((await call('GET', '/groups/7/game-days', { token })).status).toBe(200);
	});

	it('claims roster players only from the same group and reports shared claims', async () => {
		const token = await device('device-member-1');
		expect((await call('PUT', '/groups/7/devices/me', { token, body: { player_id: 't1' } })).status).toBe(400);
		const claim = await call('PUT', '/groups/7/devices/me', { token, body: { player_id: 'p1' } });
		expect(claim.status).toBe(200);
		expect(claim.body).toMatchObject({ device: { playerId: 'p1' }, player: { id: 'p1', name: 'Alice' }, otherDevicesForPlayer: 0 });

		const secondToken = await device('device-member-2');
		const second = await call('PUT', '/groups/7/devices/me', { token: secondToken, body: { player_id: 'p1' } });
		expect(second.body.otherDevicesForPlayer).toBe(1);

		const me = await call('GET', '/groups/7/devices/me', { token });
		expect(me.body.player).toEqual({ id: 'p1', name: 'Alice' });
	});

	it('keeps a claim only when a re-registering device proves its credentials', async () => {
		const token = await device('device-member-1', 'p2');
		const proven = await register('device-member-1', { token });
		expect(proven.body.device.playerId).toBe('p2');
		const unproven = await register('device-member-1');
		expect(unproven.body.device.playerId).toBeNull();
		expect((await call('GET', '/groups/7/devices/me', { token })).status).toBe(401);
	});

	it('moves a push token to the device that registered it most recently', async () => {
		await device('device-member-1', undefined, { pushToken: 'shared-push-token' });
		await device('device-member-2', undefined, { pushToken: 'shared-push-token' });
		const rows = await env.cricket_mgr.prepare(
			'SELECT device_id, push_token FROM group_devices ORDER BY device_id'
		).all<{ device_id: string; push_token: string | null }>();
		expect(rows.results).toEqual([
			{ device_id: 'device-member-1', push_token: null },
			{ device_id: 'device-member-2', push_token: 'shared-push-token' }
		]);
	});

	it('lets members leave and administrators reset player claims', async () => {
		const adminToken = await device('device-admin-1', undefined, { admin: ADMIN_HASH });
		const token = await device('device-member-1', 'p3');
		expect((await call('DELETE', '/groups/7/players/p3/claims', { token })).status).toBe(403);
		const reset = await call('DELETE', '/groups/7/players/p3/claims', { token: adminToken, admin: ADMIN_HASH });
		expect(reset.body).toEqual({ success: true, devicesReset: 1 });

		const devices = await call('GET', '/groups/7/devices', { token: adminToken, admin: ADMIN_HASH });
		expect(devices.body.devices).toHaveLength(2);

		expect((await call('DELETE', '/groups/7/devices/me', { token })).status).toBe(200);
		expect((await call('GET', '/groups/7/devices/me', { token })).status).toBe(401);
	});
});

describe('Game day scheduling and replies', () => {
	it('restricts creation to administrators and validates the schedule', async () => {
		const memberToken = await device('device-member-1', 'p1');
		const adminToken = await device('device-admin-1', 'p2', { admin: ADMIN_HASH });
		expect((await call('POST', '/groups/7/game-days', { token: memberToken, body: gameInput() })).status).toBe(403);

		const invalid = async (overrides: Record<string, unknown>) =>
			(await call('POST', '/groups/7/game-days', { token: adminToken, admin: ADMIN_HASH, body: gameInput(overrides) })).status;
		const future = new Date(Date.now() + 2 * 24 * HOUR);
		expect(await invalid({ startsAt: new Date(Date.now() - HOUR).toISOString(), reachBy: new Date(Date.now() - 2 * HOUR).toISOString() })).toBe(400);
		expect(await invalid({ startsAt: future.toISOString(), reachBy: new Date(future.getTime() + 60_000).toISOString() })).toBe(400);
		expect(await invalid({ startsAt: future.toISOString(), reachBy: new Date(future.getTime() - 7 * HOUR).toISOString() })).toBe(400);
		expect(await invalid({ timezone: 'Mars/Olympus' })).toBe(400);
		expect(await invalid({ venue: { name: 'No coordinates' } })).toBe(400);
		expect(await invalid({ venue: null })).toBe(400);
	});

	it('creates a game and invites every other device with reply actions for claimed players', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH, pushToken: 'admin-push' });
		await device('device-android-1', 'p2', { pushToken: 'android-push' });
		await device('device-ios-1', 'p3', { platform: 'ios', pushToken: 'ios-push' });
		await device('device-unclaimed-1', undefined, { platform: 'ios', pushToken: 'unclaimed-push' });

		const game = await createGame(adminToken);
		expect(game).toMatchObject({
			title: 'Saturday Social',
			timezone: 'Australia/Sydney',
			venue: VENUE,
			notes: 'Bring whites',
			status: 'scheduled',
			counts: { yes: 0, maybe: 0, no: 0, pending: 4 },
			myResponse: null,
			toss: null
		});

		const messages = fcmMessages();
		expect(messages.map(message => message.token).sort()).toEqual(['android-push', 'ios-push', 'unclaimed-push']);
		const android = messages.find(message => message.token === 'android-push');
		expect(android.android).toEqual({ priority: 'HIGH', ttl: '86400s' });
		expect(android.apns).toBeUndefined();
		expect(android.data).toMatchObject({
			type: 'game_invite',
			gameDayId: game.id,
			groupId: '7',
			category: 'GAME_INVITE',
			route: `bccb://game-day/${game.id}`
		});
		expect(android.data.title).toMatch(/^🏏 Saturday Social: /);
		expect(android.data.body).toContain('at Oval Ground');

		const ios = messages.find(message => message.token === 'ios-push');
		expect(ios.apns.payload.aps).toMatchObject({ category: 'GAME_INVITE', sound: 'default' });
		expect(ios.apns.payload.aps.alert.title).toBe(android.data.title);
		const unclaimed = messages.find(message => message.token === 'unclaimed-push');
		expect(unclaimed.apns.payload.aps.category).toBeUndefined();
		expect(unclaimed.data.category).toBe('');
	});

	it('records replies, tallies them, and closes replies for cancelled games', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const bobToken = await device('device-member-2', 'p2');
		const chenToken = await device('device-member-3', 'p3');
		const unclaimedToken = await device('device-member-9');
		const game = await createGame(adminToken);

		expect((await call('PUT', `/groups/7/game-days/${game.id}/rsvp`, { token: unclaimedToken, body: { response: 'yes' } })).status).toBe(409);
		expect((await call('PUT', `/groups/7/game-days/${game.id}/rsvp`, { token: bobToken, body: { response: 'sure' } })).status).toBe(400);

		await call('PUT', `/groups/7/game-days/${game.id}/rsvp`, { token: adminToken, body: { response: 'yes' } });
		await call('PUT', `/groups/7/game-days/${game.id}/rsvp`, { token: bobToken, body: { response: 'maybe' } });
		const reply = await call('PUT', `/groups/7/game-days/${game.id}/rsvp`, { token: chenToken, body: { response: 'no' } });
		expect(reply.status).toBe(200);
		expect(reply.body.gameDay).toMatchObject({
			rsvps: { yes: ['p1'], maybe: ['p2'], no: ['p3'] },
			counts: { yes: 1, maybe: 1, no: 1, pending: 1 },
			myResponse: 'no'
		});

		const changed = await call('PUT', `/groups/7/game-days/${game.id}/rsvp`, { token: bobToken, body: { response: 'yes' } });
		expect(changed.body.gameDay.counts).toEqual({ yes: 2, maybe: 0, no: 1, pending: 1 });

		const list = await call('GET', '/groups/7/game-days', { token: bobToken });
		expect(list.status).toBe(200);
		expect(list.body.players).toEqual([
			{ id: 'p1', name: 'Alice' },
			{ id: 'p2', name: 'Bob' },
			{ id: 'p3', name: 'Chen' },
			{ id: 'p4', name: 'Dev' }
		]);
		expect(list.body.me).toMatchObject({ deviceId: 'device-member-2', playerId: 'p2' });
		expect(list.body.gameDays[0]).toMatchObject({ id: game.id, myResponse: 'yes' });

		const cancelled = await call('POST', `/groups/7/game-days/${game.id}/cancel`, { token: adminToken, admin: ADMIN_HASH });
		expect(cancelled.body.gameDay.status).toBe('cancelled');
		expect((await call('PUT', `/groups/7/game-days/${game.id}/rsvp`, { token: bobToken, body: { response: 'no' } })).status).toBe(409);
		expect((await call('PUT', `/groups/7/game-days/${game.id}`, { token: adminToken, admin: ADMIN_HASH, body: { title: 'Again' } })).status).toBe(409);
	});

	it('notifies the group about schedule changes and cancellations', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		await device('device-ios-1', 'p3', { platform: 'ios', pushToken: 'ios-push' });
		const game = await createGame(adminToken);
		await env.cricket_mgr.prepare('UPDATE game_days SET reminder_sent_at = ? WHERE id = ?')
			.bind(new Date().toISOString(), game.id).run();
		fetchCalls = [];

		const renamed = await call('PUT', `/groups/7/game-days/${game.id}`, { token: adminToken, admin: ADMIN_HASH, body: { notes: 'Whites please' } });
		expect(renamed.body.gameDay.notes).toBe('Whites please');
		expect(fcmMessages()).toHaveLength(0);

		const newStart = new Date(Date.parse(game.startsAt) + HOUR);
		const moved = await call('PUT', `/groups/7/game-days/${game.id}`, {
			token: adminToken,
			admin: ADMIN_HASH,
			body: { startsAt: newStart.toISOString(), reachBy: new Date(newStart.getTime() - 45 * 60 * 1000).toISOString() }
		});
		expect(moved.status).toBe(200);
		expect(fcmMessages()[0].data.type).toBe('game_updated');
		const stored = await env.cricket_mgr.prepare('SELECT reminder_sent_at FROM game_days WHERE id = ?')
			.bind(game.id).first<{ reminder_sent_at: string | null }>();
		expect(stored?.reminder_sent_at).toBeNull();

		fetchCalls = [];
		await call('POST', `/groups/7/game-days/${game.id}/cancel`, { token: adminToken, admin: ADMIN_HASH });
		const cancel = fcmMessages()[0];
		expect(cancel.data.type).toBe('game_cancelled');
		expect(cancel.apns.payload.aps['content-available']).toBe(1);
	});

	it('nudges only devices that have not replied and rate-limits nudges', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH, pushToken: 'admin-push' });
		const bobToken = await device('device-member-2', 'p2', { pushToken: 'bob-push' });
		await device('device-member-3', 'p3', { pushToken: 'chen-push' });
		await device('device-member-9', undefined, { pushToken: 'unclaimed-push' });
		const game = await createGame(adminToken);
		await call('PUT', `/groups/7/game-days/${game.id}/rsvp`, { token: bobToken, body: { response: 'no' } });
		fetchCalls = [];

		expect((await call('POST', `/groups/7/game-days/${game.id}/nudge`, { token: bobToken })).status).toBe(403);
		const nudge = await call('POST', `/groups/7/game-days/${game.id}/nudge`, { token: adminToken, admin: ADMIN_HASH });
		expect(nudge.body).toEqual({ nudged: 2 });
		expect(fcmMessages().map(message => message.token).sort()).toEqual(['chen-push', 'unclaimed-push']);
		expect((await call('POST', `/groups/7/game-days/${game.id}/nudge`, { token: adminToken, admin: ADMIN_HASH })).status).toBe(429);
	});
});

describe('Push delivery', () => {
	it('skips delivery when Firebase is not configured', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		await device('device-member-2', 'p2', { pushToken: 'bob-push' });
		const unconfigured = { ...env } as Env;
		const response = await call('POST', '/groups/7/game-days', { token: adminToken, admin: ADMIN_HASH, body: gameInput(), env: unconfigured });
		expect(response.status).toBe(201);
		expect(fetchCalls).toHaveLength(0);
	});

	it('removes tokens that Firebase reports as unregistered', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		await device('device-member-2', 'p2', { pushToken: 'stale-push' });
		await device('device-member-3', 'p3', { pushToken: 'good-push' });
		fcmResponder = message => message.message.token === 'stale-push'
			? Response.json({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }, { status: 404 })
			: Response.json({ name: 'ok' });
		await createGame(adminToken);
		const tokens = await env.cricket_mgr.prepare(
			'SELECT device_id, push_token FROM group_devices WHERE device_id IN (?, ?) ORDER BY device_id'
		).bind('device-member-2', 'device-member-3').all<{ device_id: string; push_token: string | null }>();
		expect(tokens.results).toEqual([
			{ device_id: 'device-member-2', push_token: null },
			{ device_id: 'device-member-3', push_token: 'good-push' }
		]);
		const oauth = fetchCalls.filter(entry => entry.url.startsWith('https://oauth2.googleapis.com/token'));
		expect(oauth).toHaveLength(1);
		expect(oauth[0].body).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
	});

	it('builds data-only Android messages and alert iOS messages', () => {
		const notification = {
			type: 'game_cancelled' as const,
			title: 'Cancelled',
			body: 'No game',
			groupId: 7,
			gameDayId: 'game-1',
			route: 'bccb://game-day/game-1',
			contentAvailable: true
		};
		const android = buildFcmMessage({ deviceId: 'a', platform: 'android', pushToken: 'a-token', playerId: 'p1' }, notification) as any;
		expect(android.message.android.priority).toBe('HIGH');
		expect(android.message.notification).toBeUndefined();
		const ios = buildFcmMessage({ deviceId: 'i', platform: 'ios', pushToken: 'i-token', playerId: null }, notification) as any;
		expect(ios.message.apns.payload.aps).toMatchObject({
			alert: { title: 'Cancelled', body: 'No game' },
			'content-available': 1,
			'thread-id': 'game-game-1'
		});
	});
});

describe('Travel estimates and live trips', () => {
	it('estimates travel with OpenRouteService, falls back to distance, and rate-limits devices', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const game = await createGame(adminToken);
		const from = { lat: -33.7688, lng: 151.1543 };

		const routed = await call('POST', `/groups/7/game-days/${game.id}/route`, { token: adminToken, body: { from } });
		expect(routed.status).toBe(200);
		expect(routed.body.travel).toMatchObject({ durationSeconds: 1500, distanceMeters: 14200, source: 'openrouteservice' });
		expect(routed.body.travel.attribution).toContain('openrouteservice');
		const orsCall = fetchCalls.find(entry => entry.url.startsWith('https://api.openrouteservice.org/'));
		expect(orsCall?.body).toEqual({ coordinates: [[from.lng, from.lat], [VENUE.lng, VENUE.lat]] });

		clearGeoCaches();
		orsResponder = () => new Response('Service unavailable', { status: 503 });
		const estimated = await call('POST', `/groups/7/game-days/${game.id}/route`, { token: adminToken, body: { from } });
		expect(estimated.body.travel).toMatchObject({ source: 'estimate', attribution: null });
		expect(estimated.body.travel).toEqual({ ...estimateTravel(from, VENUE), attribution: null });

		expect((await call('POST', `/groups/7/game-days/${game.id}/route`, { token: adminToken, body: { from: { lat: 200, lng: 0 } } })).status).toBe(400);

		await env.cricket_mgr.prepare('UPDATE group_devices SET route_window_start = ?, route_calls = 40 WHERE device_id = ?')
			.bind(Math.floor(Date.now() / HOUR), 'device-admin-1').run();
		expect((await call('POST', `/groups/7/game-days/${game.id}/route`, { token: adminToken, body: { from } })).status).toBe(429);
	});

	it('only accepts trips inside the game-day window', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const game = await createGame(adminToken);
		const response = await call('POST', `/groups/7/game-days/${game.id}/trip`, { token: adminToken, body: { lat: -33.8, lng: 151.1 } });
		expect(response.status).toBe(409);
		expect(response.body.error).toContain('4 hours');
		const trips = await call('GET', `/groups/7/game-days/${game.id}/trips`, { token: adminToken });
		expect(trips.body).toMatchObject({ trips: [], window: { isOpen: false } });
	});

	it('shares live trips with the group, detects arrival, and stops on request', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const bobToken = await device('device-member-2', 'p2');
		const unclaimedToken = await device('device-member-9');
		const game = await createGame(adminToken, soonGame());

		expect((await call('POST', `/groups/7/game-days/${game.id}/trip`, { token: unclaimedToken, body: { lat: -33.8, lng: 151.1 } })).status).toBe(409);

		const start = await call('POST', `/groups/7/game-days/${game.id}/trip`, {
			token: bobToken,
			body: { lat: -33.7688, lng: 151.1543, accuracy: 12, heading: 90, speed: 11.5 }
		});
		expect(start.status).toBe(200);
		expect(start.body).toMatchObject({
			arrived: false,
			stopAfter: new Date(Date.parse(game.startsAt) + HOUR).toISOString(),
			trip: { playerId: 'p2', status: 'travelling', etaSeconds: 1500, accuracy: 12, heading: 90, speed: 11.5, stale: false }
		});
		expect(start.body.trip.distanceMeters).toBe(Math.round(haversineMeters({ lat: -33.7688, lng: 151.1543 }, VENUE)));

		const listed = await call('GET', `/groups/7/game-days/${game.id}/trips`, { token: adminToken });
		expect(listed.body.window.isOpen).toBe(true);
		expect(listed.body.trips).toHaveLength(1);
		expect(listed.body.trips[0]).toMatchObject({ playerId: 'p2', status: 'travelling' });
		const summary = await call('GET', `/groups/7/game-days/${game.id}`, { token: adminToken });
		expect(summary.body.gameDay.travellers).toBe(1);

		await env.cricket_mgr.prepare('UPDATE trip_locations SET updated_at = ? WHERE player_id = ?')
			.bind(new Date(Date.now() - 60_000).toISOString(), 'p2').run();
		const arrived = await call('POST', `/groups/7/game-days/${game.id}/trip`, {
			token: bobToken,
			body: { lat: VENUE.lat + 0.0005, lng: VENUE.lng }
		});
		expect(arrived.body).toMatchObject({ arrived: true, trip: { status: 'arrived', etaSeconds: 0 } });

		expect((await call('DELETE', `/groups/7/game-days/${game.id}/trip`, { token: bobToken })).body).toEqual({ stopped: true });
		expect((await call('GET', `/groups/7/game-days/${game.id}/trips`, { token: adminToken })).body.trips).toEqual([]);
	});

	it('ignores late updates from a stopped trip, erases its location, and accepts a new trip', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const bobToken = await device('device-member-2', 'p2');
		const game = await createGame(adminToken, soonGame());
		const firstTrip = Date.now() - 60_000;
		const update = (tripStartedAt?: number, lat = -33.7688) => call('POST', `/groups/7/game-days/${game.id}/trip`, {
			token: bobToken,
			body: tripStartedAt === undefined ? { lat, lng: 151.1543 } : { lat, lng: 151.1543, accuracy: 9, tripStartedAt }
		});

		expect((await update(firstTrip)).status).toBe(200);
		expect((await call('DELETE', `/groups/7/game-days/${game.id}/trip`, { token: bobToken })).body).toEqual({ stopped: true });

		const late = await update(firstTrip, -33.77);
		expect(late.status).toBe(409);
		expect(late.body.error).toContain('stopped sharing');
		expect((await update(undefined, -33.77)).status).toBe(409);
		expect((await call('GET', `/groups/7/game-days/${game.id}/trips`, { token: adminToken })).body.trips).toEqual([]);
		expect((await call('GET', `/groups/7/game-days/${game.id}`, { token: adminToken })).body.gameDay.travellers).toBe(0);
		const stored = await env.cricket_mgr.prepare('SELECT lat, lng, accuracy, status, client_started_ms FROM trip_locations WHERE player_id = ?')
			.bind('p2').first();
		expect(stored).toEqual({ lat: 0, lng: 0, accuracy: null, status: 'stopped', client_started_ms: firstTrip });

		const restarted = await update(firstTrip + 30_000);
		expect(restarted.status).toBe(200);
		expect(restarted.body.trip).toMatchObject({ playerId: 'p2', status: 'travelling', accuracy: 9 });
		const listed = await call('GET', `/groups/7/game-days/${game.id}/trips`, { token: adminToken });
		expect(listed.body.trips).toHaveLength(1);
		expect(listed.body.trips[0]).toMatchObject({ playerId: 'p2', status: 'travelling' });
	});

	it('blocks the first update of a trip that was stopped before it reached the server', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const game = await createGame(adminToken, soonGame());
		const tripStartedAt = Date.now();

		expect((await call('DELETE', `/groups/7/game-days/${game.id}/trip?tripStartedAt=${tripStartedAt}`, { token: adminToken })).status).toBe(200);
		const late = await call('POST', `/groups/7/game-days/${game.id}/trip`, {
			token: adminToken,
			body: { lat: -33.7688, lng: 151.1543, tripStartedAt }
		});
		expect(late.status).toBe(409);
		expect((await call('GET', `/groups/7/game-days/${game.id}/trips`, { token: adminToken })).body.trips).toEqual([]);

		expect((await call('DELETE', `/groups/7/game-days/${game.id}/trip?tripStartedAt=soon`, { token: adminToken })).status).toBe(400);
		expect((await call('POST', `/groups/7/game-days/${game.id}/trip`, {
			token: adminToken,
			body: { lat: -33.7688, lng: 151.1543, tripStartedAt: -5 }
		})).status).toBe(400);
	});

	it('removes live trips when a game is cancelled', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const game = await createGame(adminToken, soonGame());
		await call('POST', `/groups/7/game-days/${game.id}/trip`, { token: adminToken, body: { lat: -33.7688, lng: 151.1543 } });
		await call('POST', `/groups/7/game-days/${game.id}/cancel`, { token: adminToken, admin: ADMIN_HASH });
		const remaining = await env.cricket_mgr.prepare('SELECT COUNT(*) AS count FROM trip_locations').first<{ count: number }>();
		expect(remaining?.count).toBe(0);
	});
});

describe('Toss results', () => {
	const toss = {
		teams: [
			{ name: "Alice's XI", captainName: 'Alice', players: ['Alice', 'Bob'] },
			{ name: "Chen's XI", captainName: 'Chen', players: ['Chen', 'Dev'] }
		],
		winnerIndex: 1,
		decision: 'bowl',
		tossedAt: new Date().toISOString(),
		signature: 'p1,p2|p3,p4'
	};

	it('lets administrators publish tosses linked to the next game', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const memberToken = await device('device-member-2', 'p2');
		const game = await createGame(adminToken, soonGame(24 * 60));

		expect((await call('PUT', '/groups/7/tosses', { token: memberToken, body: { toss } })).status).toBe(403);
		expect((await call('PUT', '/groups/7/tosses', { token: adminToken, admin: ADMIN_HASH, body: { toss: { ...toss, decision: 'field' } } })).status).toBe(400);
		expect((await call('PUT', '/groups/7/tosses', { token: adminToken, admin: ADMIN_HASH, body: { toss: { ...toss, teams: [toss.teams[0]] } } })).status).toBe(400);

		const published = await call('PUT', '/groups/7/tosses', { token: adminToken, admin: ADMIN_HASH, body: { toss } });
		expect(published.status).toBe(201);
		expect(published.body.toss).toMatchObject({ gameDayId: game.id, winnerIndex: 1, decision: 'bowl', signature: 'p1,p2|p3,p4' });

		const latest = await call('GET', '/groups/7/tosses/latest', { token: memberToken });
		expect(latest.body.toss.id).toBe(published.body.toss.id);
		const list = await call('GET', '/groups/7/game-days', { token: memberToken });
		expect(list.body.gameDays[0].toss).toMatchObject({ winnerIndex: 1, decision: 'bowl' });
		expect(list.body.latestToss.id).toBe(published.body.toss.id);
	});

	it('keeps a toss unlinked when no game is coming up', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const published = await call('PUT', '/groups/7/tosses', { token: adminToken, admin: ADMIN_HASH, body: { toss } });
		expect(published.body.toss.gameDayId).toBeNull();
	});
});

describe('Venue search', () => {
	it('searches and reverse-geocodes venues for administrators', async () => {
		const adminToken = await device('device-admin-1', 'p1', { admin: ADMIN_HASH });
		const memberToken = await device('device-member-2', 'p2');
		expect((await call('GET', '/groups/7/geo/search?q=Sydney%20Cricket', { token: memberToken })).status).toBe(403);
		expect((await call('GET', '/groups/7/geo/search?q=SC', { token: adminToken, admin: ADMIN_HASH })).status).toBe(400);

		const search = await call('GET', '/groups/7/geo/search?q=Sydney%20Cricket', { token: adminToken, admin: ADMIN_HASH });
		expect(search.body.places).toEqual([{
			name: 'Sydney Cricket Ground',
			address: 'Sydney Cricket Ground, Moore Park, Sydney',
			lat: -33.8915,
			lng: 151.2247
		}]);
		const searchCall = fetchCalls.find(entry => entry.url.includes('nominatim.openstreetmap.org/search'));
		expect(searchCall?.url).toContain('format=jsonv2');

		const reverse = await call('GET', '/groups/7/geo/reverse?lat=-33.8915&lng=151.2247', { token: adminToken, admin: ADMIN_HASH });
		expect(reverse.body.place).toMatchObject({ name: 'Driver Avenue', lat: -33.8915, lng: 151.2247 });
	});
});

describe('Time-zone helpers', () => {
	it('converts local wall-clock times across daylight-saving changes', () => {
		expect(zonedTimeToUtc(2026, 10, 4, 7, 30, 'Australia/Sydney').toISOString()).toBe('2026-10-03T20:30:00.000Z');
		expect(zonedTimeToUtc(2026, 10, 3, 19, 0, 'Australia/Sydney').toISOString()).toBe('2026-10-03T09:00:00.000Z');
		expect(zonedTimeToUtc(2026, 3, 8, 9, 0, 'America/New_York').toISOString()).toBe('2026-03-08T13:00:00.000Z');
	});

	it('schedules the reminder for 7 PM local time on the day before the game', () => {
		const sydneyGame = zonedTimeToUtc(2026, 10, 4, 7, 30, 'Australia/Sydney');
		expect(dayBeforeReminderAt(sydneyGame, 'Australia/Sydney').toISOString()).toBe('2026-10-03T09:00:00.000Z');
		const newYorkGame = zonedTimeToUtc(2026, 3, 8, 9, 0, 'America/New_York');
		expect(dayBeforeReminderAt(newYorkGame, 'America/New_York').toISOString()).toBe('2026-03-08T00:00:00.000Z');
	});
});

describe('Scheduled Game Day tasks', () => {
	const timezone = 'Australia/Sydney';
	const startsAt = zonedTimeToUtc(2026, 10, 4, 7, 30, timezone);
	const reachBy = new Date(startsAt.getTime() - 30 * 60 * 1000);

	async function seedReplies(): Promise<void> {
		await device('device-yes-1', 'p1', { pushToken: 'yes-push' });
		await device('device-maybe-1', 'p2', { platform: 'ios', pushToken: 'maybe-push' });
		await device('device-no-1', 'p3', { pushToken: 'no-push' });
		await insertGame('game-sun', startsAt, reachBy, timezone);
		await env.cricket_mgr.prepare(`
			INSERT INTO game_day_rsvps (game_day_id, player_id, response) VALUES
				('game-sun', 'p1', 'yes'), ('game-sun', 'p2', 'maybe'), ('game-sun', 'p3', 'no')
		`).run();
	}

	it('sends day-before alarm and maybe reminders once, at 7 PM local time', async () => {
		await seedReplies();
		const early = await runScheduledTasks(testEnv, new Date('2026-10-03T08:45:00.000Z'));
		expect(early.remindersSent).toBe(0);
		expect(fcmMessages()).toHaveLength(0);

		const due = await runScheduledTasks(testEnv, new Date('2026-10-03T09:05:00.000Z'));
		expect(due.remindersSent).toBe(1);
		const messages = fcmMessages();
		expect(messages).toHaveLength(2);
		const alarm = messages.find(message => message.token === 'yes-push');
		expect(alarm.data).toMatchObject({ type: 'alarm_reminder', route: 'bccb://game-day/game-sun/alarm' });
		expect(alarm.data.body).toContain('Game tomorrow at 7:30');
		const maybe = messages.find(message => message.token === 'maybe-push');
		expect(maybe.data.type).toBe('maybe_reminder');
		expect(maybe.apns.payload.aps.category).toBe('GAME_INVITE');

		fetchCalls = [];
		const again = await runScheduledTasks(testEnv, new Date('2026-10-03T09:20:00.000Z'));
		expect(again.remindersSent).toBe(0);
		expect(fcmMessages()).toHaveLength(0);
	});

	it('skips reminders that would arrive too close to the reach-by time', async () => {
		await seedReplies();
		const late = await runScheduledTasks(testEnv, new Date(reachBy.getTime() - 2 * HOUR));
		expect(late).toMatchObject({ remindersSent: 0, remindersSkipped: 1 });
		expect(fcmMessages()).toHaveLength(0);
	});

	it('purges live trips after the game and runs from the cron trigger', async () => {
		await seedReplies();
		await env.cricket_mgr.prepare(`
			INSERT INTO trip_locations (game_day_id, player_id, device_id, lat, lng, status, started_at, updated_at)
			VALUES ('game-sun', 'p1', 'device-yes-1', -33.8, 151.1, 'travelling', ?, ?)
		`).bind(startsAt.toISOString(), startsAt.toISOString()).run();

		const summary = await runScheduledTasks(testEnv, new Date(startsAt.getTime() + 7 * HOUR));
		expect(summary.tripsPurged).toBe(1);

		const controller = createScheduledController({ scheduledTime: new Date(startsAt.getTime() + 8 * HOUR), cron: '*/15 * * * *' });
		const ctx = createExecutionContext();
		await worker.scheduled(controller, testEnv, ctx);
		await waitOnExecutionContext(ctx);
	});
});
