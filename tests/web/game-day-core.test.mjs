import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const core = require('../../native-android-app/app/src/main/assets/game-day-core.js');

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const SYDNEY = 'Australia/Sydney';

describe('recommendAlarm', () => {
    const reachBy = '2026-10-03T20:00:00.000Z';

    it('subtracts travel time and the getting-ready buffer from the reach-by time', () => {
        const plan = core.recommendAlarm({ reachBy, travelSeconds: 25 * 60, prepMinutes: 45, now: Date.parse('2026-10-03T09:00:00Z') });
        assert.equal(new Date(plan.leaveAtMs).toISOString(), '2026-10-03T19:35:00.000Z');
        assert.equal(new Date(plan.alarmAtMs).toISOString(), '2026-10-03T18:50:00.000Z');
        assert.equal(plan.status, 'scheduled');
        assert.equal(plan.prepMinutes, 45);
    });

    it('rounds the leave time down to the minute so the alarm never runs late', () => {
        const plan = core.recommendAlarm({ reachBy, travelSeconds: 1501, prepMinutes: 30, now: 0 });
        assert.equal(new Date(plan.leaveAtMs).toISOString(), '2026-10-03T19:34:00.000Z');
        assert.equal(new Date(plan.alarmAtMs).toISOString(), '2026-10-03T19:04:00.000Z');
    });

    it('uses the default buffer and clamps unusual buffers to 5-minute steps', () => {
        assert.equal(core.recommendAlarm({ reachBy, travelSeconds: 0, now: 0 }).prepMinutes, 45);
        assert.equal(core.recommendAlarm({ reachBy, travelSeconds: 0, prepMinutes: 500, now: 0 }).prepMinutes, 120);
        assert.equal(core.recommendAlarm({ reachBy, travelSeconds: 0, prepMinutes: -10, now: 0 }).prepMinutes, 0);
        assert.equal(core.recommendAlarm({ reachBy, travelSeconds: 0, prepMinutes: 32, now: 0 }).prepMinutes, 30);
        assert.equal(core.clampPrepMinutes('not a number'), 45);
    });

    it('reports when it is already time to get ready or leave', () => {
        const reach = Date.parse(reachBy);
        const getReady = core.recommendAlarm({ reachBy, travelSeconds: 1800, prepMinutes: 45, now: reach - 60 * MINUTE });
        assert.equal(getReady.status, 'get-ready-now');
        const leaveNow = core.recommendAlarm({ reachBy, travelSeconds: 1800, prepMinutes: 45, now: reach - 20 * MINUTE });
        assert.equal(leaveNow.status, 'leave-now');
    });

    it('rejects a missing reach-by time', () => {
        assert.throws(() => core.recommendAlarm({ reachBy: 'soon', travelSeconds: 60 }), /reach-by/);
    });
});

describe('windows', () => {
    const game = { status: 'scheduled', startsAt: '2026-10-03T20:30:00.000Z', reachBy: '2026-10-03T20:00:00.000Z' };

    it('opens the alarm window 36 hours before reach-by for scheduled games only', () => {
        const reach = Date.parse(game.reachBy);
        assert.equal(core.isAlarmWindowOpen(game, reach - 37 * HOUR), false);
        assert.equal(core.isAlarmWindowOpen(game, reach - 36 * HOUR), true);
        assert.equal(core.isAlarmWindowOpen(game, reach), false);
        assert.equal(core.isAlarmWindowOpen({ ...game, status: 'cancelled' }, reach - HOUR), false);
    });

    it('matches the Worker trip window', () => {
        const window = core.tripWindow(game);
        assert.equal(new Date(window.opensAtMs).toISOString(), '2026-10-03T16:00:00.000Z');
        assert.equal(new Date(window.closesAtMs).toISOString(), '2026-10-03T22:30:00.000Z');
        assert.equal(new Date(window.stopAfterMs).toISOString(), '2026-10-03T21:30:00.000Z');
        assert.equal(core.isTripWindowOpen(game, window.opensAtMs - 1), false);
        assert.equal(core.isTripWindowOpen(game, window.opensAtMs), true);
        assert.equal(core.isTripWindowOpen(game, window.closesAtMs + 1), false);
    });

    it('only starts trips before they would stop on their own', () => {
        const window = core.tripWindow(game);
        assert.equal(core.canStartTrip(game, window.opensAtMs - 1), false);
        assert.equal(core.canStartTrip(game, window.opensAtMs), true);
        assert.equal(core.canStartTrip(game, window.stopAfterMs - 1), true);
        assert.equal(core.canStartTrip(game, window.stopAfterMs), false);
        assert.equal(core.isTripWindowOpen(game, window.stopAfterMs + 1), true);
        assert.equal(core.canStartTrip({ ...game, status: 'cancelled' }, window.opensAtMs), false);
    });
});

