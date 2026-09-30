#!/usr/bin/env node
/*
 * Verifies that the Android and iOS apps expose the same native capabilities and release versions.
 * The source of truth is tools/native-bridge-contract.json. Run: node tools/check-native-parity.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFileSync(join(root, relativePath), 'utf8');
const contract = JSON.parse(read('tools/native-bridge-contract.json'));

const ANDROID_SRC = 'native-android-app/app/src/main/java/com/cricketmanager/app';
const IOS_SRC = 'native-ios-app/ios/App/App';
const failures = [];
const fail = message => failures.push(message);

function matches(text, pattern) {
    return new Set([...text.matchAll(pattern)].map(match => match[1]));
}

function readAll(directory, extension) {
    return readdirSync(join(root, directory))
        .filter(name => name.endsWith(extension))
        .map(name => read(`${directory}/${name}`))
        .join('\n');
}

function compare(label, expected, actual) {
    for (const name of expected) {
        if (!actual.has(name)) fail(`${label}: missing ${name}`);
    }
    for (const name of actual) {
        if (!expected.has(name)) fail(`${label}: ${name} is not in tools/native-bridge-contract.json`);
    }
}

const methods = Object.entries(contract.methods);
const events = Object.entries(contract.events);
const byPlatform = (entries, platform, kind) => new Set(entries.filter(([, spec]) => spec[platform] === kind).map(([name]) => name));

// Every contract entry must say how each platform provides it.
const allowed = new Set(['native', 'firebase-messaging', 'legacy-sync']);
for (const [name, spec] of [...methods, ...events]) {
    for (const platform of ['android', 'ios']) {
        if (!allowed.has(spec[platform])) fail(`contract: ${name} has no valid "${platform}" implementation`);
    }
}

// Shared JavaScript facade.
const bridgeJs = read('native-android-app/app/src/main/assets/native-bridge.js');
const listIn = name => {
    const block = bridgeJs.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
    return new Set(block ? [...block[1].matchAll(/'([A-Za-z]+)'/g)].map(match => match[1]) : []);
};
compare('native-bridge.js METHODS', new Set(methods.map(([name]) => name)), listIn('METHODS'));
compare('native-bridge.js EVENTS', new Set(events.map(([name]) => name)), listIn('EVENTS'));

// Android.
const nativeBridgeJava = read(`${ANDROID_SRC}/NativeBridge.java`);
const androidJava = readAll(ANDROID_SRC, '.java');
compare('Android NativeBridge.invoke cases', byPlatform(methods, 'android', 'native'), matches(nativeBridgeJava, /case\s+"([A-Za-z]+)":/g));
const androidInterfaceMethods = matches(nativeBridgeJava, /@JavascriptInterface\s+public\s+[\w<>\[\]]+\s+(\w+)\s*\(/g);
for (const name of contract.legacyAndroidSyncMethods) {
    if (!androidInterfaceMethods.has(name)) fail(`Android NativeBridge: missing @JavascriptInterface ${name}()`);
}
if (!androidInterfaceMethods.has('invoke')) fail('Android NativeBridge: missing @JavascriptInterface invoke()');
const androidEvents = matches(androidJava, /emit(?:IfAlive)?\(\s*"([A-Za-z]+)"/g);
for (const name of byPlatform(events, 'android', 'native')) {
    if (!androidEvents.has(name)) fail(`Android: event ${name} is never emitted`);
}

// iOS.
const pluginSwift = read(`${IOS_SRC}/BCCBNativePlugin.swift`);
const iosSwift = readAll(IOS_SRC, '.swift');
const iosMethods = matches(pluginSwift, /CAPPluginMethod\(name:\s*"([A-Za-z]+)"/g);
compare('iOS BCCBNativePlugin.pluginMethods', byPlatform(methods, 'ios', 'native'), iosMethods);
const iosImplementations = matches(pluginSwift, /@objc\s+func\s+(\w+)\(_\s+call:\s+CAPPluginCall\)/g);
for (const name of iosMethods) {
    if (!iosImplementations.has(name)) fail(`iOS BCCBNativePlugin: ${name} is declared but has no @objc func ${name}(_ call:)`);
}
const iosEvents = new Set([
    ...matches(iosSwift, /emit\(\s*"([A-Za-z]+)"/g),
    ...matches(iosSwift, /notifyListeners\(\s*"([A-Za-z]+)"/g)
]);
for (const name of byPlatform(events, 'ios', 'native')) {
    if (!iosEvents.has(name)) fail(`iOS: event ${name} is never emitted`);
}
const iosPackage = JSON.parse(read('native-ios-app/package.json'));
if (!iosPackage.dependencies['@capacitor-firebase/messaging']) {
    fail('iOS: @capacitor-firebase/messaging provides push methods and events but is not a dependency');
}

// Notification actions shared by both platforms.
for (const [identifier, action] of Object.entries(contract.notificationActions)) {
    if (!iosSwift.includes(`"${identifier}"`)) fail(`iOS: notification action ${identifier} is not registered`);
    if (!bridgeJs.includes(`${identifier}: '${action}'`)) fail(`native-bridge.js: ${identifier} is not mapped to ${action}`);
    if (!androidJava.includes(`"${action.replace('rsvp_', '')}"`) && !androidJava.includes(`"${action}"`)) {
        fail(`Android: notification action ${action} is not handled`);
    }
}

// Release versions must match across Android, iOS, and the iOS package.
const gradle = read('native-android-app/app/build.gradle');
const androidVersion = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
const androidBuild = gradle.match(/versionCode\s+(\d+)/)?.[1];
const pbxproj = read('native-ios-app/ios/App/App.xcodeproj/project.pbxproj');
const marketingVersions = matches(pbxproj, /MARKETING_VERSION = ([^;]+);/g);
const buildNumbers = matches(pbxproj, /CURRENT_PROJECT_VERSION = ([^;]+);/g);
if (marketingVersions.size !== 1 || !marketingVersions.has(androidVersion)) {
    fail(`Versions: Android versionName ${androidVersion} but iOS MARKETING_VERSION ${[...marketingVersions].join(', ')}`);
}
if (buildNumbers.size !== 1 || !buildNumbers.has(androidBuild)) {
    fail(`Versions: Android versionCode ${androidBuild} but iOS CURRENT_PROJECT_VERSION ${[...buildNumbers].join(', ')}`);
}
if (iosPackage.version !== androidVersion) {
    fail(`Versions: Android versionName ${androidVersion} but native-ios-app/package.json version ${iosPackage.version}`);
}

// Permissions, background modes, and the shared bccb:// link scheme.
const manifest = read('native-android-app/app/src/main/AndroidManifest.xml');
for (const permission of [
    'POST_NOTIFICATIONS',
    'ACCESS_FINE_LOCATION',
    'FOREGROUND_SERVICE_LOCATION',
    'SCHEDULE_EXACT_ALARM',
    'RECEIVE_BOOT_COMPLETED'
]) {
    if (!manifest.includes(`android.permission.${permission}`)) fail(`AndroidManifest.xml: missing ${permission}`);
}
if (!manifest.includes('android:foregroundServiceType="location"')) fail('AndroidManifest.xml: trip service is not a location foreground service');
if (!manifest.includes('android:scheme="bccb"')) fail('AndroidManifest.xml: bccb:// links are not registered');
const infoPlist = read(`${IOS_SRC}/Info.plist`);
for (const key of ['NSLocationWhenInUseUsageDescription', 'NSAlarmKitUsageDescription', 'CFBundleDocumentTypes', 'ITSAppUsesNonExemptEncryption']) {
    if (!infoPlist.includes(`<key>${key}</key>`)) fail(`Info.plist: missing ${key}`);
}
for (const mode of ['location', 'remote-notification']) {
    if (!new RegExp(`<key>UIBackgroundModes</key>\\s*<array>[\\s\\S]*?<string>${mode}</string>[\\s\\S]*?</array>`).test(infoPlist)) {
        fail(`Info.plist: UIBackgroundModes is missing ${mode}`);
    }
}
if (!/<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>bccb<\/string>/.test(infoPlist)) fail('Info.plist: bccb:// links are not registered');
const entitlements = read(`${IOS_SRC}/App.entitlements`);
if (!entitlements.includes('<key>aps-environment</key>')) fail('App.entitlements: push notifications are not enabled');

if (failures.length > 0) {
    console.error(`Native parity check failed (${failures.length}):`);
    failures.forEach(message => console.error(`  ✗ ${message}`));
    process.exit(1);
}
console.log(`Native parity check passed: ${methods.length} methods, ${events.length} events, version ${androidVersion} (${androidBuild}) on Android and iOS.`);
