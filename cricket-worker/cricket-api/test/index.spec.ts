import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, it, expect } from 'vitest';
import worker from '../src';

const scorecardImport = {
	group_id: 42,
	admin_password_hash: 'admin-password-hash',
	scorecard: {
		team1: 'Alice',
		team2: 'Bob',
		team1CaptainName: 'Alice',
		team2CaptainName: 'Bob',
		result: 'Alice won by 10 runs',
		innings: [
			{
				teamName: 'Alice',
				score: '20-1',
				overs: 2,
				batting: [
					{
						sourceName: 'Alice',
						runs: 15,
						ballsFaced: 10,
						fours: 2,
						sixes: 0,
						ballsBowled: 0,
						runsConceded: 0,
						wickets: 0,
						maidenOvers: 0,
						isOut: false,
						notOuts: 1,
						dismissalType: null
					},
					{
						sourceName: 'Accidental Player',
						runs: 5,
						ballsFaced: 2,
						fours: 1,
						sixes: 0,
						ballsBowled: 0,
						runsConceded: 0,
						wickets: 0,
						maidenOvers: 0,
						isOut: true,
						notOuts: 0,
						dismissalType: 'bowled'
					}
				],
				bowling: [
					{
						sourceName: 'Bob',
						runs: 0,
						ballsFaced: 0,
						fours: 0,
						sixes: 0,
						ballsBowled: 12,
						runsConceded: 20,
						wickets: 1,
						maidenOvers: 0,
						isOut: false,
						notOuts: 0,
						dismissalType: null
					}
				]
			},
			{
				teamName: 'Bob',
				score: '10-2',
				overs: 2,
				batting: [
					{
						sourceName: 'Bob',
						runs: 10,
						ballsFaced: 12,
						fours: 1,
						sixes: 0,
						ballsBowled: 0,
						runsConceded: 0,
						wickets: 0,
						maidenOvers: 0,
						isOut: true,
						notOuts: 0,
						dismissalType: 'caught'
					}
				],
				bowling: [
					{
						sourceName: 'Alice',
						runs: 0,
						ballsFaced: 0,
						fours: 0,
						sixes: 0,
						ballsBowled: 12,
						runsConceded: 10,
						wickets: 2,
						maidenOvers: 0,
						isOut: false,
						notOuts: 0,
						dismissalType: null
					}
				]
			}
		]
	},
	mappings: [
		{ sourceName: 'Alice', playerId: 'alice-id' },
		{ sourceName: 'Bob', playerId: 'bob-id' }
	]
};

