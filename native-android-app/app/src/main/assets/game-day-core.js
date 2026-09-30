/*
 * Pure Game Day logic shared by the UI and unit tests (tests/web/game-day-core.test.mjs).
 * Keep this file free of DOM and network access.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.GameDayCore = api;
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const MINUTE_MS = 60 * 1000;
    const HOUR_MS = 60 * MINUTE_MS;
    const DAY_MS = 24 * HOUR_MS;
    const DEFAULT_PREP_MINUTES = 45;
    const MIN_PREP_MINUTES = 0;
    const MAX_PREP_MINUTES = 120;
    const PREP_STEP_MINUTES = 5;
    const ALARM_WINDOW_BEFORE_REACH_MS = 36 * HOUR_MS;
    // These windows mirror the Worker (cricket-worker/cricket-api/src/gameDay.ts).
    const TRIP_OPENS_BEFORE_REACH_MS = 4 * HOUR_MS;
    const TRIP_CLOSES_AFTER_START_MS = 2 * HOUR_MS;
    const TRIP_STOP_AFTER_START_MS = HOUR_MS;
    const ARRIVAL_RADIUS_METERS = 150;
    const EARTH_RADIUS_METERS = 6371008.8;

    const formatterCache = new Map();

    function toMs(value) {
        if (typeof value === 'number') return value;
        if (value instanceof Date) return value.getTime();
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    function floorToMinute(ms) {
        return Math.floor(ms / MINUTE_MS) * MINUTE_MS;
    }

    function clampPrepMinutes(value) {
        const minutes = Math.round(Number(value) / PREP_STEP_MINUTES) * PREP_STEP_MINUTES;
        if (!Number.isFinite(minutes)) return DEFAULT_PREP_MINUTES;
        return Math.min(MAX_PREP_MINUTES, Math.max(MIN_PREP_MINUTES, minutes));
    }

    /**
     * Recommended wake-up alarm: reach-by time − travel time − getting-ready buffer.
     * status is 'scheduled', 'get-ready-now' (alarm time has passed), or 'leave-now' (leave time has passed).
     */
    function recommendAlarm(options) {
        const reachByMs = toMs(options.reachBy);
        if (!Number.isFinite(reachByMs)) throw new Error('A reach-by time is required.');
        const travelSeconds = Math.max(0, Math.round(Number(options.travelSeconds) || 0));
        const prepMinutes = clampPrepMinutes(options.prepMinutes === undefined ? DEFAULT_PREP_MINUTES : options.prepMinutes);
        const nowMs = toMs(options.now === undefined ? Date.now() : options.now);
        const leaveAtMs = floorToMinute(reachByMs - travelSeconds * 1000);
        const alarmAtMs = leaveAtMs - prepMinutes * MINUTE_MS;
        let status = 'scheduled';
        if (leaveAtMs <= nowMs) status = 'leave-now';
        else if (alarmAtMs <= nowMs) status = 'get-ready-now';
        return { reachByMs, leaveAtMs, alarmAtMs, travelSeconds, prepMinutes, status };
    }

    function isAlarmWindowOpen(game, now) {
        if (!game || game.status !== 'scheduled') return false;
        const reachByMs = toMs(game.reachBy);
        const nowMs = toMs(now === undefined ? Date.now() : now);
        return nowMs >= reachByMs - ALARM_WINDOW_BEFORE_REACH_MS && nowMs < reachByMs;
    }

    function tripWindow(game) {
        const startsAtMs = toMs(game.startsAt);
        const reachByMs = toMs(game.reachBy);
        return {
            opensAtMs: reachByMs - TRIP_OPENS_BEFORE_REACH_MS,
            closesAtMs: startsAtMs + TRIP_CLOSES_AFTER_START_MS,
            stopAfterMs: startsAtMs + TRIP_STOP_AFTER_START_MS
        };
    }

    function isTripWindowOpen(game, now) {
        if (!game || game.status !== 'scheduled') return false;
        const window = tripWindow(game);
        const nowMs = toMs(now === undefined ? Date.now() : now);
        return nowMs >= window.opensAtMs && nowMs <= window.closesAtMs;
    }

    /** Trips can start until they would stop on their own, an hour after the start time. */
    function canStartTrip(game, now) {
        if (!isTripWindowOpen(game, now)) return false;
        const nowMs = toMs(now === undefined ? Date.now() : now);
        return nowMs < tripWindow(game).stopAfterMs;
    }

    function tally(game) {
        const counts = (game && game.counts) || {};
        const values = {
            yes: counts.yes || 0,
            maybe: counts.maybe || 0,
            no: counts.no || 0,
            pending: counts.pending || 0
        };
        const total = values.yes + values.maybe + values.no + values.pending;
        const segments = ['yes', 'maybe', 'no', 'pending'].map(key => ({
            key,
            count: values[key],
            percent: total > 0 ? Math.round((values[key] / total) * 1000) / 10 : 0
        }));
        return { ...values, total, segments };
    }

    function haversineMeters(from, to) {
        const toRadians = degrees => degrees * Math.PI / 180;
        const deltaLat = toRadians(to.lat - from.lat);
        const deltaLng = toRadians(to.lng - from.lng);
        const a = Math.sin(deltaLat / 2) ** 2
            + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    function formatDuration(seconds) {
        const totalMinutes = Math.round(Math.max(0, Number(seconds) || 0) / 60);
        if (totalMinutes < 1) return 'under a minute';
        if (totalMinutes < 60) return `${totalMinutes} min`;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
    }

    function formatDistance(meters) {
        const value = Math.max(0, Number(meters) || 0);
        if (value < 1000) return `${Math.round(value / 10) * 10} m`;
        const kilometres = value / 1000;
        return kilometres < 100 ? `${kilometres.toFixed(1)} km` : `${Math.round(kilometres)} km`;
    }

    function formatter(locale, options) {
        const key = `${locale}|${JSON.stringify(options)}`;
        if (!formatterCache.has(key)) formatterCache.set(key, new Intl.DateTimeFormat(locale, options));
        return formatterCache.get(key);
    }

    function formatTime(value, timeZone) {
        return formatter('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(toMs(value)));
    }

    function formatDay(value, timeZone) {
        return formatter('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(toMs(value)));
    }

    function zonedParts(value, timeZone) {
        const parts = {};
        formatter('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'short'
        }).formatToParts(new Date(toMs(value))).forEach(part => {
            parts[part.type] = part.value;
        });
        return {
            year: Number(parts.year),
            month: Number(parts.month),
            day: Number(parts.day),
            hour: Number(parts.hour) % 24,
            minute: Number(parts.minute),
            second: Number(parts.second),
            weekday: parts.weekday
        };
    }

    function timeZoneOffsetMs(instantMs, timeZone) {
        const wholeSecondMs = instantMs - (((instantMs % 1000) + 1000) % 1000);
        const parts = zonedParts(wholeSecondMs, timeZone);
        return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - wholeSecondMs;
    }

    /** Converts a wall-clock time in an IANA time zone to the matching UTC instant (ms). */
    function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
        const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
        const firstOffset = timeZoneOffsetMs(wallClockAsUtc, timeZone);
        const firstGuess = wallClockAsUtc - firstOffset;
        const secondOffset = timeZoneOffsetMs(firstGuess, timeZone);
        return secondOffset === firstOffset ? firstGuess : wallClockAsUtc - secondOffset;
    }

    function dayNumber(value, timeZone) {
        const parts = zonedParts(value, timeZone);
        return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS);
    }

    function dayLabel(value, timeZone, now) {
        const difference = dayNumber(value, timeZone) - dayNumber(now === undefined ? Date.now() : now, timeZone);
        if (difference === 0) return 'Today';
        if (difference === 1) return 'Tomorrow';
        if (difference === -1) return 'Yesterday';
        return formatDay(value, timeZone);
    }

    function dateChip(value, timeZone) {
        const parts = zonedParts(value, timeZone);
        const month = formatter('en-GB', { timeZone, month: 'short' }).format(new Date(toMs(value)));
        return { weekday: String(parts.weekday).toUpperCase(), day: String(parts.day), month: month.toUpperCase() };
    }

    function countdown(value, now) {
        const difference = toMs(value) - toMs(now === undefined ? Date.now() : now);
        if (difference <= 0) return 'started';
        if (difference < MINUTE_MS) return 'now';
        if (difference < HOUR_MS) return `in ${Math.round(difference / MINUTE_MS)} min`;
        if (difference < DAY_MS) return `in ${Math.round(difference / HOUR_MS)} h`;
        const days = Math.round(difference / DAY_MS);
        return days === 1 ? 'in 1 day' : `in ${days} days`;
    }

    function relativeAgo(value, now) {
        const difference = toMs(now === undefined ? Date.now() : now) - toMs(value);
        if (!Number.isFinite(difference) || difference < 45 * 1000) return 'just now';
        if (difference < HOUR_MS) return `${Math.round(difference / MINUTE_MS)} min ago`;
        if (difference < DAY_MS) return `${Math.round(difference / HOUR_MS)} h ago`;
        return `${Math.round(difference / DAY_MS)} d ago`;
    }

    function deviceTimeZone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch (error) {
            return 'UTC';
        }
    }

    /** Converts `YYYY-MM-DD` + `HH:MM` entered in `timeZone` into an ISO UTC string. */
    function localInputToIso(dateValue, timeValue, timeZone) {
        const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue || '');
        const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue || '');
        if (!dateMatch || !timeMatch) return null;
        const ms = zonedTimeToUtc(
            Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3]),
            Number(timeMatch[1]), Number(timeMatch[2]), timeZone
        );
        return new Date(ms).toISOString();
    }

    function isoToLocalInput(value, timeZone) {
        const parts = zonedParts(value, timeZone);
        const pad = number => String(number).padStart(2, '0');
        return {
            date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
            time: `${pad(parts.hour)}:${pad(parts.minute)}`
        };
    }

    function parseRoute(route) {
        if (typeof route !== 'string') return null;
        const match = /^bccb:\/\/([a-z-]+)(?:\/([^/?#]+))?(?:\/([a-z-]+))?/i.exec(route.trim());
        if (!match) return null;
        const host = match[1].toLowerCase();
        if (host === 'game-day') {
            return {
                page: 'gameday',
                gameDayId: match[2] ? decodeURIComponent(match[2]) : null,
                action: match[3] ? match[3].toLowerCase() : null
            };
        }
        if (host === 'page' && match[2]) return { page: decodeURIComponent(match[2]), gameDayId: null, action: null };
        return null;
    }

    function initials(name) {
        const words = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return '?';
        const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0];
        return letters.toUpperCase();
    }

    /** A 53-bit string hash (cyrb53), used to keep team signatures short. */
    function hash53(text) {
        let h1 = 0xdeadbeef;
        let h2 = 0x41c6ce57;
        for (let index = 0; index < text.length; index++) {
            const code = text.charCodeAt(index);
            h1 = Math.imul(h1 ^ code, 2654435761);
            h2 = Math.imul(h2 ^ code, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    }

    /** Identifies a pair of teams by their players, whatever their order within each team. */
    function teamSignature(teams) {
        const lineups = (teams || []).map(team => (team.players || [])
            .map(player => String(player.id !== undefined && player.id !== null ? player.id : player.name))
            .sort());
        const sizes = lineups.map(lineup => lineup.length).join('x');
        return `t${lineups.length}:${sizes}:${hash53(lineups.map(lineup => lineup.join(',')).join('|')).toString(36)}`;
    }

    /** A fair coin: 0 or 1 from the platform's cryptographic random source. */
    function flipCoin(randomSource) {
        const source = randomSource || (typeof crypto !== 'undefined' ? crypto : null);
        if (!source || typeof source.getRandomValues !== 'function') {
            return Math.random() < 0.5 ? 0 : 1;
        }
        const buffer = new Uint8Array(1);
        source.getRandomValues(buffer);
        return buffer[0] & 1;
    }

    function tossSummary(toss) {
        if (!toss || !Array.isArray(toss.teams) || toss.teams.length !== 2) return '';
        const winner = toss.teams[toss.winnerIndex];
        const loser = toss.teams[toss.winnerIndex === 0 ? 1 : 0];
        if (!winner || !loser) return '';
        return toss.decision === 'bat'
            ? `${winner.name} won the toss and chose to bat first. ${loser.name} will bowl.`
            : `${winner.name} won the toss and chose to bowl first. ${loser.name} will bat.`;
    }

    /** A compact street, suburb, and city line, without the venue name or country details. */
    function shortAddress(name, address) {
        if (!address) return '';
        const venueName = String(name || '').trim().toLowerCase();
        const parts = String(address).split(',').map(part => part.trim()).filter(Boolean);
        if (parts.length > 0 && parts[0].toLowerCase() === venueName) parts.shift();
        return parts.filter(part => !/^\d{3,6}$/.test(part)).slice(0, 3).join(', ');
    }

    return {
        constants: {
            DEFAULT_PREP_MINUTES,
            MIN_PREP_MINUTES,
            MAX_PREP_MINUTES,
            PREP_STEP_MINUTES,
            ALARM_WINDOW_BEFORE_REACH_MS,
            TRIP_OPENS_BEFORE_REACH_MS,
            TRIP_CLOSES_AFTER_START_MS,
            TRIP_STOP_AFTER_START_MS,
            ARRIVAL_RADIUS_METERS
        },
        toMs,
        clampPrepMinutes,
        recommendAlarm,
        isAlarmWindowOpen,
        tripWindow,
        isTripWindowOpen,
        canStartTrip,
        tally,
        haversineMeters,
        formatDuration,
        formatDistance,
        formatTime,
        formatDay,
        dayLabel,
        dateChip,
        countdown,
        relativeAgo,
        zonedTimeToUtc,
        deviceTimeZone,
        localInputToIso,
        isoToLocalInput,
        parseRoute,
        initials,
        teamSignature,
        flipCoin,
        tossSummary,
        shortAddress
    };
});