describe('tally', () => {
    it('summarises replies with percentages for the tally bar', () => {
        const result = core.tally({ counts: { yes: 5, maybe: 2, no: 1, pending: 2 } });
        assert.equal(result.total, 10);
        assert.deepEqual(result.segments.map(segment => [segment.key, segment.count, segment.percent]), [
            ['yes', 5, 50],
            ['maybe', 2, 20],
            ['no', 1, 10],
            ['pending', 2, 20]
        ]);
        assert.equal(core.tally({}).total, 0);
    });
});

describe('formatting', () => {
    it('formats travel durations and distances', () => {
        assert.equal(core.formatDuration(20), 'under a minute');
        assert.equal(core.formatDuration(25 * 60), '25 min');
        assert.equal(core.formatDuration(65 * 60), '1 h 5 min');
        assert.equal(core.formatDuration(120 * 60), '2 h');
        assert.equal(core.formatDistance(847), '850 m');
        assert.equal(core.formatDistance(14230), '14.2 km');
        assert.equal(core.formatDistance(142300), '142 km');
    });

    it('formats times and days in the game time zone', () => {
        const start = Date.parse('2026-10-03T20:30:00.000Z');
        assert.equal(core.formatTime(start, SYDNEY).replace(/\s/g, ' '), '7:30 AM');
        assert.equal(core.formatDay(start, SYDNEY), 'Sun 4 Oct');
        assert.deepEqual(core.dateChip(start, SYDNEY), { weekday: 'SUN', day: '4', month: 'OCT' });
        assert.equal(core.dayLabel(start, SYDNEY, Date.parse('2026-10-03T09:00:00Z')), 'Tomorrow');
        assert.equal(core.dayLabel(start, SYDNEY, Date.parse('2026-10-03T14:00:00Z')), 'Today');
        assert.equal(core.dayLabel(start, SYDNEY, Date.parse('2026-10-01T09:00:00Z')), 'Sun 4 Oct');
    });

    it('describes countdowns and freshness', () => {
        const now = Date.parse('2026-10-01T00:00:00Z');
        assert.equal(core.countdown(now + 25 * MINUTE, now), 'in 25 min');
        assert.equal(core.countdown(now + 3 * HOUR, now), 'in 3 h');
        assert.equal(core.countdown(now + 26 * HOUR, now), 'in 1 day');
        assert.equal(core.countdown(now + 50 * HOUR, now), 'in 2 days');
        assert.equal(core.countdown(now - 1, now), 'started');
        assert.equal(core.relativeAgo(now - 10 * 1000, now), 'just now');
        assert.equal(core.relativeAgo(now - 5 * MINUTE, now), '5 min ago');
        assert.equal(core.relativeAgo(now - 3 * HOUR, now), '3 h ago');
    });
});

describe('time-zone conversion', () => {
    it('converts form input in the game time zone across daylight-saving changes', () => {
        assert.equal(core.localInputToIso('2026-10-04', '07:30', SYDNEY), '2026-10-03T20:30:00.000Z');
        assert.equal(core.localInputToIso('2026-10-03', '19:00', SYDNEY), '2026-10-03T09:00:00.000Z');
        assert.equal(core.localInputToIso('2026-03-08', '09:00', 'America/New_York'), '2026-03-08T13:00:00.000Z');
        assert.equal(core.localInputToIso('2026-3-8', '9:00', SYDNEY), null);
        assert.deepEqual(core.isoToLocalInput('2026-10-03T20:30:00.000Z', SYDNEY), { date: '2026-10-04', time: '07:30' });
        assert.equal(typeof core.deviceTimeZone(), 'string');
    });
});