describe('Hello World user worker', () => {
	describe('request for /message', () => {
		it('/ responds with "Hello, World!" (unit style)', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/message');
			// Create an empty context to pass to `worker.fetch()`.
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
			await waitOnExecutionContext(ctx);
			expect(await response.text()).toMatchInlineSnapshot(`"Hello, World!"`);
		});

		it('responds with "Hello, World!" (integration style)', async () => {
			const request = new Request('http://example.com/message');
			const response = await SELF.fetch(request);
			expect(await response.text()).toBe('Hello, World!');
		});
	});

	describe('scorecard import confirmation', () => {
		beforeAll(async () => {
			await env.cricket_mgr.batch([
				env.cricket_mgr.prepare(`
					CREATE TABLE IF NOT EXISTS groups (
						id INTEGER PRIMARY KEY,
						group_name TEXT NOT NULL,
						password_hash TEXT,
						admin_password_hash TEXT,
						updated_at TEXT
					)
				`),
				env.cricket_mgr.prepare(
					'CREATE TABLE IF NOT EXISTS player_data (Player_ID TEXT PRIMARY KEY, group_id INTEGER NOT NULL)'
				),
				env.cricket_mgr.prepare(`
					CREATE TABLE IF NOT EXISTS match_data (
						Match_ID TEXT PRIMARY KEY,
						group_id INTEGER NOT NULL,
						Date TEXT,
						Team1 TEXT,
						Team2 TEXT,
						Team1_Composition TEXT,
						Team2_Composition TEXT,
						Team1_Captain TEXT,
						Team2_Captain TEXT,
						Winning_Team TEXT,
						Losing_Team TEXT,
						Winning_Team_Score TEXT,
						Losing_Team_Score TEXT,
						Result TEXT,
						Overs INTEGER,
						Game_Finish_Time TEXT,
						Man_Of_The_Match TEXT,
						Winning_Captain TEXT,
						Losing_Captain TEXT,
						Import_Fingerprint TEXT
					)
				`),
				env.cricket_mgr.prepare(`
					CREATE TABLE IF NOT EXISTS performance_data (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						Match_ID TEXT NOT NULL,
						Player_ID TEXT NOT NULL,
						notOuts INTEGER,
						runs INTEGER,
						ballsFaced INTEGER,
						fours INTEGER,
						sixes INTEGER,
						ballsBowled INTEGER,
						runsConceded INTEGER,
						wickets INTEGER,
						maidenOvers INTEGER,
						isOut BOOLEAN,
						dismissalType TEXT
					)
				`)
			]);
		});

		beforeEach(async () => {
			await env.cricket_mgr.batch([
				env.cricket_mgr.prepare('DELETE FROM groups'),
				env.cricket_mgr.prepare('DELETE FROM performance_data'),
				env.cricket_mgr.prepare('DELETE FROM match_data'),
				env.cricket_mgr.prepare('DELETE FROM player_data'),
				env.cricket_mgr.prepare(
					'INSERT INTO groups (id, group_name, password_hash, admin_password_hash) VALUES (?, ?, ?, ?), (?, ?, ?, ?)'
				).bind(
					42, 'match-group', 'member-password-hash', 'admin-password-hash',
					7, 'members', 'member-password-hash', 'members-admin-password-hash'
				),
				env.cricket_mgr.prepare(
					'INSERT INTO player_data (Player_ID, group_id) VALUES (?, ?), (?, ?)'
				).bind('alice-id', 42, 'bob-id', 42)
			]);
		});

		it('authenticates member and administrator passwords separately', async () => {
			const memberRequest = new Request('http://example.com/groups/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					group_name: 'match-group',
					password_hash: 'member-password-hash',
					login_as_admin: false
				})
			});
			const memberContext = createExecutionContext();
			const memberResponse = await worker.fetch(memberRequest, env, memberContext);
			await waitOnExecutionContext(memberContext);
			expect(memberResponse.status).toBe(200);
			expect(await memberResponse.json()).toMatchObject({
				success: true,
				group: { id: 42, name: 'match-group', isAdmin: false }
			});

			const adminRequest = new Request('http://example.com/groups/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					group_name: 'match-group',
					password_hash: 'admin-password-hash',
					login_as_admin: true
				})
			});
			const adminContext = createExecutionContext();
			const adminResponse = await worker.fetch(adminRequest, env, adminContext);
			await waitOnExecutionContext(adminContext);
			expect(adminResponse.status).toBe(200);
			expect(await adminResponse.json()).toMatchObject({
				success: true,
				group: { id: 42, name: 'match-group', isAdmin: true }
			});
		});

		it('allows a legacy group to configure its administrator password once', async () => {
			await env.cricket_mgr.prepare(
				'INSERT INTO groups (id, group_name, password_hash, admin_password_hash) VALUES (?, ?, ?, NULL)'
			).bind(99, 'legacy-group', 'legacy-member-password-hash').run();

			const request = new Request('http://example.com/groups/99/admin-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					group_password_hash: 'legacy-member-password-hash',
					admin_password_hash: 'legacy-admin-password-hash'
				})
			});
			const context = createExecutionContext();
			const response = await worker.fetch(request, env, context);
			await waitOnExecutionContext(context);

			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({ success: true });
			expect(await env.cricket_mgr.prepare(
				'SELECT admin_password_hash FROM groups WHERE id = ?'
			).bind(99).first()).toMatchObject({
				admin_password_hash: 'legacy-admin-password-hash'
			});
		});

		it('rejects scorecard imports from non-admin groups', async () => {
			const request = new Request('http://example.com/scorecard-imports/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...scorecardImport,
					group_id: 7,
					admin_password_hash: 'incorrect-password-hash'
				})
			});
			const context = createExecutionContext();
			const response = await worker.fetch(request, env, context);
			await waitOnExecutionContext(context);

			expect(response.status).toBe(403);
			expect(await response.json()).toMatchObject({
				error: 'Scorecard imports require an administrator login.'
			});
		});

		it('rejects scorecard previews from non-admin groups', async () => {
			const form = new FormData();
			form.append('group_id', '7');
			form.append('admin_password_hash', 'incorrect-password-hash');
			form.append('scorecard', new File(['not-a-pdf'], 'scorecard.pdf', { type: 'application/pdf' }));
			const request = new Request('http://example.com/scorecard-imports/preview', {
				method: 'POST',
				body: form
			});
			const context = createExecutionContext();
			const response = await worker.fetch(request, env, context);
			await waitOnExecutionContext(context);

			expect(response.status).toBe(403);
			expect(await response.json()).toMatchObject({
				error: 'Scorecard imports require an administrator login.'
			});
		});

		it('excludes an ignored non-captain source name from imported data', async () => {
			const request = new Request('http://example.com/scorecard-imports/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...scorecardImport,
					ignoredSourceNames: ['Accidental Player']
				})
			});
			const context = createExecutionContext();
			const response = await worker.fetch(request, env, context);
			await waitOnExecutionContext(context);

			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({ success: true, alreadyImported: false });
			expect(await env.cricket_mgr.prepare(
				'SELECT Player_ID, runs FROM performance_data ORDER BY Player_ID'
			).all()).toMatchObject({
				results: [
					{ Player_ID: 'alice-id', runs: 15 },
					{ Player_ID: 'bob-id', runs: 10 }
				]
			});
			const match = await env.cricket_mgr.prepare(
				'SELECT Team1_Composition FROM match_data'
			).first<{ Team1_Composition: string }>();
			expect(JSON.parse(match?.Team1_Composition || '[]')).toEqual(['alice-id']);
		});

		it('rejects ignoring a captain named in the scorecard title', async () => {
			const request = new Request('http://example.com/scorecard-imports/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...scorecardImport,
					mappings: [{ sourceName: 'Bob', playerId: 'bob-id' }],
					ignoredSourceNames: ['Alice', 'Accidental Player']
				})
			});
			const context = createExecutionContext();
			const response = await worker.fetch(request, env, context);
			await waitOnExecutionContext(context);

			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({
				error: 'A captain named in the scorecard title cannot be ignored. Confirm their roster association instead.'
			});
		});
	});

	describe('request for /random', () => {
		it('/ responds with a random UUID (unit style)', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/random');
			// Create an empty context to pass to `worker.fetch()`.
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
			await waitOnExecutionContext(ctx);
			expect(await response.text()).toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
		});

		it('responds with a random UUID (integration style)', async () => {
			const request = new Request('http://example.com/random');
			const response = await SELF.fetch(request);
			expect(await response.text()).toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
		});
	});
});
