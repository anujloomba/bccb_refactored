/*
 * Game Day: scheduling, In / Maybe / Out replies, game-day alarms, and live trip sharing.
 * Pure logic lives in game-day-core.js; native capabilities come from native-bridge.js.
 */
(function () {
    'use strict';

    const Core = window.GameDayCore;
    const Native = window.BCCBNative;
    if (!Core || !Native) {
        console.error('Game Day could not start because its core modules are missing.');
        return;
    }

    const STORAGE = {
        deviceId: 'bccb-device-id',
        device: groupId => `bccb-gameday-device-${groupId}`,
        left: groupId => `bccb-gameday-left-${groupId}`,
        cache: groupId => `bccb-gameday-cache-${groupId}`,
        alarms: 'bccb-gameday-alarms',
        prep: 'bccb-gameday-prep-minutes',
        home: 'bccb-gameday-home',
        tripConsent: 'bccb-gameday-trip-consent',
        template: 'bccb-gameday-template'
    };
    // OpenFreeMap: OpenStreetMap vector tiles, no API key or registration, commercial use allowed.
    const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
    const MAP_THEME = {
        background: ['background-color', '#1a1438'],
        water: ['fill-color', '#2c2468'],
        waterway: ['line-color', '#2c2468'],
        landuse_residential: ['fill-color', '#201a45'],
        landcover_wood: ['fill-color', '#1d3440'],
        landuse_park: ['fill-color', '#1f3a3a'],
        building: ['fill-color', '#2a2356'],
        highway_path: ['line-color', '#3a3180'],
        highway_minor: ['line-color', '#3b3278'],
        highway_major_casing: ['line-color', 'rgba(150, 135, 235, 0.45)'],
        highway_major_inner: ['line-color', '#4c4196'],
        highway_major_subtle: ['line-color', '#40378a'],
        highway_motorway_casing: ['line-color', 'rgba(170, 150, 255, 0.5)'],
        highway_motorway_inner: ['line-color', '#6352c9'],
        highway_motorway_subtle: ['line-color', '#4c4196'],
        highway_name_other: ['text-color', '#a79fe0'],
        highway_name_motorway: ['text-color', '#b8b0f0'],
        water_name: ['text-color', 'rgba(190, 180, 255, 0.75)'],
        boundary_state: ['line-color', '#4d4490'],
        'boundary_country_z0-4': ['line-color', '#4d4490'],
        'boundary_country_z5-': ['line-color', '#4d4490'],
        place_other: ['text-color', '#c4bdf0'],
        place_suburb: ['text-color', '#c4bdf0'],
        place_village: ['text-color', '#c4bdf0'],
        place_town: ['text-color', '#d6d0ff'],
        place_city: ['text-color', '#e2ddff'],
        place_city_large: ['text-color', '#e2ddff']
    };
    const DEFAULT_API_BASE = 'https://cricket-api.cricketmgr.workers.dev';
    const LIST_REFRESH_MS = 60 * 1000;
    const TRIP_REFRESH_MS = 10 * 1000;
    const HOUR_MS = 60 * 60 * 1000;
    const RESPONSE_LABELS = { yes: "✅ You're in!", maybe: '🤔 Marked as maybe', no: '❌ Marked as out' };

    const state = {
        groupId: null,
        status: 'idle',
        error: null,
        offlineSince: null,
        device: null,
        capabilities: { platform: Native.platform, push: false, alarms: 'none', backgroundLocation: false, sharedFiles: false },
        pushPermission: 'prompt',
        gameDays: [],
        players: [],
        latestToss: null,
        selectedGameId: null,
        trips: new Map(),
        tripStatus: { active: false },
        claimFilter: '',
        pageVisible: false,
        lastLoadedAt: 0,
        pendingRoute: null
    };

    const maps = {
        hero: null,
        trip: null,
        tripGameId: null,
        tripMarkers: new Map(),
        tripUserMoved: false,
        picker: null,
        pickerMarker: null
    };
    const renderedHtml = new WeakMap();
    let webglSupport = null;
    let sheet = null;
    let listTimer = null;
    let tripTimer = null;
    let initialLoad = null;
    let refreshInFlight = null;

    function app() {
        return window.cricketApp || null;
    }

    function auth() {
        const cricketApp = app();
        return cricketApp ? cricketApp.authManager : null;
    }

    function currentGroup() {
        return auth() ? auth().currentGroup : null;
    }

    function isGuestGroup(group) {
        const target = group === undefined ? currentGroup() : group;
        return !target || target.name === 'guest';
    }

    function isAdmin() {
        return Boolean(auth() && auth().isAdmin());
    }

    function apiBase() {
        const cricketApp = app();
        return (cricketApp && cricketApp.d1Manager && cricketApp.d1Manager.workerEndpoint) || DEFAULT_API_BASE;
    }

    function toast(message) {
        if (app()) app().showNotification(message);
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[character]));
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn('Could not save Game Day state.', error);
        }
    }

    function findGame(gameId) {
        return state.gameDays.find(game => game.id === gameId) || null;
    }

    function nextGame() {
        return state.gameDays.find(game => game.status === 'scheduled') || state.gameDays[0] || null;
    }

    function selectedGame() {
        return findGame(state.selectedGameId) || nextGame();
    }

    function playerName(playerId) {
        const player = state.players.find(entry => entry.id === playerId);
        return player ? player.name : 'A player';
    }

    function myPlayerId() {
        return state.device ? state.device.playerId || null : null;
    }

    function formatTime(value, game) {
        return Core.formatTime(value, game ? game.timezone : Core.deviceTimeZone());
    }

    function apiError(status, payload) {
        return Object.assign(new Error((payload && payload.error) || `Request failed (HTTP ${status}).`), { status });
    }

    function hasLeftGameDay(groupId) {
        return localStorage.getItem(STORAGE.left(groupId)) === 'true';
    }

    function installDeviceId() {
        let deviceId = localStorage.getItem(STORAGE.deviceId);
        if (!deviceId || !/^[A-Za-z0-9-]{8,64}$/.test(deviceId)) {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                deviceId = window.crypto.randomUUID();
            } else {
                const bytes = new Uint8Array(16);
                window.crypto.getRandomValues(bytes);
                deviceId = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
                    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
            }
            localStorage.setItem(STORAGE.deviceId, deviceId);
        }
        return deviceId;
    }

    function memberPasswordHash(group) {
        const local = auth().getLocalGroups().find(entry => entry.name === group.name);
        return local && local.passwordHash ? local.passwordHash : null;
    }

    function rememberMemberPasswordHash(group, passwordHash) {
        const groups = auth().getLocalGroups();
        const index = groups.findIndex(entry => entry.name === group.name);
        if (index >= 0) {
            groups[index].passwordHash = passwordHash;
            groups[index].hasPassword = Boolean(passwordHash);
        } else {
            groups.push({
                id: group.id,
                name: group.name,
                hasPassword: Boolean(passwordHash),
                passwordHash,
                createdAt: new Date().toISOString()
            });
        }
        localStorage.setItem('cricket-groups', JSON.stringify(groups));
    }

    async function registerDevice(options) {
        const group = currentGroup();
        const settings = options || {};
        const stored = readJson(STORAGE.device(group.id), null);
        const headers = { 'Content-Type': 'application/json' };
        if (stored && stored.token) headers.Authorization = `Bearer ${stored.token}`;
        const response = await fetch(`${apiBase()}/groups/${group.id}/devices`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                device_id: installDeviceId(),
                group_name: group.name,
                group_password_hash: settings.memberPasswordHash !== undefined
                    ? settings.memberPasswordHash
                    : memberPasswordHash(group),
                admin_password_hash: auth().getAdminPasswordHash(),
                platform: Native.platform,
                app_version: state.capabilities.appVersion || null,
                push_token: (stored && stored.pushToken) || null
            })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw apiError(response.status, payload);

        const record = {
            groupId: group.id,
            deviceId: payload.device.deviceId,
            token: payload.device.token,
            playerId: payload.device.playerId,
            pushToken: payload.device.hasPush && stored ? stored.pushToken : null,
            hasMemberPassword: payload.group.hasMemberPassword,
            registeredAt: Date.now()
        };
        writeJson(STORAGE.device(group.id), record);
        localStorage.removeItem(STORAGE.left(group.id));
        state.device = record;
        return record;
    }

    async function ensureDevice() {
        const group = currentGroup();
        if (isGuestGroup(group)) {
            state.device = null;
            return null;
        }
        if (state.device && state.device.groupId === group.id && state.device.token) return state.device;
        const stored = readJson(STORAGE.device(group.id), null);
        if (stored && stored.token) {
            state.device = stored;
            return stored;
        }
        if (hasLeftGameDay(group.id)) return null;
        return registerDevice();
    }

    function saveDevice() {
        if (state.device) writeJson(STORAGE.device(state.device.groupId), state.device);
    }

    async function api(path, options) {
        const settings = options || {};
        const device = await ensureDevice();
        if (!device) throw Object.assign(new Error('Join Game Day on this device first.'), { status: 0 });
        const headers = { Authorization: `Bearer ${device.token}` };
        if (settings.body !== undefined) headers['Content-Type'] = 'application/json';
        if (settings.admin) headers['X-Admin-Password-Hash'] = auth().getAdminPasswordHash() || '';
        const response = await fetch(`${apiBase()}/groups/${device.groupId}${path}`, {
            method: settings.method || 'GET',
            headers,
            body: settings.body === undefined ? undefined : JSON.stringify(settings.body)
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401 && settings.retry !== false) {
            localStorage.removeItem(STORAGE.device(device.groupId));
            state.device = null;
            await registerDevice();
            return api(path, Object.assign({}, settings, { retry: false }));
        }
        if (!response.ok) throw apiError(response.status, payload);
        return payload;
    }

    async function syncNativeSession() {
        if (!Native.isNative || !state.device) return;
        try {
            await Native.setSession({
                apiBase: apiBase(),
                groupId: state.device.groupId,
                groupName: currentGroup() ? currentGroup().name : '',
                deviceId: state.device.deviceId,
                deviceToken: state.device.token,
                playerId: state.device.playerId || null
            });
        } catch (error) {
            console.warn('Could not share the Game Day session with the app.', error);
        }
    }

    async function uploadPushToken(token) {
        if (!token || !state.device || state.device.pushToken === token) return;
        try {
            await api('/devices/me', { method: 'PUT', body: { push_token: token, platform: Native.platform } });
            state.device.pushToken = token;
            saveDevice();
        } catch (error) {
            console.warn('Could not register this device for Game Day notifications.', error);
        }
    }

    async function syncPushToken(requestPermission) {
        if (!Native.isNative || !state.capabilities.push || !state.device) return;
        try {
            const result = requestPermission ? await Native.requestPushPermission() : await Native.getPushToken();
            state.pushPermission = result.permission || 'prompt';
            if (result.token) await uploadPushToken(result.token);
        } catch (error) {
            console.warn('Push notifications are unavailable.', error);
        }
        render();
    }

    function applyGameDayData(data) {
        state.gameDays = Array.isArray(data.gameDays) ? data.gameDays : [];
        state.players = Array.isArray(data.players) ? data.players : [];
        state.latestToss = data.latestToss || null;
        if (!findGame(state.selectedGameId)) {
            const upcoming = nextGame();
            state.selectedGameId = upcoming ? upcoming.id : null;
        }
    }

    function loadCachedGameDays(groupId) {
        const cached = readJson(STORAGE.cache(groupId), null);
        if (cached && Array.isArray(cached.gameDays)) {
            applyGameDayData(cached);
            state.offlineSince = cached.savedAt || null;
            return true;
        }
        return false;
    }

    function replaceGame(gameDay) {
        if (!gameDay) return;
        const index = state.gameDays.findIndex(game => game.id === gameDay.id);
        if (index >= 0) {
            state.gameDays[index] = gameDay;
        } else {
            state.gameDays.push(gameDay);
            state.gameDays.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
        }
    }

    async function refresh(options) {
        if (refreshInFlight) return refreshInFlight;
        refreshInFlight = doRefresh(options || {}).finally(() => {
            refreshInFlight = null;
        });
        return refreshInFlight;
    }

    async function doRefresh(options) {
        const group = currentGroup();
        if (!group) return;
        if (state.groupId !== group.id) {
            state.groupId = group.id;
            state.gameDays = [];
            state.players = [];
            state.device = null;
            state.trips.clear();
        }
        if (isGuestGroup(group)) {
            state.status = 'guest';
            render();
            return;
        }
        if (hasLeftGameDay(group.id) && !readJson(STORAGE.device(group.id), null)) {
            state.status = 'left';
            render();
            return;
        }
        if (!options.silent && state.gameDays.length === 0) {
            state.status = loadCachedGameDays(group.id) ? 'ready' : 'loading';
            render();
        }

        try {
            await ensureDevice();
            const data = await api('/game-days');
            applyGameDayData(data);
            state.device.playerId = data.me ? data.me.playerId : state.device.playerId;
            saveDevice();
            writeJson(STORAGE.cache(group.id), {
                gameDays: state.gameDays,
                players: state.players,
                latestToss: state.latestToss,
                savedAt: Date.now()
            });
            state.status = 'ready';
            state.error = null;
            state.offlineSince = null;
            state.lastLoadedAt = Date.now();
            await reconcileAlarms();
            await syncNativeSession();
            if (state.pageVisible) await refreshTrips();
        } catch (error) {
            if (error.status === 401) {
                state.status = 'needs-password';
                state.error = error.message;
            } else if (state.gameDays.length > 0) {
                state.status = 'ready';
                state.error = error.message;
                if (!state.offlineSince) state.offlineSince = state.lastLoadedAt || Date.now();
            } else {
                state.status = 'error';
                state.error = error.status === 404
                    ? 'This group is not in the cloud database yet. Sync your group from Settings first.'
                    : error.message;
            }
        }
        render();
        if (state.status === 'ready' && state.pendingRoute) {
            const route = state.pendingRoute;
            state.pendingRoute = null;
            handleRoute(route);
        }
    }

    function alarmPlans() {
        return readJson(STORAGE.alarms, {});
    }

    function saveAlarmPlans(plans) {
        writeJson(STORAGE.alarms, plans);
    }

    function alarmId(gameId) {
        return `game-${gameId}`;
    }

    async function removeAlarm(gameId, options) {
        const settings = options || {};
        const plans = alarmPlans();
        const plan = plans[gameId];
        if (!plan) return false;
        let clockAlarmRemains = plan.mode === 'clock';
        try {
            const result = await Native.cancelGameAlarm({ id: plan.alarmId || alarmId(gameId) });
            clockAlarmRemains = Boolean(result && result.clockAlarmRemains) || clockAlarmRemains;
        } catch (error) {
            console.warn('Could not cancel the game-day alarm.', error);
        }
        delete plans[gameId];
        saveAlarmPlans(plans);
        if (settings.message) toast(settings.message);
        if (clockAlarmRemains && !settings.expired) {
            setTimeout(() => toast('⏰ Also switch off the game alarm in your Clock app.'), settings.message ? 2300 : 0);
        }
        return true;
    }

    async function reconcileAlarms() {
        const plans = alarmPlans();
        const group = currentGroup();
        let nativeAlarms = null;
        if (Native.isNative) {
            try {
                nativeAlarms = (await Native.getScheduledAlarms()).alarms || [];
            } catch (error) {
                nativeAlarms = null;
            }
        }

        let changed = false;
        for (const gameId of Object.keys(plans)) {
            const plan = plans[gameId];
            if (!group || plan.groupId !== group.id) continue;
            const game = findGame(gameId);
            const expired = plan.alarmAt < Date.now() - 6 * HOUR_MS;
            let message = null;
            if (game && game.status === 'cancelled') {
                message = `❌ ${game.title} was cancelled, so its alarm was removed.`;
            } else if (game && game.myResponse !== 'yes') {
                message = '⏰ Alarm removed because you are no longer marked as in.';
            }
            if (message || expired || (!game && Date.now() > plan.reachBy)) {
                await removeAlarm(gameId, { message, expired: expired || Date.now() > plan.alarmAt });
                delete plans[gameId];
                changed = true;
                continue;
            }
            const missing = Boolean(
                nativeAlarms
                && plan.mode !== 'clock'
                && plan.alarmAt > Date.now()
                && !nativeAlarms.some(alarm => alarm.id === plan.alarmId)
            );
            const stale = Boolean(game && plan.gameUpdatedAt !== game.updatedAt
                && (Date.parse(game.reachBy) !== plan.reachBy || game.venue.lat !== plan.venueLat || game.venue.lng !== plan.venueLng));
            if (missing !== Boolean(plan.missing) || stale !== Boolean(plan.stale)) {
                plan.missing = missing;
                plan.stale = stale;
                changed = true;
            }
        }
        if (changed) saveAlarmPlans(Object.assign(alarmPlans(), plans));
    }

    function applyOptimisticReply(game, response) {
        const playerId = myPlayerId();
        ['yes', 'maybe', 'no'].forEach(key => {
            game.rsvps[key] = game.rsvps[key].filter(id => id !== playerId);
        });
        game.rsvps[response].push(playerId);
        const responded = game.rsvps.yes.length + game.rsvps.maybe.length + game.rsvps.no.length;
        game.counts = {
            yes: game.rsvps.yes.length,
            maybe: game.rsvps.maybe.length,
            no: game.rsvps.no.length,
            pending: Math.max(0, state.players.length - responded)
        };
        game.myResponse = response;
    }

    async function submitReply(gameId, response) {
        const game = findGame(gameId);
        if (!game) return;
        if (!myPlayerId()) {
            toast('👋 Pick your name first so the group knows who is replying.');
            showClaim();
            return;
        }
        if (game.status !== 'scheduled') {
            toast('This game has been cancelled.');
            return;
        }
        if (game.myResponse === response) return;

        const snapshot = JSON.parse(JSON.stringify(game));
        applyOptimisticReply(game, response);
        render();
        try {
            const result = await api(`/game-days/${gameId}/rsvp`, { method: 'PUT', body: { response } });
            replaceGame(result.gameDay);
            toast(RESPONSE_LABELS[response]);
            if (response !== 'yes') {
                await removeAlarm(gameId, { message: alarmPlans()[gameId] ? '⏰ Your alarm for this game was removed.' : null });
            }
        } catch (error) {
            replaceGame(snapshot);
            toast(`Could not save your reply: ${error.message}`);
        }
        render();
    }

    async function claimPlayer(playerId) {
        try {
            const result = await api('/devices/me', { method: 'PUT', body: { player_id: playerId } });
            state.device.playerId = result.device.playerId;
            saveDevice();
            state.claimFilter = '';
            toast(`👋 Hi ${result.player ? result.player.name : 'there'}!`);
            if (result.otherDevicesForPlayer > 0) {
                toast('This name is also linked on another phone. Ask the admin to reset it if that is not you.');
            }
            await syncNativeSession();
            await refresh({ silent: true });
            syncPushToken(false);
        } catch (error) {
            toast(`Could not link your name: ${error.message}`);
        }
    }

    async function releaseClaim() {
        try {
            await api('/devices/me', { method: 'PUT', body: { player_id: null } });
            state.device.playerId = null;
            saveDevice();
            await syncNativeSession();
            render();
            showClaim();
        } catch (error) {
            toast(`Could not change player: ${error.message}`);
        }
    }

    async function refreshTrips() {
        const game = selectedGame();
        if (!game || !Core.isTripWindowOpen(game)) return;
        try {
            const data = await api(`/game-days/${game.id}/trips`);
            state.trips.set(game.id, Object.assign({ fetchedAt: Date.now() }, data));
            game.travellers = (data.trips || []).filter(trip => trip.status === 'travelling').length;
        } catch (error) {
            console.warn('Could not refresh live trips.', error);
        }
        renderTripSection();
        renderHomeCard();
    }

    async function refreshTripStatus() {
        if (!Native.isNative) return;
        try {
            state.tripStatus = await Native.getTripStatus();
        } catch (error) {
            state.tripStatus = { active: false };
        }
    }

    function setHtml(element, html) {
        if (!element || renderedHtml.get(element) === html) return false;
        renderedHtml.set(element, html);
        element.innerHTML = html;
        return true;
    }

    function pageSection(name) {
        const root = document.getElementById('gameDayRoot');
        if (!root) return null;
        if (!root.dataset.ready) {
            root.innerHTML = ['status', 'setup', 'admin', 'hero', 'alarm', 'trip', 'later']
                .map(section => `<div data-gd-section="${section}"></div>`)
                .join('');
            root.dataset.ready = 'true';
        }
        return root.querySelector(`[data-gd-section="${name}"]`);
    }

    function dateChipHtml(game) {
        const chip = Core.dateChip(game.startsAt, game.timezone);
        return `<div class="gd-date-chip" aria-hidden="true"><span>${escapeHtml(chip.weekday)}</span><strong>${escapeHtml(chip.day)}</strong><span>${escapeHtml(chip.month)}</span></div>`;
    }

    function statusPillHtml(game) {
        if (game.status === 'cancelled') return '<span class="gd-pill gd-pill-cancelled">Cancelled</span>';
        const label = Core.countdown(game.startsAt);
        return `<span class="gd-pill ${label === 'started' ? 'gd-pill-live' : 'gd-pill-countdown'}">${label === 'started' ? '🏏 On now' : escapeHtml(label)}</span>`;
    }

    function replyControlHtml(game, compact) {
        if (game.status !== 'scheduled') return '';
        if (Date.parse(game.startsAt) <= Date.now()) return '<p class="gd-subtle gd-small">Replies closed when the game started.</p>';
        if (!myPlayerId()) {
            return '<button type="button" class="gd-link gd-claim-link" data-gd-action="show-claim">👋 Pick your name to reply →</button>';
        }
        const options = [
            ['yes', '✅', "I'm in"],
            ['maybe', '🤔', 'Maybe'],
            ['no', '❌', 'Out']
        ];
        const buttons = options.map(([response, icon, label]) => `
            <button type="button" class="gd-reply-btn gd-reply-${response}${game.myResponse === response ? ' active' : ''}"
                data-gd-action="reply" data-response="${response}" data-game-id="${escapeHtml(game.id)}"
                aria-pressed="${game.myResponse === response}">
                <span aria-hidden="true">${icon}</span><span>${label}</span>
            </button>`).join('');
        return `
            <div class="gd-reply${compact ? ' gd-reply-compact' : ''}" role="group" aria-label="Your reply">${buttons}</div>
            ${compact ? '' : `<div class="gd-replying-as">Replying as <strong>${escapeHtml(playerName(myPlayerId()))}</strong> · <button type="button" class="gd-link" data-gd-action="change-claim">not you?</button></div>`}`;
    }

    function tallyHtml(game) {
        const tally = Core.tally(game);
        const segments = tally.segments.filter(segment => segment.count > 0)
            .map(segment => `<span class="gd-seg gd-seg-${segment.key}" style="width: ${segment.percent}%"></span>`)
            .join('');
        return `
            <div class="gd-tally" aria-label="${tally.yes} in, ${tally.maybe} maybe, ${tally.no} out, ${tally.pending} yet to reply">
                <div class="gd-tally-bar">${segments || '<span class="gd-seg gd-seg-empty" style="width: 100%"></span>'}</div>
                <div class="gd-legend">
                    <span class="gd-legend-item gd-legend-yes"><b>${tally.yes}</b> in</span>
                    <span class="gd-legend-item gd-legend-maybe"><b>${tally.maybe}</b> maybe</span>
                    <span class="gd-legend-item gd-legend-no"><b>${tally.no}</b> out</span>
                    <span class="gd-legend-item gd-legend-pending"><b>${tally.pending}</b> to reply</span>
                </div>
            </div>`;
    }

    function nameChipsHtml(playerIds, statusClass) {
        if (playerIds.length === 0) return '<span class="gd-subtle gd-small">Nobody yet</span>';
        return playerIds.map(playerId => `
            <span class="gd-name-chip ${statusClass}${playerId === myPlayerId() ? ' gd-me' : ''}">
                <span class="gd-avatar gd-avatar-sm">${escapeHtml(Core.initials(playerName(playerId)))}</span>${escapeHtml(playerName(playerId))}
            </span>`).join('');
    }

    function namesHtml(game) {
        const responded = new Set([...game.rsvps.yes, ...game.rsvps.maybe, ...game.rsvps.no]);
        const pending = state.players.map(player => player.id).filter(playerId => !responded.has(playerId));
        const groups = [
            ['✅ In', game.rsvps.yes, 'gd-status-yes'],
            ['🤔 Maybe', game.rsvps.maybe, 'gd-status-maybe'],
            ['❌ Out', game.rsvps.no, 'gd-status-no'],
            ['⏳ Yet to reply', pending, 'gd-status-pending']
        ];
        return `
            <details class="gd-names">
                <summary>See who's replied</summary>
                ${groups.map(([label, ids, statusClass]) => `
                    <div class="gd-names-group">
                        <div class="gd-names-label">${label} <span class="gd-subtle">${ids.length}</span></div>
                        <div class="gd-names-list">${nameChipsHtml(ids, statusClass)}</div>
                    </div>`).join('')}
            </details>`;
    }

    function tossLineHtml(toss) {
        const summary = Core.tossSummary(toss);
        return summary ? `<div class="gd-toss-line"><span class="gd-toss-coin" aria-hidden="true">🪙</span><span>${escapeHtml(summary)}</span></div>` : '';
    }

    function adminActionsHtml(game) {
        if (!isAdmin() || game.status !== 'scheduled') return '';
        const upcoming = Date.parse(game.startsAt) > Date.now();
        return `
            <div class="gd-admin-actions">
                <button type="button" class="gd-chip-btn" data-gd-action="open-edit" data-game-id="${escapeHtml(game.id)}">✏️ Edit</button>
                ${upcoming ? `<button type="button" class="gd-chip-btn" data-gd-action="nudge" data-game-id="${escapeHtml(game.id)}"${game.counts.pending === 0 ? ' disabled' : ''}>⏳ Nudge ${game.counts.pending}</button>` : ''}
                <button type="button" class="gd-chip-btn gd-chip-danger" data-gd-action="cancel-game" data-game-id="${escapeHtml(game.id)}">🗑️ Cancel game</button>
            </div>`;
    }

    function heroHtml(game) {
        const address = Core.shortAddress(game.venue.name, game.venue.address);
        return `
            <div class="glass-card gd-hero${game.status === 'cancelled' ? ' gd-cancelled' : ''}">
                <div class="gd-hero-top">
                    ${dateChipHtml(game)}
                    <div class="gd-hero-heading">
                        <div class="gd-title">${escapeHtml(game.title)}</div>
                        <div class="gd-subtle">${escapeHtml(Core.dayLabel(game.startsAt, game.timezone))} · ${escapeHtml(formatTime(game.startsAt, game))}</div>
                    </div>
                    ${statusPillHtml(game)}
                </div>
                <div class="gd-times">
                    <div class="gd-time-box"><span>🏏 Starts</span><strong>${escapeHtml(formatTime(game.startsAt, game))}</strong></div>
                    <div class="gd-time-box gd-time-reach"><span>🎯 Reach by</span><strong>${escapeHtml(formatTime(game.reachBy, game))}</strong></div>
                </div>
                <div class="gd-venue">
                    <div class="gd-venue-text">
                        <div class="gd-venue-name">📍 ${escapeHtml(game.venue.name)}</div>
                        ${address ? `<div class="gd-subtle gd-small">${escapeHtml(address)}</div>` : ''}
                    </div>
                    <button type="button" class="gd-chip-btn" data-gd-action="directions" data-game-id="${escapeHtml(game.id)}">🧭 Directions</button>
                </div>
                <div class="gd-mini-map" data-gd-map="hero" data-game-id="${escapeHtml(game.id)}" data-lat="${game.venue.lat}" data-lng="${game.venue.lng}"></div>
                ${game.notes ? `<div class="gd-notes">📝 ${escapeHtml(game.notes)}</div>` : ''}
                ${game.status === 'cancelled' ? '<p class="gd-warning">This game has been cancelled.</p>' : ''}
                ${replyControlHtml(game, false)}
                ${tallyHtml(game)}
                ${namesHtml(game)}
                ${tossLineHtml(game.toss)}
                ${adminActionsHtml(game)}
            </div>`;
    }

    function laterGamesHtml() {
        const selected = selectedGame();
        const others = state.gameDays.filter(game => !selected || game.id !== selected.id);
        if (others.length === 0) return '';
        return `
            <div class="gd-section-title">More games</div>
            ${others.map(game => `
                <button type="button" class="glass-card gd-later" data-gd-action="select-game" data-game-id="${escapeHtml(game.id)}">
                    ${dateChipHtml(game)}
                    <span class="gd-later-text">
                        <span class="gd-later-title">${escapeHtml(game.title)}</span>
                        <span class="gd-subtle gd-small">${escapeHtml(formatTime(game.startsAt, game))} · ${escapeHtml(game.venue.name)}</span>
                    </span>
                    <span class="gd-later-side">
                        ${game.status === 'cancelled' ? '<span class="gd-pill gd-pill-cancelled">Cancelled</span>' : `<span class="gd-mini-tally">✅ ${game.counts.yes}</span>`}
                        ${game.myResponse ? `<span class="gd-my-reply gd-status-${game.myResponse}">${game.myResponse === 'yes' ? 'In' : game.myResponse === 'maybe' ? 'Maybe' : 'Out'}</span>` : ''}
                    </span>
                </button>`).join('')}`;
    }

    function setupHtml() {
        const group = currentGroup();
        if (state.status === 'guest') {
            return `
                <div class="glass-card gd-setup">
                    <div class="gd-row"><span class="gd-big-emoji">📅</span><div>
                        <strong>Game Day needs your own group</strong>
                        <p class="gd-subtle">Schedule games, collect In / Maybe / Out replies, set smart alarms, and see who is on the way.</p>
                    </div></div>
                    <button type="button" class="btn btn-primary" data-gd-action="go-settings">🔐 Sign in or create a group</button>
                </div>`;
        }
        if (state.status === 'left') {
            return `
                <div class="glass-card gd-setup">
                    <div class="gd-row"><span class="gd-big-emoji">👋</span><div>
                        <strong>You left Game Day on this device</strong>
                        <p class="gd-subtle">Join again to reply to games and get invites for ${escapeHtml(group.name)}.</p>
                    </div></div>
                    <button type="button" class="btn btn-primary" data-gd-action="rejoin">Join Game Day</button>
                </div>`;
        }
        if (state.status === 'needs-password') {
            return `
                <form class="glass-card gd-setup" data-gd-form="password">
                    <div class="gd-row"><span class="gd-big-emoji">🔐</span><div>
                        <strong>Confirm your group password</strong>
                        <p class="gd-subtle">Game Day shares replies and live locations, so it checks the ${escapeHtml(group.name)} password once on this device.</p>
                    </div></div>
                    <input class="form-input gd-input" type="password" name="password" autocomplete="current-password" placeholder="Group password">
                    <button type="submit" class="btn btn-primary">Join Game Day</button>
                </form>`;
        }
        if (state.status === 'error') {
            return `
                <div class="glass-card gd-setup gd-error">
                    <strong>⚠️ Game Day is unavailable</strong>
                    <p class="gd-subtle">${escapeHtml(state.error)}</p>
                    <button type="button" class="btn" data-gd-action="retry">Try again</button>
                </div>`;
        }
        if (state.status === 'loading') {
            return '<div class="glass-card gd-skeleton"><div></div><div></div><div></div></div>';
        }

        const cards = [];
        if (state.status === 'ready' && !myPlayerId() && state.players.length > 0) {
            cards.push(`
                <div class="glass-card gd-setup gd-claim" id="gdClaimCard">
                    <div class="gd-row"><span class="gd-big-emoji">👋</span><div>
                        <strong>Who are you?</strong>
                        <p class="gd-subtle">Pick your name so your replies, alarm, and live trip show up for the group.</p>
                    </div></div>
                    <input class="form-input gd-input" data-gd-input="claim-filter" placeholder="Search the roster" autocomplete="off">
                    <div class="gd-claim-list" data-gd-claim-list>${claimListHtml()}</div>
                </div>`);
        }
        if (Native.isNative && state.capabilities.push && state.pushPermission !== 'granted' && state.device) {
            cards.push(`
                <div class="glass-card gd-setup gd-push">
                    <div class="gd-row"><span class="gd-big-emoji">🔔</span><div>
                        <strong>Get game-day invites</strong>
                        <p class="gd-subtle">Reply In, Maybe, or Out straight from the notification.</p>
                    </div></div>
                    ${state.pushPermission === 'denied'
                        ? '<button type="button" class="btn" data-gd-action="open-settings" data-target="notifications">Open notification settings</button>'
                        : '<button type="button" class="btn btn-primary" data-gd-action="enable-push">Turn on notifications</button>'}
                </div>`);
        }
        return cards.join('');
    }

    function claimListHtml() {
        const filter = state.claimFilter.trim().toLowerCase();
        const players = state.players.filter(player => !filter || player.name.toLowerCase().includes(filter));
        if (players.length === 0) return '<p class="gd-subtle gd-small">No players match. Ask the admin to add you to the roster.</p>';
        return players.map(player => `
            <button type="button" class="gd-claim-btn" data-gd-action="claim" data-player-id="${escapeHtml(player.id)}">
                <span class="gd-avatar">${escapeHtml(Core.initials(player.name))}</span><span>${escapeHtml(player.name)}</span>
            </button>`).join('');
    }

    function statusBannerHtml() {
        if (state.status !== 'ready' || !state.offlineSince) return '';
        return `<div class="gd-banner">📶 Offline, showing replies from ${escapeHtml(Core.relativeAgo(state.offlineSince))}. <button type="button" class="gd-link" data-gd-action="retry">Retry</button></div>`;
    }

    function emptyHtml() {
        if (state.status !== 'ready') return '';
        return `
            <div class="glass-card gd-empty">
                <div class="gd-big-emoji">🏏</div>
                <strong>No games scheduled yet</strong>
                <p class="gd-subtle">${isAdmin() ? 'Schedule the next game and everyone in the group gets an invite.' : 'When your admin schedules a game, you will get an invite here.'}</p>
            </div>`;
    }

    function alarmCandidate() {
        const selected = selectedGame();
        if (selected && selected.myResponse === 'yes' && Core.isAlarmWindowOpen(selected)) return selected;
        return state.gameDays.find(game => game.myResponse === 'yes' && Core.isAlarmWindowOpen(game)) || null;
    }

    function alarmCardHtml() {
        const game = alarmCandidate();
        if (!game) return '';
        const plan = alarmPlans()[game.id];
        const gameId = escapeHtml(game.id);
        if (plan && !plan.missing) {
            return `
                <div class="glass-card gd-alarm${plan.stale ? ' gd-alarm-stale' : ''}">
                    <div class="gd-row">
                        <span class="gd-big-emoji">⏰</span>
                        <div>
                            <div class="gd-eyebrow">Game-day alarm${plan.mode === 'clock' ? ' · in your Clock app' : ''}</div>
                            <div class="gd-alarm-time">${escapeHtml(formatTime(plan.alarmAt, game))}</div>
                            <div class="gd-subtle gd-small">${escapeHtml(Core.dayLabel(plan.alarmAt, game.timezone))} · leave by ${escapeHtml(formatTime(plan.leaveAt, game))} · ${escapeHtml(Core.formatDuration(plan.travelSeconds))} drive · ${plan.prepMinutes} min to get ready</div>
                        </div>
                    </div>
                    ${plan.stale ? '<p class="gd-warning">The game time or venue changed. Update your alarm so it still gets you there on time.</p>' : ''}
                    <div class="gd-actions">
                        <button type="button" class="btn btn-primary" data-gd-action="open-alarm" data-game-id="${gameId}">${plan.stale ? 'Update alarm' : 'Change'}</button>
                        <button type="button" class="btn" data-gd-action="remove-alarm" data-game-id="${gameId}">Remove</button>
                    </div>
                </div>`;
        }
        return `
            <div class="glass-card gd-alarm gd-alarm-cta">
                <div class="gd-row">
                    <span class="gd-big-emoji">⏰</span>
                    <div>
                        <strong>${plan && plan.missing ? 'Set your alarm again' : 'Set your game-day alarm'}</strong>
                        <p class="gd-subtle">We use where you are now and the ${escapeHtml(formatTime(game.reachBy, game))} reach-by time to pick your wake-up time.</p>
                    </div>
                </div>
                <button type="button" class="btn btn-primary" data-gd-action="open-alarm" data-game-id="${gameId}">Get my alarm time</button>
                ${Native.isNative ? '' : '<p class="gd-subtle gd-small">Alarms ring in the BCCB Cricket app on Android and iPhone. You can still check your leave time here.</p>'}
            </div>`;
    }

    function homeCardHtml() {
        if (isGuestGroup() || state.status === 'left') return '';
        const game = nextGame();
        if (!game) {
            if (state.status !== 'ready') return '';
            return `
                <div class="glass-card gd-home-card gd-home-empty">
                    <div class="gd-home-head"><span class="gd-eyebrow">📅 Game Day</span></div>
                    <p class="gd-subtle">No game scheduled yet.</p>
                    ${isAdmin() ? '<button type="button" class="btn btn-primary gd-compact-btn" data-gd-action="open-create">➕ Schedule a game day</button>' : ''}
                </div>`;
        }
        const travellers = game.travellers || 0;
        return `
            <div class="glass-card gd-home-card" data-gd-action="open-game" data-game-id="${escapeHtml(game.id)}">
                <div class="gd-home-head">
                    <span class="gd-eyebrow">📅 Next game</span>
                    ${statusPillHtml(game)}
                </div>
                <div class="gd-home-main">
                    ${dateChipHtml(game)}
                    <div class="gd-home-text">
                        <div class="gd-title">${escapeHtml(game.title)}</div>
                        <div class="gd-subtle gd-small">🏏 ${escapeHtml(formatTime(game.startsAt, game))} · 🎯 reach ${escapeHtml(formatTime(game.reachBy, game))}</div>
                        <div class="gd-subtle gd-small">📍 ${escapeHtml(game.venue.name)}</div>
                    </div>
                </div>
                ${replyControlHtml(game, true)}
                ${tallyHtml(game)}
                ${travellers > 0 ? `<div class="gd-home-extra">🚗 ${travellers} on the way</div>` : ''}
                ${tossLineHtml(game.toss)}
                <div class="gd-home-link">Open Game Day →</div>
            </div>`;
    }

    function renderHomeCard() {
        setHtml(document.getElementById('homeGameDayCard'), homeCardHtml());
    }

    function renderPage() {
        if (!document.getElementById('gameDayRoot')) return;
        setHtml(pageSection('status'), statusBannerHtml());
        if (setHtml(pageSection('setup'), setupHtml())) {
            const claimInput = document.querySelector('[data-gd-input="claim-filter"]');
            if (claimInput) claimInput.value = state.claimFilter;
        }
        const ready = state.status === 'ready';
        setHtml(pageSection('admin'), ready && isAdmin()
            ? '<button type="button" class="btn btn-success gd-schedule-btn" data-gd-action="open-create">➕ Schedule a game day</button>'
            : '');
        const game = ready ? selectedGame() : null;
        if (setHtml(pageSection('hero'), game ? heroHtml(game) : emptyHtml())) destroyHeroMap();
        setHtml(pageSection('alarm'), ready ? alarmCardHtml() : '');
        renderTripSection();
        setHtml(pageSection('later'), ready ? laterGamesHtml() : '');
    }

    function settingsCardHtml() {
        const pushLabel = !Native.isNative ? 'Available in the app'
            : !state.capabilities.push ? 'Not set up in this build'
                : state.pushPermission === 'granted' ? 'On' : state.pushPermission === 'denied' ? 'Off' : 'Not enabled yet';
        const alarmLabel = { exact: 'Exact alarms', clock: 'Clock app', alarmkit: 'System alarms', notification: 'Notification alarms', none: 'Available in the app' }[state.capabilities.alarms] || 'Available in the app';
        const joined = Boolean(state.device);
        return `
            <h3>📅 Game Day on this device</h3>
            <div class="gd-settings-row"><span>Replying as</span><strong>${escapeHtml(myPlayerId() ? playerName(myPlayerId()) : 'Not chosen yet')}</strong></div>
            <div class="gd-settings-row"><span>Notifications</span><strong>${escapeHtml(pushLabel)}</strong></div>
            <div class="gd-settings-row"><span>Alarms</span><strong>${escapeHtml(alarmLabel)}</strong></div>
            ${joined ? `
                <div class="gd-actions">
                    ${myPlayerId() ? '<button type="button" class="btn btn-secondary" data-gd-action="change-claim">Change player</button>' : ''}
                    <button type="button" class="btn btn-danger" data-gd-action="leave-game-day">Leave Game Day on this device</button>
                </div>
                <p class="gd-subtle gd-small">Leaving removes this phone's player link, notification token, alarms, and any live trip. Your replies stay with the group.</p>`
                : '<button type="button" class="btn btn-primary" data-gd-action="rejoin">Join Game Day</button>'}`;
    }

    function renderSettingsCard() {
        const card = document.getElementById('gameDaySettingsCard');
        if (!card) return;
        card.hidden = isGuestGroup();
        if (!card.hidden) setHtml(card, settingsCardHtml());
    }

    function render() {
        renderHomeCard();
        renderPage();
        renderSettingsCard();
        hydrateMaps();
        if (sheet && sheet.type === 'alarm') renderSheet();
    }

    function isVisible(element) {
        return Boolean(element && element.offsetParent !== null && element.clientWidth > 0);
    }

    function webglAvailable() {
        if (webglSupport === null) {
            try {
                const canvas = document.createElement('canvas');
                webglSupport = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
            } catch (error) {
                webglSupport = false;
            }
        }
        return webglSupport;
    }

    function mapFallback(element, message) {
        element.classList.add('gd-map-fallback');
        element.innerHTML = `<span>🗺️ ${escapeHtml(message)}</span>`;
        return null;
    }

    // Re-colours OpenFreeMap's dark style to the app's indigo and purple palette.
    function applyMapTheme(map) {
        Object.keys(MAP_THEME).forEach(layerId => {
            if (!map.getLayer(layerId)) return;
            const [property, value] = MAP_THEME[layerId];
            try {
                map.setPaintProperty(layerId, property, value);
            } catch (error) {
                console.warn(`Could not theme map layer ${layerId}.`, error);
            }
        });
    }

    function createMap(element, options) {
        if (!window.maplibregl || !webglAvailable()) {
            return mapFallback(element, 'The map needs a newer phone browser. Live times still update below.');
        }
        try {
            const map = new window.maplibregl.Map(Object.assign({
                container: element,
                style: MAP_STYLE_URL,
                attributionControl: { compact: false },
                dragRotate: false,
                pitchWithRotate: false,
                touchPitch: false,
                maxZoom: 18,
                fadeDuration: 0
            }, options));
            map.touchZoomRotate.disableRotation();
            map.on('style.load', () => applyMapTheme(map));
            map.on('error', event => console.warn('Map error', event && event.error ? event.error.message : event));
            return map;
        } catch (error) {
            console.warn('The map could not start.', error);
            return mapFallback(element, 'The map could not load. Live times still update below.');
        }
    }

    function markerElement(html, className) {
        const element = document.createElement('div');
        element.className = className;
        element.innerHTML = html;
        return element;
    }

    function venueMarker(lngLat, label) {
        const marker = new window.maplibregl.Marker({
            element: markerElement('<div class="gd-venue-marker"><span>🏏</span></div>', 'gd-marker-wrap'),
            anchor: 'bottom'
        }).setLngLat(lngLat);
        if (label) marker.setPopup(new window.maplibregl.Popup({ closeButton: false, offset: 40 }).setText(label));
        return marker;
    }

    function playerMarkerHtml(name, status) {
        return `<div class="gd-marker gd-marker-${status}"><span>${escapeHtml(Core.initials(name))}</span></div>`;
    }

    function circlePolygon(center, radiusMeters) {
        const points = [];
        const latRadians = center.lat * Math.PI / 180;
        const degreesLat = radiusMeters / 111320;
        const degreesLng = radiusMeters / (111320 * Math.cos(latRadians));
        for (let index = 0; index <= 64; index++) {
            const angle = (index / 64) * 2 * Math.PI;
            points.push([center.lng + degreesLng * Math.cos(angle), center.lat + degreesLat * Math.sin(angle)]);
        }
        return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [points] }, properties: {} };
    }

    function addArrivalZone(map, venue) {
        const draw = () => {
            if (map.getSource('gd-arrival')) return;
            map.addSource('gd-arrival', { type: 'geojson', data: circlePolygon(venue, Core.constants.ARRIVAL_RADIUS_METERS) });
            map.addLayer({ id: 'gd-arrival-fill', type: 'fill', source: 'gd-arrival', paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.14 } });
            map.addLayer({ id: 'gd-arrival-line', type: 'line', source: 'gd-arrival', paint: { 'line-color': '#22c55e', 'line-width': 1.5, 'line-opacity': 0.8 } });
        };
        if (map.isStyleLoaded()) draw();
        map.on('style.load', draw);
    }

    function destroyHeroMap() {
        if (maps.hero) {
            maps.hero.remove();
            maps.hero = null;
        }
    }

    function destroyTripMap() {
        if (maps.trip) maps.trip.remove();
        maps.trip = null;
        maps.tripGameId = null;
        maps.tripMarkers.clear();
        maps.tripUserMoved = false;
    }

    function hydrateMaps() {
        const heroElement = document.querySelector('[data-gd-map="hero"]');
        if (heroElement && !maps.hero && !heroElement.classList.contains('gd-map-fallback') && isVisible(heroElement)) {
            const center = { lng: Number(heroElement.dataset.lng), lat: Number(heroElement.dataset.lat) };
            maps.hero = createMap(heroElement, { center, zoom: 14.5, interactive: false });
            if (maps.hero) venueMarker(center).addTo(maps.hero);
        } else if (maps.hero) {
            maps.hero.resize();
        }

        const tripElement = document.querySelector('[data-gd-map="trip"]');
        if (tripElement && !maps.trip && !tripElement.classList.contains('gd-map-fallback') && isVisible(tripElement)) {
            const game = findGame(tripElement.dataset.gameId);
            if (game) {
                const venue = { lng: game.venue.lng, lat: game.venue.lat };
                maps.trip = createMap(tripElement, { center: venue, zoom: 13 });
                if (maps.trip) {
                    maps.tripGameId = game.id;
                    maps.trip.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), 'top-left');
                    addArrivalZone(maps.trip, venue);
                    venueMarker(venue, game.venue.name).addTo(maps.trip);
                    maps.trip.on('movestart', event => {
                        if (event.originalEvent) maps.tripUserMoved = true;
                    });
                    updateTripMarkers(game);
                }
            }
        } else if (maps.trip) {
            maps.trip.resize();
        }
    }

    function tripData(game) {
        return state.trips.get(game.id) || { trips: [] };
    }

    function updateTripMarkers(game) {
        if (!maps.trip || maps.tripGameId !== game.id) return;
        const trips = tripData(game).trips || [];
        const seen = new Set();
        trips.forEach(trip => {
            seen.add(trip.playerId);
            const status = trip.status === 'arrived' ? 'arrived' : trip.stale ? 'stale' : 'travelling';
            const lngLat = [trip.lng, trip.lat];
            const label = `${playerName(trip.playerId)} · ${trip.status === 'arrived' ? 'arrived' : trip.etaSeconds !== null ? `${Core.formatDuration(trip.etaSeconds)} away` : 'on the way'}`;
            let entry = maps.tripMarkers.get(trip.playerId);
            if (!entry) {
                const element = markerElement(playerMarkerHtml(playerName(trip.playerId), status), 'gd-marker-wrap');
                const popup = new window.maplibregl.Popup({ closeButton: false, offset: 22 }).setText(label);
                const marker = new window.maplibregl.Marker({ element, anchor: 'center' })
                    .setLngLat(lngLat)
                    .setPopup(popup)
                    .addTo(maps.trip);
                entry = { marker, popup, element, status };
                maps.tripMarkers.set(trip.playerId, entry);
            } else {
                entry.marker.setLngLat(lngLat);
                entry.popup.setText(label);
                if (entry.status !== status) {
                    entry.element.innerHTML = playerMarkerHtml(playerName(trip.playerId), status);
                    entry.status = status;
                }
            }
        });
        maps.tripMarkers.forEach((entry, playerId) => {
            if (!seen.has(playerId)) {
                entry.marker.remove();
                maps.tripMarkers.delete(playerId);
            }
        });
        if (!maps.tripUserMoved) fitTripMap(game);
    }

    function fitTripMap(game) {
        if (!maps.trip) return;
        const bounds = new window.maplibregl.LngLatBounds([game.venue.lng, game.venue.lat], [game.venue.lng, game.venue.lat]);
        maps.tripMarkers.forEach(entry => bounds.extend(entry.marker.getLngLat()));
        if (maps.tripMarkers.size === 0) {
            maps.trip.jumpTo({ center: [game.venue.lng, game.venue.lat], zoom: 14 });
        } else {
            maps.trip.fitBounds(bounds, { padding: { top: 56, right: 48, bottom: 64, left: 48 }, maxZoom: 15, duration: 600 });
        }
    }

    function tripControlsHtml(game) {
        if (!myPlayerId()) return '<p class="gd-subtle gd-small">Pick your name above to share your trip.</p>';
        const status = state.tripStatus || {};
        if (status.active && status.gameDayId === game.id) {
            const detail = status.lastError
                ? `⚠️ ${status.lastError}`
                : status.lastUpdateAt ? `Updated ${Core.relativeAgo(status.lastUpdateAt)}` : 'Finding your location…';
            return `
                <div class="gd-trip-me gd-sharing">
                    <span class="gd-live-dot" aria-hidden="true"></span>
                    <div><strong>Sharing your trip</strong><div class="gd-subtle gd-small">${escapeHtml(detail)}</div></div>
                    <button type="button" class="btn gd-stop-btn" data-gd-action="stop-trip">⏹ Stop</button>
                </div>`;
        }
        const myTrip = (tripData(game).trips || []).find(trip => trip.playerId === myPlayerId());
        if (myTrip && myTrip.status === 'arrived') {
            return '<div class="gd-trip-me gd-arrived">✅ You have arrived. Enjoy the game!</div>';
        }
        if (game.myResponse === 'no') return '<p class="gd-subtle gd-small">You are marked as out for this game.</p>';
        if (!Core.canStartTrip(game)) return '<p class="gd-subtle gd-small">⏱️ Trip sharing has closed for this game.</p>';
        return `
            <button type="button" class="btn btn-success gd-start-trip" data-gd-action="start-trip" data-game-id="${escapeHtml(game.id)}"${Native.isNative ? '' : ' disabled'}>🚗 I'm leaving: share my trip</button>
            ${Native.isNative ? '' : '<p class="gd-subtle gd-small">Live trips need the BCCB Cricket app on Android or iPhone.</p>'}`;
    }

    function tripListHtml(game) {
        const trips = tripData(game).trips || [];
        const tripsByPlayer = new Map(trips.map(trip => [trip.playerId, trip]));
        const travelling = trips.filter(trip => trip.status === 'travelling')
            .sort((a, b) => (a.etaSeconds === null ? Infinity : a.etaSeconds) - (b.etaSeconds === null ? Infinity : b.etaSeconds));
        const arrived = trips.filter(trip => trip.status === 'arrived');
        const sharingNow = Boolean(state.tripStatus && state.tripStatus.active && state.tripStatus.gameDayId === game.id);
        const startingMe = sharingNow && myPlayerId() && !tripsByPlayer.has(myPlayerId()) ? myPlayerId() : null;
        const notStarted = game.rsvps.yes.filter(playerId => !tripsByPlayer.has(playerId) && playerId !== startingMe);
        const row = (playerId, status, detail, side) => `
            <div class="gd-trip-row gd-trip-${status}">
                <span class="gd-avatar gd-avatar-${status}">${escapeHtml(Core.initials(playerName(playerId)))}</span>
                <div class="gd-trip-info"><strong>${escapeHtml(playerName(playerId))}${playerId === myPlayerId() ? ' (you)' : ''}</strong><span class="gd-subtle gd-small">${escapeHtml(detail)}</span></div>
                <span class="gd-trip-eta">${escapeHtml(side)}</span>
            </div>`;
        const sections = [];
        if (travelling.length > 0 || startingMe) {
            sections.push(`<div class="gd-names-label">🚗 On the way <span class="gd-subtle">${travelling.length + (startingMe ? 1 : 0)}</span></div>`);
            if (startingMe) sections.push(row(startingMe, 'travelling', 'Finding your location…', '…'));
            travelling.forEach(trip => {
                const detail = trip.stale
                    ? `⚠️ No update since ${Core.relativeAgo(trip.updatedAt)}`
                    : `${trip.distanceMeters === null ? '' : `${Core.formatDistance(trip.distanceMeters)} away · `}updated ${Core.relativeAgo(trip.updatedAt)}`;
                const eta = trip.etaSeconds === null ? '…' : `${Math.max(1, Math.round(trip.etaSeconds / 60))} min`;
                sections.push(row(trip.playerId, trip.stale ? 'stale' : 'travelling', detail, eta));
            });
        }
        if (arrived.length > 0) {
            sections.push(`<div class="gd-names-label">✅ Arrived <span class="gd-subtle">${arrived.length}</span></div>`);
            arrived.forEach(trip => sections.push(row(trip.playerId, 'arrived', `Arrived ${Core.relativeAgo(trip.updatedAt)}`, '🏏')));
        }
        if (notStarted.length > 0) {
            sections.push(`<div class="gd-names-label">🏠 Not left yet <span class="gd-subtle">${notStarted.length}</span></div>`);
            notStarted.forEach(playerId => sections.push(row(playerId, 'waiting', 'Said they are in', '')));
        }
        if (sections.length === 0) return '<p class="gd-subtle gd-small">Nobody is sharing a trip yet.</p>';
        return sections.join('');
    }

    function renderTripSection() {
        const container = pageSection('trip');
        if (!container) return;
        const game = state.status === 'ready' ? selectedGame() : null;
        if (!game || !Core.isTripWindowOpen(game)) {
            destroyTripMap();
            setHtml(container, '');
            return;
        }
        if (maps.tripGameId !== game.id || !container.querySelector('[data-gd-map="trip"]')) {
            destroyTripMap();
            setHtml(container, `
                <div class="glass-card gd-trip">
                    <div class="gd-trip-head">
                        <div><div class="gd-eyebrow"><span class="gd-live-dot" aria-hidden="true"></span> Live</div><h3>🗺️ Who's on the way</h3></div>
                        <button type="button" class="gd-chip-btn" data-gd-action="fit-trip-map">⤢ Fit</button>
                    </div>
                    <div class="gd-map" data-gd-map="trip" data-game-id="${escapeHtml(game.id)}"></div>
                    <div class="gd-trip-controls" data-gd-trip-controls></div>
                    <div class="gd-trip-list" data-gd-trip-list></div>
                </div>`);
        }
        setHtml(container.querySelector('[data-gd-trip-controls]'), tripControlsHtml(game));
        setHtml(container.querySelector('[data-gd-trip-list]'), tripListHtml(game));
        hydrateMaps();
        updateTripMarkers(game);
    }

    function openSheet(type, data) {
        sheet = { type, data: data || {} };
        renderSheet();
    }

    function closeSheet() {
        if (maps.picker) {
            maps.picker.remove();
            maps.picker = null;
            maps.pickerMarker = null;
        }
        sheet = null;
        renderSheet();
    }

    function sheetBodyHtml() {
        if (!sheet) return '';
        if (sheet.type === 'game-form') return gameFormHtml(sheet.data);
        if (sheet.type === 'alarm') return alarmSheetHtml(sheet.data);
        if (sheet.type === 'trip-consent') return tripConsentHtml(sheet.data);
        return '';
    }

    function renderSheet() {
        let host = document.getElementById('gdSheetHost');
        if (!host) {
            host = document.createElement('div');
            host.id = 'gdSheetHost';
            document.body.appendChild(host);
        }
        if (!sheet) {
            host.innerHTML = '';
            renderedHtml.delete(host);
            document.body.classList.remove('gd-sheet-open');
            return;
        }
        document.body.classList.add('gd-sheet-open');
        const existing = host.querySelector('.gd-sheet');
        if (existing && existing.dataset.sheetType === sheet.type && sheet.type === 'game-form') return;
        const body = sheetBodyHtml();
        if (existing && existing.dataset.sheetType === sheet.type) {
            setHtml(existing, body);
            return;
        }
        host.innerHTML = `
            <div class="gd-sheet-backdrop" data-gd-action="close-sheet-backdrop">
                <div class="gd-sheet" role="dialog" aria-modal="true" data-sheet-type="${sheet.type}">${body}</div>
            </div>`;
        renderedHtml.set(host.querySelector('.gd-sheet'), body);
        if (sheet.type === 'game-form') initPickerMap();
    }

    function sheetHeadHtml(title) {
        return `<div class="gd-sheet-head"><h3>${title}</h3><button type="button" class="gd-icon-btn" data-gd-action="close-sheet" aria-label="Close">✕</button></div>`;
    }

    function nextWeekdayDate(weekday, timeZone) {
        const today = Core.isoToLocalInput(new Date().toISOString(), timeZone).date;
        const [year, month, day] = today.split('-').map(Number);
        const base = new Date(Date.UTC(year, month - 1, day));
        const offset = ((weekday - base.getUTCDay()) + 7) % 7 || 7;
        base.setUTCDate(base.getUTCDate() + offset);
        return base.toISOString().slice(0, 10);
    }

    function gameFormDefaults(game) {
        if (game) {
            const start = Core.isoToLocalInput(game.startsAt, game.timezone);
            return {
                title: game.title,
                date: start.date,
                start: start.time,
                reach: Core.isoToLocalInput(game.reachBy, game.timezone).time,
                notes: game.notes || '',
                timezone: game.timezone,
                venue: Object.assign({}, game.venue)
            };
        }
        const timezone = Core.deviceTimeZone();
        const template = readJson(STORAGE.template, null);
        return {
            title: template ? template.title : 'Game Day',
            date: nextWeekdayDate(template ? template.weekday : 6, timezone),
            start: template ? template.start : '08:00',
            reach: template ? template.reach : '07:30',
            notes: '',
            timezone,
            venue: template && template.venue ? Object.assign({}, template.venue) : null
        };
    }

    function gameFormHtml(data) {
        const values = data.values;
        const venue = data.venue;
        return `
            ${sheetHeadHtml(data.game ? '✏️ Edit game day' : '📅 Schedule a game day')}
            <form class="gd-form" data-gd-form="game" novalidate>
                <label class="gd-field"><span>Title</span>
                    <input class="form-input" name="title" maxlength="80" value="${escapeHtml(values.title)}" placeholder="Game Day">
                </label>
                <label class="gd-field"><span>📆 Date</span>
                    <input class="form-input" type="date" name="date" value="${escapeHtml(values.date)}" required>
                </label>
                <div class="gd-field-row">
                    <label class="gd-field"><span>🏏 Start</span>
                        <input class="form-input" type="time" name="start" value="${escapeHtml(values.start)}" required>
                    </label>
                    <label class="gd-field"><span>🎯 Reach by</span>
                        <input class="form-input" type="time" name="reach" value="${escapeHtml(values.reach)}" required>
                    </label>
                </div>
                <div class="gd-field"><span>📍 Venue</span>
                    <div class="gd-search-row">
                        <input class="form-input" name="venueQuery" placeholder="Search for a ground or address" data-gd-input="venue-query" autocomplete="off">
                        <button type="button" class="gd-chip-btn" data-gd-action="venue-search">Search</button>
                    </div>
                    <div class="gd-venue-results" data-gd-venue-results></div>
                    <div class="gd-picker-map" data-gd-map="picker"></div>
                    <div class="gd-picker-hint gd-subtle gd-small">Tap the map to drop the pin on the ground. <button type="button" class="gd-link" data-gd-action="venue-here">📍 Use my location</button></div>
                    <input class="form-input" name="venueName" maxlength="120" placeholder="Venue name" value="${escapeHtml(venue ? venue.name : '')}">
                    <div class="gd-subtle gd-small" data-gd-venue-address>${escapeHtml(venue && venue.address ? venue.address : '')}</div>
                </div>
                <label class="gd-field"><span>📝 Notes (optional)</span>
                    <textarea class="form-input" name="notes" maxlength="500" rows="2" placeholder="Bring whites, parking on the east side…">${escapeHtml(values.notes)}</textarea>
                </label>
                <p class="gd-subtle gd-small">Times are in ${escapeHtml(values.timezone)}.</p>
                <div class="gd-form-error" data-gd-form-error role="alert"></div>
                <button type="submit" class="btn btn-success">${data.game ? '💾 Save changes' : '📣 Schedule and notify the group'}</button>
            </form>`;
    }

    function openGameForm(gameId) {
        const game = gameId ? findGame(gameId) : null;
        const values = gameFormDefaults(game);
        openSheet('game-form', { game, values, venue: values.venue });
    }

    function initPickerMap() {
        const element = document.querySelector('[data-gd-map="picker"]');
        if (!element || !sheet) return;
        const venue = sheet.data.venue;
        const home = savedHome();
        const center = venue ? { lng: venue.lng, lat: venue.lat } : home ? { lng: home.lng, lat: home.lat } : { lng: 151.2093, lat: -33.8688 };
        maps.picker = createMap(element, { center, zoom: venue ? 15 : home ? 12 : 10 });
        if (!maps.picker) return;
        maps.picker.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), 'top-left');
        if (venue) placePickerPin(venue.lat, venue.lng);
        maps.picker.on('click', event => {
            placePickerPin(event.lngLat.lat, event.lngLat.lng);
            setFormVenue({ lat: event.lngLat.lat, lng: event.lngLat.lng }, true);
        });
        setTimeout(() => maps.picker && maps.picker.resize(), 300);
    }

    function placePickerPin(lat, lng) {
        if (!maps.picker) return;
        if (maps.pickerMarker) {
            maps.pickerMarker.setLngLat([lng, lat]);
        } else {
            maps.pickerMarker = venueMarker([lng, lat]).addTo(maps.picker);
        }
    }

    async function setFormVenue(venue, lookUpName) {
        if (!sheet || sheet.type !== 'game-form') return;
        const form = document.querySelector('[data-gd-form="game"]');
        const nameInput = form ? form.querySelector('[name="venueName"]') : null;
        sheet.data.venue = Object.assign({}, sheet.data.venue || {}, venue);
        if (venue.name && nameInput) nameInput.value = venue.name;
        const addressElement = form ? form.querySelector('[data-gd-venue-address]') : null;
        if (addressElement) addressElement.textContent = sheet.data.venue.address || `Pin at ${venue.lat.toFixed(5)}, ${venue.lng.toFixed(5)}`;
        if (maps.picker) {
            placePickerPin(venue.lat, venue.lng);
            maps.picker.easeTo({ center: [venue.lng, venue.lat], zoom: Math.max(maps.picker.getZoom(), 15), duration: 400 });
        }
        if (lookUpName) {
            try {
                const result = await api(`/geo/reverse?lat=${venue.lat}&lng=${venue.lng}`, { admin: true });
                if (result.place && sheet && sheet.type === 'game-form') {
                    sheet.data.venue.address = result.place.address;
                    if (addressElement) addressElement.textContent = result.place.address;
                    if (nameInput && !nameInput.value.trim()) nameInput.value = result.place.name;
                }
            } catch (error) {
                console.warn('Could not look up the venue address.', error);
            }
        }
    }

    async function searchVenues() {
        const form = document.querySelector('[data-gd-form="game"]');
        const query = form ? form.querySelector('[name="venueQuery"]').value.trim() : '';
        const results = form ? form.querySelector('[data-gd-venue-results]') : null;
        if (!results) return;
        if (query.length < 3) {
            results.innerHTML = '<p class="gd-subtle gd-small">Type at least 3 characters.</p>';
            return;
        }
        results.innerHTML = '<p class="gd-subtle gd-small">Searching…</p>';
        try {
            const data = await api(`/geo/search?q=${encodeURIComponent(query)}`, { admin: true });
            sheet.data.searchResults = data.places || [];
            results.innerHTML = sheet.data.searchResults.length === 0
                ? '<p class="gd-subtle gd-small">No places found. Try another name or drop a pin.</p>'
                : sheet.data.searchResults.map((place, index) => `
                    <button type="button" class="gd-venue-option" data-gd-action="venue-pick" data-index="${index}">
                        <strong>${escapeHtml(place.name)}</strong><span class="gd-subtle gd-small">${escapeHtml(Core.shortAddress(place.name, place.address) || place.address)}</span>
                    </button>`).join('') + `<p class="gd-attrib">${escapeHtml(data.attribution || '')}</p>`;
        } catch (error) {
            results.innerHTML = `<p class="gd-subtle gd-small">⚠️ ${escapeHtml(error.message)}</p>`;
        }
    }

    async function useCurrentLocationForVenue() {
        try {
            const permission = await Native.requestLocationPermission();
            if (permission.permission !== 'granted') throw new Error('Location access is off for BCCB Cricket.');
            const position = await Native.getCurrentPosition({ timeoutMs: 15000 });
            await setFormVenue({ lat: position.lat, lng: position.lng, address: null }, true);
        } catch (error) {
            toast(`📍 ${error.message}`);
        }
    }

    async function submitGameForm(form) {
        const errorElement = form.querySelector('[data-gd-form-error]');
        const showError = message => {
            errorElement.textContent = message;
        };
        const data = sheet.data;
        const timezone = data.values.timezone;
        const date = form.date.value;
        const startsAt = Core.localInputToIso(date, form.start.value, timezone);
        const reachBy = Core.localInputToIso(date, form.reach.value, timezone);
        const venueName = form.venueName.value.trim();
        if (!startsAt || !reachBy) return showError('Choose a date, start time, and reach-by time.');
        if (Date.parse(reachBy) > Date.parse(startsAt)) return showError('The reach-by time must be at or before the start time.');
        if (!data.game && Date.parse(startsAt) <= Date.now()) return showError('Choose a start time in the future.');
        if (!data.venue || !Number.isFinite(data.venue.lat)) return showError('Search for the venue or drop a pin on the map.');
        if (!venueName) return showError('Give the venue a name.');

        const payload = {
            title: form.title.value.trim() || 'Game Day',
            startsAt,
            reachBy,
            timezone,
            venue: { name: venueName, address: data.venue.address || null, lat: data.venue.lat, lng: data.venue.lng },
            notes: form.notes.value.trim() || null
        };
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        showError('');
        try {
            const result = data.game
                ? await api(`/game-days/${data.game.id}`, { method: 'PUT', body: payload, admin: true })
                : await api('/game-days', { method: 'POST', body: payload, admin: true });
            replaceGame(result.gameDay);
            state.selectedGameId = result.gameDay.id;
            if (!data.game) {
                const [year, month, day] = date.split('-').map(Number);
                writeJson(STORAGE.template, {
                    title: payload.title,
                    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
                    start: form.start.value,
                    reach: form.reach.value,
                    venue: payload.venue
                });
            }
            closeSheet();
            toast(data.game ? '💾 Game day updated' : '📣 Game day scheduled. Invites are on their way!');
            if (typeof window.showPage === 'function') window.showPage('gameday');
            render();
            refresh({ silent: true });
        } catch (error) {
            submit.disabled = false;
            showError(error.message);
        }
    }

    function savedHome() {
        const home = readJson(STORAGE.home, null);
        return home && Number.isFinite(home.lat) && Number.isFinite(home.lng) ? home : null;
    }

    function prepMinutes() {
        return Core.clampPrepMinutes(localStorage.getItem(STORAGE.prep) || Core.constants.DEFAULT_PREP_MINUTES);
    }

    function openAlarmSheet(gameId) {
        const game = findGame(gameId);
        if (!game) return;
        openSheet('alarm', { gameId, source: 'current', stage: 'locating', prepMinutes: prepMinutes(), saveHome: false });
        computeAlarm();
    }

    async function computeAlarm() {
        if (!sheet || sheet.type !== 'alarm') return;
        const data = sheet.data;
        const game = findGame(data.gameId);
        data.error = null;
        data.needsExactPermission = false;
        data.needsNotificationPermission = false;
        try {
            let from;
            if (data.source === 'home' && savedHome()) {
                from = savedHome();
            } else {
                data.source = 'current';
                data.stage = 'locating';
                renderSheet();
                const permission = await Native.requestLocationPermission();
                if (permission.permission !== 'granted') {
                    throw Object.assign(new Error('Location access is off for BCCB Cricket.'), { code: 'permission_denied' });
                }
                from = await Native.getCurrentPosition({ timeoutMs: 15000 });
            }
            data.from = { lat: from.lat, lng: from.lng };
            data.stage = 'routing';
            renderSheet();
            const result = await api(`/game-days/${game.id}/route`, { method: 'POST', body: { from: data.from } });
            data.travel = result.travel;
            data.gameUpdatedAt = result.gameDay.updatedAt;
            data.stage = 'ready';
        } catch (error) {
            data.stage = 'error';
            data.error = error.message;
            data.errorCode = error.code || null;
        }
        if (sheet && sheet.data === data) renderSheet();
    }

    function alarmPlanFor(data, game) {
        return Core.recommendAlarm({
            reachBy: game.reachBy,
            travelSeconds: data.travel.durationSeconds,
            prepMinutes: data.prepMinutes
        });
    }

    function alarmSheetHtml(data) {
        const game = findGame(data.gameId);
        if (!game) return `${sheetHeadHtml('⏰ Game-day alarm')}<p class="gd-subtle">This game is no longer available.</p>`;
        const head = sheetHeadHtml('⏰ Your game-day alarm');
        if (data.stage === 'locating' || data.stage === 'routing') {
            return `${head}
                <div class="gd-loading-block">
                    <div class="gd-spinner" aria-hidden="true"></div>
                    <p>${data.stage === 'locating' ? '📍 Finding where you are…' : `🚗 Working out the drive to ${escapeHtml(game.venue.name)}…`}</p>
                </div>`;
        }
        if (data.stage === 'error') {
            return `${head}
                <p class="gd-warning">⚠️ ${escapeHtml(data.error)}</p>
                <div class="gd-actions">
                    ${data.errorCode === 'permission_denied' ? '<button type="button" class="btn" data-gd-action="open-settings" data-target="location">Open location settings</button>' : ''}
                    ${savedHome() ? '<button type="button" class="btn" data-gd-action="alarm-source" data-source="home">🏠 Use my saved home</button>' : ''}
                    <button type="button" class="btn btn-primary" data-gd-action="alarm-retry">Try again</button>
                </div>`;
        }

        const plan = alarmPlanFor(data, game);
        const home = savedHome();
        const alarmAt = plan.status === 'get-ready-now' ? plan.leaveAtMs : plan.alarmAtMs;
        const sourceLabel = data.source === 'home' ? '🏠 Your saved home' : '📍 Your current location';
        const switchSource = data.source === 'home'
            ? '<button type="button" class="gd-link" data-gd-action="alarm-source" data-source="current">use current location</button>'
            : home ? '<button type="button" class="gd-link" data-gd-action="alarm-source" data-source="home">use saved home</button>' : '';
        let action;
        if (plan.status === 'leave-now') {
            action = `<p class="gd-warning">🚗 It is already time to leave to reach ${escapeHtml(game.venue.name)} by ${escapeHtml(formatTime(game.reachBy, game))}.</p>
                ${Core.canStartTrip(game) ? `<button type="button" class="btn btn-success" data-gd-action="start-trip" data-game-id="${escapeHtml(game.id)}">🚗 I'm leaving: share my trip</button>` : ''}`;
        } else if (!Native.isNative) {
            action = '<p class="gd-subtle">Install the BCCB Cricket app on Android or iPhone to have this alarm ring.</p>';
        } else if (data.needsNotificationPermission) {
            action = `
                <div class="gd-permission-note">
                    <strong>Turn on notifications</strong>
                    <p class="gd-subtle gd-small">BCCB Cricket rings your game alarm through a notification. Turn notifications on in Settings, then come back here.</p>
                    <button type="button" class="btn btn-primary" data-gd-action="open-settings" data-target="notifications">Open notification settings</button>
                    ${state.capabilities.alarms === 'exact' ? '<button type="button" class="btn" data-gd-action="set-alarm" data-clock="true">Use my Clock app instead</button>' : ''}
                </div>`;
        } else if (data.needsExactPermission) {
            action = `
                <div class="gd-permission-note">
                    <strong>Allow exact alarms</strong>
                    <p class="gd-subtle gd-small">Android needs your OK for BCCB Cricket to ring at an exact time, even when your phone is asleep.</p>
                    <button type="button" class="btn btn-primary" data-gd-action="allow-exact-alarms">Allow alarms</button>
                    <button type="button" class="btn" data-gd-action="set-alarm" data-clock="true">Use my Clock app instead</button>
                </div>`;
        } else {
            action = `<button type="button" class="btn btn-primary gd-set-alarm" data-gd-action="set-alarm">⏰ Set alarm for ${escapeHtml(formatTime(alarmAt, game))}</button>`;
        }
        return `${head}
            <div class="gd-alarm-hero">
                <span class="gd-eyebrow">${plan.status === 'get-ready-now' ? 'Time to get ready. Alarm at your leave time' : 'Recommended alarm'}</span>
                <strong class="gd-alarm-big">${escapeHtml(formatTime(alarmAt, game))}</strong>
                <span class="gd-subtle">${escapeHtml(Core.dayLabel(alarmAt, game.timezone))} · ${escapeHtml(game.title)}</span>
            </div>
            <div class="gd-plan">
                <div class="gd-plan-row"><span>From</span><strong>${sourceLabel}</strong>${switchSource}</div>
                <div class="gd-plan-row"><span>🚗 Drive</span><strong>${escapeHtml(Core.formatDuration(data.travel.durationSeconds))} · ${escapeHtml(Core.formatDistance(data.travel.distanceMeters))}${data.travel.source === 'estimate' ? ' (estimate)' : ''}</strong></div>
                <div class="gd-plan-row"><span>🎯 Reach by</span><strong>${escapeHtml(formatTime(game.reachBy, game))}</strong></div>
                <div class="gd-plan-row"><span>🚪 Leave by</span><strong>${escapeHtml(formatTime(plan.leaveAtMs, game))}</strong></div>
                <div class="gd-plan-row"><span>🪥 Get ready</span>
                    <div class="gd-stepper">
                        <button type="button" data-gd-action="prep-step" data-step="-5" aria-label="Five minutes less">−</button>
                        <strong>${plan.prepMinutes} min</strong>
                        <button type="button" data-gd-action="prep-step" data-step="5" aria-label="Five minutes more">+</button>
                    </div>
                </div>
            </div>
            ${data.source === 'current' ? `<label class="gd-check"><input type="checkbox" data-gd-input="save-home"${data.saveHome ? ' checked' : ''}> Save this spot as home for next time (kept on this phone only)</label>` : ''}
            ${action}
            ${data.travel.attribution ? `<p class="gd-attrib">${escapeHtml(data.travel.attribution)}</p>` : ''}`;
    }

    async function setAlarm(useClockApp) {
        if (!sheet || sheet.type !== 'alarm') return;
        const data = sheet.data;
        const game = findGame(data.gameId);
        const plan = alarmPlanFor(data, game);
        const alarmAt = plan.status === 'get-ready-now' ? plan.leaveAtMs : plan.alarmAtMs;
        try {
            let permission = await Native.getAlarmPermission();
            if (!useClockApp && permission.mode === 'exact' && permission.permission !== 'granted') {
                data.needsExactPermission = true;
                renderSheet();
                return;
            }
            if (permission.permission === 'prompt' || (!useClockApp && permission.notifications === 'prompt')) {
                permission = await Native.requestAlarmPermission();
            }
            const venue = game.venue.name;
            const result = await Native.scheduleGameAlarm({
                id: alarmId(game.id),
                gameDayId: game.id,
                groupId: game.groupId,
                alarmAt,
                leaveAt: plan.leaveAtMs,
                title: `🏏 ${game.title}: time to get ready`,
                body: `Leave by ${formatTime(plan.leaveAtMs, game)} to reach ${venue} by ${formatTime(game.reachBy, game)}.`,
                leaveTitle: '🚗 Time to leave',
                leaveBody: `Head to ${venue} now to reach by ${formatTime(game.reachBy, game)}. Tap to share your trip.`,
                venueName: venue,
                useClockApp: Boolean(useClockApp)
            });
            const plans = alarmPlans();
            plans[game.id] = {
                groupId: game.groupId,
                alarmId: alarmId(game.id),
                alarmAt,
                leaveAt: plan.leaveAtMs,
                reachBy: Date.parse(game.reachBy),
                venueLat: game.venue.lat,
                venueLng: game.venue.lng,
                travelSeconds: data.travel.durationSeconds,
                travelSource: data.travel.source,
                prepMinutes: plan.prepMinutes,
                gameUpdatedAt: data.gameUpdatedAt || game.updatedAt,
                mode: result.mode || permission.mode,
                source: data.source,
                setAt: Date.now()
            };
            saveAlarmPlans(plans);
            localStorage.setItem(STORAGE.prep, String(plan.prepMinutes));
            if (data.saveHome && data.source === 'current' && data.from) {
                writeJson(STORAGE.home, { lat: data.from.lat, lng: data.from.lng, savedAt: Date.now() });
            }
            closeSheet();
            toast(result.mode === 'clock'
                ? `⏰ Alarm added to your Clock app for ${formatTime(alarmAt, game)}`
                : `⏰ Alarm set for ${formatTime(alarmAt, game)}`);
            if (result.warning === 'notifications_disabled') {
                setTimeout(() => toast('🔔 Turn on notifications for BCCB Cricket so your alarm can ring.'), 2300);
            }
            render();
        } catch (error) {
            if (error.code === 'notifications_denied' && sheet && sheet.data === data) {
                data.needsExactPermission = false;
                data.needsNotificationPermission = true;
                renderSheet();
                return;
            }
            toast(`Could not set the alarm: ${error.message}`);
        }
    }

    async function allowExactAlarms() {
        try {
            const permission = await Native.requestAlarmPermission();
            if (permission.permission === 'granted') {
                await setAlarm(false);
            } else if (permission.permission !== 'pending') {
                toast('Exact alarms are still off. You can use your Clock app instead.');
            }
        } catch (error) {
            toast(error.message);
        }
    }

    function tripConsentHtml(data) {
        const game = findGame(data.gameId);
        return `${sheetHeadHtml('🚗 Share your trip?')}
            <div class="gd-consent">
                <p>Everyone in <strong>${escapeHtml(currentGroup().name)}</strong> will see your live location on the Game Day map until you:</p>
                <ul>
                    <li>arrive at ${escapeHtml(game ? game.venue.name : 'the ground')},</li>
                    <li>tap <strong>Stop</strong>, or</li>
                    <li>reach an hour after the start time.</li>
                </ul>
                <p class="gd-subtle gd-small">Only your latest position is kept, and it is deleted after the game. Your phone shows a location indicator while sharing.</p>
            </div>
            <button type="button" class="btn btn-success" data-gd-action="consent-trip" data-game-id="${escapeHtml(data.gameId)}">Start sharing</button>
            <button type="button" class="btn" data-gd-action="close-sheet">Not now</button>`;
    }

    async function startTrip(gameId, consentGiven) {
        const game = findGame(gameId);
        if (!game) return;
        if (!Native.isNative || !state.capabilities.backgroundLocation) {
            toast('Live trips need the BCCB Cricket app on Android or iPhone.');
            return;
        }
        if (!myPlayerId()) {
            toast('👋 Pick your name first.');
            showClaim();
            return;
        }
        if (!Core.canStartTrip(game)) {
            toast(tripUnavailableMessage(game));
            return;
        }
        if (!consentGiven && localStorage.getItem(STORAGE.tripConsent) !== 'true') {
            openSheet('trip-consent', { gameId });
            return;
        }
        try {
            const permission = await Native.requestLocationPermission();
            if (permission.permission !== 'granted') {
                toast('📍 Allow location access for BCCB Cricket to share your trip.');
                await Native.openSettings({ target: 'location' });
                return;
            }
            await syncNativeSession();
            const started = await Native.startTrip({
                gameDayId: game.id,
                groupId: game.groupId,
                venueLat: game.venue.lat,
                venueLng: game.venue.lng,
                venueName: game.venue.name,
                stopAfter: Core.tripWindow(game).stopAfterMs
            });
            state.tripStatus = { active: true, gameDayId: game.id, startedAt: (started && started.startedAt) || Date.now() };
            state.selectedGameId = game.id;
            toast('📡 Sharing your trip with the group');
            if (sheet) closeSheet();
            render();
            setTimeout(refreshTrips, 4000);
        } catch (error) {
            toast(`Could not start sharing: ${error.message}`);
        }
    }

    function tripUnavailableMessage(game) {
        if (game.status !== 'scheduled') return 'This game has been cancelled.';
        return Date.now() < Core.tripWindow(game).opensAtMs
            ? 'Live trips open 4 hours before the reach-by time.'
            : 'Trip sharing has closed for this game.';
    }

    async function stopTrip() {
        const current = state.tripStatus || {};
        try {
            await Native.stopTrip();
        } catch (error) {
            console.warn('The native trip tracker did not stop cleanly.', error);
        }
        const gameId = current.gameDayId;
        state.tripStatus = { active: false };
        if (gameId) {
            // Tells the server which trip ended, so an update still on its way can't restart it.
            const startedAt = Number(current.startedAt);
            const query = Number.isFinite(startedAt) && startedAt > 0 ? `?tripStartedAt=${Math.floor(startedAt)}` : '';
            try {
                await api(`/game-days/${gameId}/trip${query}`, { method: 'DELETE' });
            } catch (error) {
                console.warn('Could not remove the shared trip.', error);
            }
        }
        toast('⏹ Stopped sharing your trip');
        await refreshTrips();
        render();
    }

    async function nudge(gameId) {
        try {
            const result = await api(`/game-days/${gameId}/nudge`, { method: 'POST', admin: true });
            toast(result.nudged > 0 ? `⏳ Nudged ${result.nudged} ${result.nudged === 1 ? 'phone' : 'phones'}` : 'Everyone has replied already.');
        } catch (error) {
            toast(error.message);
        }
    }

    async function cancelGame(gameId) {
        const game = findGame(gameId);
        if (!game || !window.confirm(`Cancel ${game.title} on ${Core.formatDay(game.startsAt, game.timezone)}? Everyone will be notified.`)) return;
        try {
            const result = await api(`/game-days/${gameId}/cancel`, { method: 'POST', admin: true });
            replaceGame(result.gameDay);
            await removeAlarm(gameId);
            toast('❌ Game cancelled and the group has been told');
            render();
        } catch (error) {
            toast(error.message);
        }
    }

    function openDirections(gameId) {
        const game = findGame(gameId);
        if (!game) return;
        const { lat, lng, name } = game.venue;
        const url = Native.platform === 'ios'
            ? `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`
            : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        Native.openExternalUrl({ url }).catch(() => window.open(url, '_blank', 'noopener'));
    }

    async function leaveGameDay() {
        const group = currentGroup();
        if (!group || !window.confirm('Leave Game Day on this device? Your alarms and live trip will stop, and you will not get invites here.')) return;
        try {
            await api('/devices/me', { method: 'DELETE', retry: false });
        } catch (error) {
            console.warn('Could not remove this device from Game Day.', error);
        }
        await clearLocalGameDay(group.id);
        localStorage.setItem(STORAGE.left(group.id), 'true');
        state.status = 'left';
        toast('👋 You left Game Day on this device');
        render();
    }

    async function clearLocalGameDay(groupId) {
        try {
            await Native.clearSession();
        } catch (error) {
            console.warn('Could not clear the native Game Day session.', error);
        }
        const plans = alarmPlans();
        Object.keys(plans).forEach(gameId => {
            if (plans[gameId].groupId === groupId) delete plans[gameId];
        });
        saveAlarmPlans(plans);
        localStorage.removeItem(STORAGE.device(groupId));
        localStorage.removeItem(STORAGE.cache(groupId));
        state.device = null;
        state.gameDays = [];
        state.tripStatus = { active: false };
    }

    async function rejoin() {
        const group = currentGroup();
        if (!group) return;
        localStorage.removeItem(STORAGE.left(group.id));
        state.status = 'loading';
        render();
        try {
            await registerDevice();
        } catch (error) {
            console.warn('Could not rejoin Game Day.', error);
        }
        await refresh();
        syncPushToken(false);
    }

    async function joinWithPassword(form) {
        const password = form.password.value;
        const group = currentGroup();
        if (!password) {
            toast('Enter the group password.');
            return;
        }
        try {
            const passwordHash = await auth().hashPassword(password);
            await registerDevice({ memberPasswordHash: passwordHash });
            rememberMemberPasswordHash(group, passwordHash);
            state.status = 'loading';
            await refresh();
            syncPushToken(false);
        } catch (error) {
            toast(error.status === 401 ? 'That password is not right.' : error.message);
        }
    }

    function showClaim() {
        if (typeof window.showPage === 'function') window.showPage('gameday');
        render();
        setTimeout(() => {
            const card = document.getElementById('gdClaimCard');
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    }

    function handleRoute(route) {
        if (!route) return;
        if (route.page !== 'gameday') {
            if (typeof window.showPage === 'function' && document.getElementById(route.page)) window.showPage(route.page);
            return;
        }
        if (state.status !== 'ready') {
            state.pendingRoute = route;
            if (typeof window.showPage === 'function') window.showPage('gameday');
            return;
        }
        if (route.gameDayId && findGame(route.gameDayId)) state.selectedGameId = route.gameDayId;
        if (typeof window.showPage === 'function') window.showPage('gameday');
        render();
        if (route.action === 'alarm' && route.gameDayId && findGame(route.gameDayId)) {
            openAlarmSheet(route.gameDayId);
        } else if (route.action === 'trip') {
            setTimeout(() => {
                const trip = pageSection('trip');
                if (trip) trip.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        }
    }

    async function handleNotificationAction(event) {
        const group = currentGroup();
        if (event.groupId && group && Number(event.groupId) !== Number(group.id)) {
            toast('That notification is for another group. Switch groups in Settings to open it.');
            return;
        }
        const route = Core.parseRoute(event.route)
            || (event.gameDayId ? { page: 'gameday', gameDayId: event.gameDayId, action: null } : null);
        if (initialLoad) await initialLoad;
        if (event.action && event.action.indexOf('rsvp_') === 0 && event.gameDayId) {
            if (state.status !== 'ready') await refresh();
            handleRoute(route);
            await submitReply(event.gameDayId, event.action.slice(5));
            return;
        }
        if (event.action === 'start_trip' && event.gameDayId) {
            if (state.status !== 'ready') await refresh();
            handleRoute({ page: 'gameday', gameDayId: event.gameDayId, action: 'trip' });
            await startTrip(event.gameDayId, false);
            return;
        }
        handleRoute(route);
        refresh({ silent: true });
    }

    const actions = {
        'open-game': element => {
            state.selectedGameId = element.dataset.gameId;
            if (typeof window.showPage === 'function') window.showPage('gameday');
        },
        'select-game': element => {
            state.selectedGameId = element.dataset.gameId;
            render();
            if (state.pageVisible) refreshTrips();
            const hero = pageSection('hero');
            if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        reply: element => submitReply(element.dataset.gameId, element.dataset.response),
        'show-claim': () => showClaim(),
        claim: element => claimPlayer(element.dataset.playerId),
        'change-claim': () => releaseClaim(),
        'enable-push': () => syncPushToken(true),
        'open-settings': element => Native.openSettings({ target: element.dataset.target || 'app' }),
        'open-create': () => openGameForm(null),
        'open-edit': element => openGameForm(element.dataset.gameId),
        nudge: element => nudge(element.dataset.gameId),
        'cancel-game': element => cancelGame(element.dataset.gameId),
        directions: element => openDirections(element.dataset.gameId),
        'open-alarm': element => openAlarmSheet(element.dataset.gameId),
        'remove-alarm': async element => {
            if (await removeAlarm(element.dataset.gameId)) {
                toast('⏰ Alarm removed');
                render();
            }
        },
        'alarm-retry': () => computeAlarm(),
        'alarm-source': element => {
            sheet.data.source = element.dataset.source;
            computeAlarm();
        },
        'prep-step': element => {
            sheet.data.prepMinutes = Core.clampPrepMinutes(sheet.data.prepMinutes + Number(element.dataset.step));
            renderSheet();
        },
        'set-alarm': element => setAlarm(element.dataset.clock === 'true'),
        'allow-exact-alarms': () => allowExactAlarms(),
        'start-trip': element => startTrip(element.dataset.gameId, false),
        'consent-trip': element => {
            localStorage.setItem(STORAGE.tripConsent, 'true');
            startTrip(element.dataset.gameId, true);
        },
        'stop-trip': () => stopTrip(),
        'fit-trip-map': () => {
            maps.tripUserMoved = false;
            const game = selectedGame();
            if (game) fitTripMap(game);
        },
        'venue-search': () => searchVenues(),
        'venue-pick': element => {
            const place = sheet && sheet.data.searchResults ? sheet.data.searchResults[Number(element.dataset.index)] : null;
            if (place) setFormVenue({ name: place.name, address: place.address, lat: place.lat, lng: place.lng }, false);
        },
        'venue-here': () => useCurrentLocationForVenue(),
        'close-sheet': () => closeSheet(),
        'close-sheet-backdrop': () => closeSheet(),
        'go-settings': () => {
            if (typeof window.showPage === 'function') window.showPage('settings');
            const login = document.getElementById('loginSectionContent');
            if (login && login.style.display !== 'block' && typeof window.toggleTile === 'function') {
                window.toggleTile('loginSectionContent', login.nextElementSibling);
            }
        },
        'leave-game-day': () => leaveGameDay(),
        rejoin: () => rejoin(),
        retry: () => refresh()
    };

    function bindEvents() {
        document.addEventListener('click', event => {
            const element = event.target.closest('[data-gd-action]');
            if (!element || element.disabled) return;
            const action = element.dataset.gdAction;
            if (action === 'close-sheet-backdrop' && event.target !== element) return;
            const handler = actions[action];
            if (!handler) return;
            event.preventDefault();
            event.stopPropagation();
            Promise.resolve(handler(element)).catch(error => {
                console.error(`Game Day action ${action} failed`, error);
                toast(error.message || 'Something went wrong.');
            });
        });

        document.addEventListener('input', event => {
            const input = event.target.closest('[data-gd-input]');
            if (!input) return;
            if (input.dataset.gdInput === 'claim-filter') {
                state.claimFilter = input.value;
                setHtml(document.querySelector('[data-gd-claim-list]'), claimListHtml());
            } else if (input.dataset.gdInput === 'save-home' && sheet) {
                sheet.data.saveHome = input.checked;
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Enter' && event.target.matches && event.target.matches('[data-gd-input="venue-query"]')) {
                event.preventDefault();
                searchVenues();
            } else if (event.key === 'Escape' && sheet) {
                closeSheet();
            }
        });

        document.addEventListener('submit', event => {
            const form = event.target.closest('[data-gd-form]');
            if (!form) return;
            event.preventDefault();
            if (form.dataset.gdForm === 'game') submitGameForm(form);
            if (form.dataset.gdForm === 'password') joinWithPassword(form);
        });

        window.addEventListener('cricket-group-changed', onGroupChanged);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && Date.now() - state.lastLoadedAt > 20 * 1000) refresh({ silent: true });
        });
    }

    function subscribeNativeEvents() {
        Native.on('notificationAction', handleNotificationAction);
        Native.on('deepLink', event => handleRoute(Core.parseRoute(event.route)));
        Native.on('pushToken', event => uploadPushToken(event.token));
        Native.on('pushReceived', event => {
            if (event.title) toast(event.title);
            refresh({ silent: true });
        });
        Native.on('tripStatus', event => {
            const wasActive = state.tripStatus && state.tripStatus.active;
            state.tripStatus = Object.assign({}, state.tripStatus, event);
            if (event.arrived) toast("🏏 You've arrived! Trip sharing stopped.");
            else if (wasActive && !event.active && event.lastError) toast(`Trip sharing stopped: ${event.lastError}`);
            renderTripSection();
            if (event.arrived || !event.active) refreshTrips();
        });
        Native.on('resume', async () => {
            await refreshTripStatus();
            if (Date.now() - state.lastLoadedAt > 20 * 1000) await refresh({ silent: true });
            syncPushToken(false);
            if (sheet && sheet.type === 'alarm' && sheet.data.needsExactPermission) {
                const permission = await Native.getAlarmPermission().catch(() => ({ permission: 'denied' }));
                if (permission.permission === 'granted') setAlarm(false);
            } else if (sheet && sheet.type === 'alarm' && sheet.data.needsNotificationPermission) {
                const permission = await Native.getAlarmPermission().catch(() => ({ notifications: 'denied' }));
                if (permission.notifications === 'granted') setAlarm(false);
            }
        });
    }

    async function onGroupChanged() {
        const group = currentGroup();
        const previousGroupId = state.groupId;
        if (previousGroupId !== null && group && previousGroupId !== group.id) {
            const previous = readJson(STORAGE.device(previousGroupId), null);
            if (previous && previous.token) {
                fetch(`${apiBase()}/groups/${previousGroupId}/devices/me`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${previous.token}` }
                }).catch(error => console.warn('Could not leave the previous group on the server.', error));
            }
            await clearLocalGameDay(previousGroupId);
        }
        state.groupId = group ? group.id : null;
        state.status = 'loading';
        state.gameDays = [];
        state.device = null;
        if (group && !isGuestGroup(group) && !hasLeftGameDay(group.id)) {
            try {
                await registerDevice();
            } catch (error) {
                console.warn('Game Day registration will retry on the next refresh.', error);
            }
        }
        await refresh();
        syncPushToken(false);
    }

    function startTimers() {
        clearInterval(listTimer);
        listTimer = setInterval(() => {
            if (!document.hidden && !isGuestGroup()) refresh({ silent: true });
        }, LIST_REFRESH_MS);
    }

    function updateTripTimer() {
        clearInterval(tripTimer);
        tripTimer = null;
        const game = selectedGame();
        if (state.pageVisible && game && Core.isTripWindowOpen(game)) {
            tripTimer = setInterval(() => {
                if (!document.hidden) refreshTrips();
            }, TRIP_REFRESH_MS);
        }
    }

    function onPageShown(pageId) {
        state.pageVisible = pageId === 'gameday';
        if (state.pageVisible) {
            render();
            setTimeout(hydrateMaps, 60);
            if (Date.now() - state.lastLoadedAt > 20 * 1000) refresh({ silent: true });
            refreshTrips();
        } else if (pageId === 'home') {
            renderHomeCard();
        }
        updateTripTimer();
    }

    async function init() {
        if (!app()) {
            setTimeout(init, 100);
            return;
        }
        bindEvents();
        subscribeNativeEvents();
        try {
            state.capabilities = Object.assign({}, state.capabilities, await Native.getCapabilities());
        } catch (error) {
            console.warn('Native capabilities are unavailable.', error);
        }
        await refreshTripStatus();
        const group = currentGroup();
        state.groupId = group ? group.id : null;
        initialLoad = refresh();
        await initialLoad;
        syncPushToken(false);
        startTimers();
        try {
            const launch = await Native.consumeLaunchRoute();
            if (launch && launch.route) handleRoute(Core.parseRoute(launch.route));
        } catch (error) {
            console.warn('No launch route was available.', error);
        }
    }

    // Called by the Android shell for the system back gesture. Returns true when the app handled it.
    window.BCCBHandleBack = function () {
        if (sheet) {
            closeSheet();
            return true;
        }
        const active = document.querySelector('.content.active');
        if (active && active.id !== 'home' && typeof window.showPage === 'function') {
            window.showPage('home');
            return true;
        }
        return false;
    };

    window.GameDay = {
        onPageShown,
        refresh: () => refresh(),
        openCreate: () => openGameForm(null),
        nextGame: () => nextGame(),
        tossTarget: () => {
            const upcoming = state.gameDays.filter(game => game.status === 'scheduled'
                && Date.parse(game.startsAt) >= Date.now() - 6 * HOUR_MS
                && Date.parse(game.startsAt) <= Date.now() + 72 * HOUR_MS);
            return upcoming[0] || null;
        },
        api: (path, options) => api(path, options),
        isReady: () => state.status === 'ready'
    };

    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
})();