describe('routes, names, and toss helpers', () => {
    it('parses app deep links', () => {
        assert.deepEqual(core.parseRoute('bccb://game-day/abc-123'), { page: 'gameday', gameDayId: 'abc-123', action: null });
        assert.deepEqual(core.parseRoute('bccb://game-day/abc-123/alarm'), { page: 'gameday', gameDayId: 'abc-123', action: 'alarm' });
        assert.deepEqual(core.parseRoute('bccb://game-day'), { page: 'gameday', gameDayId: null, action: null });
        assert.deepEqual(core.parseRoute('bccb://page/teams'), { page: 'teams', gameDayId: null, action: null });
        assert.equal(core.parseRoute('https://example.com'), null);
        assert.equal(core.parseRoute(null), null);
    });

    it('builds initials and stable team signatures', () => {
        assert.equal(core.initials('Anuj Loomba'), 'AL');
        assert.equal(core.initials('Raj'), 'RA');
        assert.equal(core.initials('  '), '?');
        const signature = core.teamSignature([
            { players: [{ id: 'p2' }, { id: 'p1' }] },
            { players: [{ name: 'Zed' }, { id: 'p3' }] }
        ]);
        assert.match(signature, /^t2:2x2:[0-9a-z]+$/);
        assert.equal(signature, core.teamSignature([
            { players: [{ id: 'p1' }, { id: 'p2' }] },
            { players: [{ id: 'p3' }, { name: 'Zed' }] }
        ]));
        assert.notEqual(signature, core.teamSignature([
            { players: [{ name: 'Zed' }, { id: 'p3' }] },
            { players: [{ id: 'p2' }, { id: 'p1' }] }
        ]));
        assert.notEqual(signature, core.teamSignature([
            { players: [{ id: 'p1' }, { id: 'p3' }] },
            { players: [{ id: 'p2' }, { name: 'Zed' }] }
        ]));
    });

    it('keeps team signatures short enough to share for full-size teams', () => {
        const team = offset => ({
            players: Array.from({ length: 40 }, (_, index) => ({ id: `player_${1759000000000 + offset + index}_abcdefghi` }))
        });
        const signature = core.teamSignature([team(0), team(100)]);
        assert.ok(signature.length <= 40, signature);
        assert.notEqual(signature, core.teamSignature([team(0), team(101)]));
    });

    it('flips a fair coin from the random source', () => {
        assert.equal(core.flipCoin({ getRandomValues: buffer => { buffer[0] = 6; return buffer; } }), 0);
        assert.equal(core.flipCoin({ getRandomValues: buffer => { buffer[0] = 7; return buffer; } }), 1);
        const results = new Set(Array.from({ length: 64 }, () => core.flipCoin()));
        assert.deepEqual([...results].sort(), [0, 1]);
    });

    it('summarises a toss decision', () => {
        const teams = [{ name: "Anuj's XI" }, { name: "Raj's XI" }];
        assert.equal(
            core.tossSummary({ teams, winnerIndex: 1, decision: 'bat' }),
            "Raj's XI won the toss and chose to bat first. Anuj's XI will bowl."
        );
        assert.equal(
            core.tossSummary({ teams, winnerIndex: 0, decision: 'bowl' }),
            "Anuj's XI won the toss and chose to bowl first. Raj's XI will bat."
        );
        assert.equal(core.tossSummary(null), '');
    });

    it('measures distances between coordinates', () => {
        const distance = core.haversineMeters({ lat: -33.8915, lng: 151.2247 }, { lat: -33.8568, lng: 151.2153 });
        assert.ok(distance > 3800 && distance < 4000, `unexpected distance ${distance}`);
    });

    it('shortens long geocoder addresses for venue cards', () => {
        assert.equal(
            core.shortAddress('Sydney Cricket Ground', 'Sydney Cricket Ground, Driver Avenue, Moore Park, Sydney, New South Wales, 2021, Australia'),
            'Driver Avenue, Moore Park, Sydney'
        );
        assert.equal(core.shortAddress('Oval', '12 Park Road, Epping, 2121'), '12 Park Road, Epping');
        assert.equal(core.shortAddress('Oval', null), '');
    });
});
