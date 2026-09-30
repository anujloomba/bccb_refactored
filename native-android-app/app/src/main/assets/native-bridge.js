/*
 * BCCB native bridge.
 *
 * One asynchronous API for the shared web app, backed by:
 *   - Android: window.AndroidInterface.invoke(method, argsJson, callbackId) in the Java WebView shell,
 *   - iOS:     Capacitor.Plugins.BCCBNative (local Swift plugin) and Capacitor.Plugins.FirebaseMessaging,
 *   - Browser: web fallbacks so the UI can be developed and tested without a device.
 *
 * Method and event names are defined in tools/native-bridge-contract.json.
 */
(function () {
    'use strict';

    const METHODS = [
        'getCapabilities',
        'setSession',
        'clearSession',
        'getPushToken',
        'requestPushPermission',
        'getLocationPermission',
        'requestLocationPermission',
        'getCurrentPosition',
        'getAlarmPermission',
        'requestAlarmPermission',
        'scheduleGameAlarm',
        'cancelGameAlarm',
        'getScheduledAlarms',
        'startTrip',
        'stopTrip',
        'getTripStatus',
        'consumeSharedFile',
        'consumeLaunchRoute',
        'openSettings',
        'openExternalUrl'
    ];
    const EVENTS = ['pushToken', 'pushReceived', 'notificationAction', 'tripStatus', 'sharedFile', 'deepLink', 'resume'];
    // Events that arrive before the app subscribes (for example a notification tap that launched the app) are replayed.
    const STICKY_EVENTS = new Set(['notificationAction', 'sharedFile', 'deepLink']);
    const IOS_ACTIONS = {
        tap: 'open',
        'com.apple.UNNotificationDefaultActionIdentifier': 'open',
        RSVP_YES: 'rsvp_yes',
        RSVP_MAYBE: 'rsvp_maybe',
        RSVP_NO: 'rsvp_no',
        START_TRIP: 'start_trip'
    };
    const MAX_SHARED_FILE_BYTES = 10 * 1024 * 1024;

    const listeners = new Map();
    const bufferedEvents = new Map();
    const pendingCalls = new Map();
    let nextCallbackId = 1;

    const androidInterface = window.AndroidInterface && typeof window.AndroidInterface.invoke === 'function'
        ? window.AndroidInterface
        : null;
    const capacitor = window.Capacitor;
    const isIos = !androidInterface
        && Boolean(capacitor && typeof capacitor.getPlatform === 'function' && capacitor.getPlatform() === 'ios');
    const platform = androidInterface ? 'android' : (isIos ? 'ios' : 'web');

    function unsupported(message) {
        return Object.assign(new Error(message), { code: 'unsupported' });
    }

    function emit(event, data) {
        const handlers = listeners.get(event);
        if (!handlers || handlers.size === 0) {
            if (STICKY_EVENTS.has(event)) {
                const queue = bufferedEvents.get(event) || [];
                queue.push(data);
                bufferedEvents.set(event, queue.slice(-10));
            }
            return;
        }
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`BCCBNative ${event} handler failed`, error);
            }
        });
    }

    function on(event, handler) {
        if (!EVENTS.includes(event)) throw new Error(`Unknown native event: ${event}`);
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(handler);
        const queued = bufferedEvents.get(event);
        if (queued) {
            bufferedEvents.delete(event);
            queued.forEach(data => setTimeout(() => handler(data), 0));
        }
        return () => listeners.get(event)?.delete(handler);
    }

    function parsePayload(payload) {
        if (!payload) return {};
        if (typeof payload === 'object') return payload;
        try {
            return JSON.parse(payload);
        } catch (error) {
            console.warn('BCCBNative received an unreadable payload', error);
            return {};
        }
    }

    // The Android shell completes calls and delivers events through these globals.
    window.__bccbNativeResolve = function (callbackId, ok, payloadJson) {
        const pending = pendingCalls.get(String(callbackId));
        if (!pending) return;
        pendingCalls.delete(String(callbackId));
        const payload = parsePayload(payloadJson);
        if (ok) {
            pending.resolve(payload);
        } else {
            pending.reject(Object.assign(new Error(payload.message || 'The native call failed.'), {
                code: payload.code || 'native_error'
            }));
        }
    };

    window.__bccbNativeEmit = function (event, payloadJson) {
        emit(event, parsePayload(payloadJson));
    };

    function androidCall(method, args) {
        return new Promise((resolve, reject) => {
            const callbackId = String(nextCallbackId++);
            pendingCalls.set(callbackId, { resolve, reject });
            try {
                androidInterface.invoke(method, JSON.stringify(args || {}), callbackId);
            } catch (error) {
                pendingCalls.delete(callbackId);
                reject(error);
            }
        });
    }

    // Android keeps its original chunked, synchronous shared-PDF bridge so large files never cross evaluateJavascript.
    async function androidConsumeSharedFile() {
        const bridge = window.AndroidInterface;
        if (!bridge || typeof bridge.prepareSharedScorecard !== 'function') return { file: null };

        const preparationError = bridge.prepareSharedScorecard();
        if (preparationError === 'No shared PDF is available.') return { file: null };
        if (preparationError) throw new Error(preparationError);

        try {
            const fileSize = Number(bridge.getSharedScorecardSize());
            const chunkCount = Number(bridge.getSharedScorecardChunkCount());
            if (
                !Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_SHARED_FILE_BYTES
                || !Number.isInteger(chunkCount) || chunkCount <= 0
            ) {
                throw new Error('The shared PDF data is invalid.');
            }

            const bytes = new Uint8Array(fileSize);
            let offset = 0;
            for (let index = 0; index < chunkCount; index++) {
                const encodedChunk = bridge.getSharedScorecardChunk(index);
                if (!encodedChunk) throw new Error('The shared PDF data is incomplete.');
                const decodedChunk = atob(encodedChunk);
                if (offset + decodedChunk.length > bytes.length) throw new Error('The shared PDF data is invalid.');
                for (let byteIndex = 0; byteIndex < decodedChunk.length; byteIndex++) {
                    bytes[offset + byteIndex] = decodedChunk.charCodeAt(byteIndex);
                }
                offset += decodedChunk.length;
            }
            if (offset !== bytes.length) throw new Error('The shared PDF data is incomplete.');

            const fileName = bridge.getSharedScorecardName() || 'shared-scorecard.pdf';
            return { file: new File([bytes], fileName, { type: 'application/pdf' }) };
        } finally {
            if (typeof bridge.clearSharedScorecard === 'function') bridge.clearSharedScorecard();
        }
    }

    const pluginCache = {};

    function capacitorPlugin(name) {
        if (!capacitor) return null;
        if (!pluginCache[name]) {
            if (capacitor.Plugins && capacitor.Plugins[name]) {
                pluginCache[name] = capacitor.Plugins[name];
            } else if (typeof capacitor.registerPlugin === 'function') {
                pluginCache[name] = capacitor.registerPlugin(name);
            }
        }
        return pluginCache[name] || null;
    }

    function iosPlugin() {
        return capacitorPlugin('BCCBNative');
    }

    function firebaseMessaging() {
        return capacitorPlugin('FirebaseMessaging');
    }

    function normalizePush(notification) {
        const data = (notification && typeof notification.data === 'object' && notification.data) || {};
        return {
            type: data.type || null,
            groupId: data.groupId ? Number(data.groupId) : null,
            gameDayId: data.gameDayId || null,
            route: data.route || null,
            title: (notification && notification.title) || data.title || '',
            body: (notification && notification.body) || data.body || ''
        };
    }

    function permissionFromState(state) {
        if (state === 'granted') return 'granted';
        if (state === 'denied') return 'denied';
        return 'prompt';
    }

    async function iosPushPermission(requestIfNeeded) {
        const messaging = firebaseMessaging();
        if (!messaging) return { permission: 'denied', token: null };
        let status = await messaging.checkPermissions();
        if (requestIfNeeded && permissionFromState(status.receive) === 'prompt') {
            status = await messaging.requestPermissions();
        }
        const permission = permissionFromState(status.receive);
        let token = null;
        if (permission === 'granted') {
            try {
                token = (await messaging.getToken()).token || null;
            } catch (error) {
                console.warn('The Firebase push token is not available yet.', error);
            }
        }
        return { permission, token };
    }

    async function iosConsumeSharedFile() {
        const result = await iosPlugin().consumeSharedFile();
        if (!result || !result.path) return { file: null };
        const response = await fetch(capacitor.convertFileSrc(result.path));
        if (!response.ok) throw new Error('The shared PDF could not be read.');
        const blob = await response.blob();
        if (blob.size > MAX_SHARED_FILE_BYTES) throw new Error('Shared scorecard PDFs must be 10 MB or smaller.');
        return {
            file: new File([blob], result.name || 'shared-scorecard.pdf', {
                type: result.mimeType || blob.type || 'application/pdf'
            })
        };
    }

    async function iosCall(method, args) {
        if (method === 'getPushToken') return iosPushPermission(false);
        if (method === 'requestPushPermission') return iosPushPermission(true);
        const plugin = iosPlugin();
        if (!plugin || typeof plugin[method] !== 'function') {
            throw unsupported(`${method} is not available in this version of the app.`);
        }
        if (method === 'consumeSharedFile') return iosConsumeSharedFile();
        return plugin[method](args || {});
    }

    function setUpIosEvents() {
        const plugin = iosPlugin();
        if (plugin && typeof plugin.addListener === 'function') {
            ['notificationAction', 'tripStatus', 'sharedFile', 'deepLink', 'resume'].forEach(event => {
                plugin.addListener(event, data => emit(event, data || {}));
            });
        }
        const messaging = firebaseMessaging();
        if (messaging && typeof messaging.addListener === 'function') {
            messaging.addListener('tokenReceived', event => emit('pushToken', { token: event.token }));
            messaging.addListener('notificationReceived', event => emit('pushReceived', normalizePush(event.notification)));
            messaging.addListener('notificationActionPerformed', event => {
                const actionId = event.actionId || 'tap';
                emit('notificationAction', {
                    action: IOS_ACTIONS[actionId] || String(actionId).toLowerCase(),
                    ...normalizePush(event.notification)
                });
            });
        }
    }

    function webPosition(args) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(unsupported('Location is not available in this browser.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                }),
                error => reject(Object.assign(new Error(error.message || 'Location is unavailable.'), {
                    code: error.code === 1 ? 'permission_denied' : 'position_unavailable'
                })),
                { enableHighAccuracy: true, timeout: (args && args.timeoutMs) || 15000, maximumAge: 60000 }
            );
        });
    }

    const webImplementation = {
        async getCapabilities() {
            return { platform: 'web', appVersion: null, push: false, alarms: 'none', backgroundLocation: false, sharedFiles: false };
        },
        async setSession() { return {}; },
        async clearSession() { return {}; },
        async getPushToken() { return { token: null, permission: 'denied' }; },
        async requestPushPermission() { return { token: null, permission: 'denied' }; },
        async getLocationPermission() {
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const status = await navigator.permissions.query({ name: 'geolocation' });
                    return { permission: permissionFromState(status.state) };
                } catch (error) {
                    console.warn('Location permission state is unavailable.', error);
                }
            }
            return { permission: 'prompt' };
        },
        async requestLocationPermission() {
            try {
                await webPosition({ timeoutMs: 15000 });
                return { permission: 'granted' };
            } catch (error) {
                return { permission: error.code === 'permission_denied' ? 'denied' : 'prompt' };
            }
        },
        getCurrentPosition: webPosition,
        async getAlarmPermission() { return { permission: 'unsupported', mode: 'none' }; },
        async requestAlarmPermission() { return { permission: 'unsupported', mode: 'none' }; },
        async scheduleGameAlarm() { throw unsupported('Game-day alarms need the BCCB Cricket app on Android or iPhone.'); },
        async cancelGameAlarm() { return { cancelled: false }; },
        async getScheduledAlarms() { return { alarms: [] }; },
        async startTrip() { throw unsupported('Live trips need the BCCB Cricket app on Android or iPhone.'); },
        async stopTrip() { return { stopped: true }; },
        async getTripStatus() { return { active: false }; },
        async consumeSharedFile() { return { file: null }; },
        async consumeLaunchRoute() {
            return { route: new URLSearchParams(window.location.search).get('route') };
        },
        async openSettings() { return {}; },
        async openExternalUrl(args) {
            window.open(args.url, '_blank', 'noopener');
            return {};
        }
    };

    function call(method, args) {
        if (!METHODS.includes(method)) return Promise.reject(new Error(`Unknown native method: ${method}`));
        if (platform === 'android') {
            return method === 'consumeSharedFile' ? androidConsumeSharedFile() : androidCall(method, args);
        }
        if (platform === 'ios') return iosCall(method, args);
        return webImplementation[method](args || {});
    }

    const api = {
        platform,
        isNative: platform !== 'web',
        methods: METHODS.slice(),
        events: EVENTS.slice(),
        call,
        on
    };
    METHODS.forEach(method => {
        api[method] = args => call(method, args);
    });
    window.BCCBNative = api;

    if (platform === 'ios') {
        setUpIosEvents();
    } else if (platform === 'web') {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) emit('resume', {});
        });
    }
})();
