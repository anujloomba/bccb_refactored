# Deployment

## Cloudflare Worker and D1

1. Install dependencies and authenticate with Cloudflare.

   ```powershell
   Set-Location cricket-worker\cricket-api
   npm install
   npx wrangler login
   ```

2. Configure the D1 database binding in `wrangler.jsonc`.

3. Initialize a new database with the canonical schema.

   ```powershell
   npx wrangler d1 execute cricket_mgr --file=..\..\DB\schema.sql
   ```

4. Apply migrations in `DB\migrations` in filename order. Existing databases that predate scorecard imports need:

   ```powershell
   npx wrangler d1 execute cricket_mgr --remote --file=..\..\DB\migrations\20260214_add_scorecard_import_fingerprint.sql
   npx wrangler d1 execute cricket_mgr --remote --file=..\..\DB\migrations\20260808_add_group_admin_password.sql
   ```

   Game Day (version 2.2.0) adds devices, game days, replies, tosses, and live trips. The migration only creates new tables and is safe to run more than once:

   ```powershell
   npx wrangler d1 execute cricket_mgr --remote --file=..\..\DB\migrations\20261001_add_game_day.sql
   ```

5. Add the Game Day secrets. Game Day works without them, but push notifications and road-based travel times need them (see [Firebase](#firebase-push-notifications) and [OpenRouteService](#openrouteservice-travel-times) below):

   ```powershell
   Get-Content C:\path\to\firebase-service-account.json -Raw | npx wrangler secret put FCM_SERVICE_ACCOUNT_JSON
   npx wrangler secret put ORS_API_KEY
   npx wrangler secret put NOMINATIM_EMAIL   # optional contact address sent with venue searches
   ```

   Without `FCM_SERVICE_ACCOUNT_JSON`, no pushes are sent. Without `ORS_API_KEY`, travel times fall back to a straight-line estimate.

6. Validate and deploy. `wrangler.jsonc` also deploys the Game Day cron trigger (`*/15 * * * *`), which sends the evening-before reminders and deletes finished trips.

   ```powershell
   npm test
   npx tsc --noEmit
   npx wrangler deploy
   curl.exe https://YOUR_WORKER.workers.dev/health
   ```

   Deploy the Worker (and run the migration) **before** releasing app version 2.2.0: the new apps call the Game Day routes.

## Firebase push notifications

Game Day invites, changes, cancellations, reminders, and nudges are delivered through Firebase Cloud Messaging (FCM), which also relays to Apple's push service for iPhones.

1. Create a Firebase project at <https://console.firebase.google.com/>.
2. **Android:** add an Android app with package name `com.cricketmanager.app`, download `google-services.json`, and save it as `native-android-app\app\google-services.json`. Gradle applies the Google services plugin only when this file exists. The file is ignored by Git; keep it out of commits.
3. **iOS:** add an Apple app with bundle ID `com.cricketmanager.app` and download `GoogleService-Info.plist`. For local Xcode builds, put it in `native-ios-app/ios/App/App/`, where a build phase copies it into the app. For the GitHub IPA workflow, store it as the `IOS_GOOGLE_SERVICE_INFO_PLIST_BASE64` secret (see below). It is also ignored by Git.
4. **Apple push key:** in the Apple Developer account, go to **Certificates, Identifiers & Profiles → Keys**, create a key with **Apple Push Notifications service (APNs)**, and download the `.p8` file. Note the Key ID and Team ID. In Firebase, open **Project settings → Cloud Messaging → Apple app configuration** and upload the `.p8` key.
5. **Worker credentials:** in Firebase, open **Project settings → Service accounts → Generate new private key**. Store the downloaded JSON as the Worker secret `FCM_SERVICE_ACCOUNT_JSON` (command above), then delete the local copy.

## OpenRouteService travel times

Sign up for a free key at <https://openrouteservice.org/dev/#/signup> (the standard plan allows 2,000 route requests a day) and store it with `npx wrangler secret put ORS_API_KEY`. The Worker caches routes and limits each device to 40 travel-time requests an hour. Venue search uses OpenStreetMap Nominatim through the Worker, and the maps use OpenFreeMap tiles. Neither needs a key.

## Android debug build

```powershell
Set-Location native-android-app
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

The app registers as a share target for `application/pdf`. After installation, share a PDF to **Cricket Manager** to open the scorecard review flow directly.

## Android release build

Create `native-android-app\keystore.properties` locally. This file is intentionally ignored by Git.

```properties
storeFile=cricket-manager-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=cricket-manager
keyPassword=YOUR_KEY_PASSWORD
```

Generate the keystore once if needed:

```powershell
Set-Location native-android-app
keytool -genkey -v -keystore cricket-manager-release.keystore -alias cricket-manager -keyalg RSA -keysize 2048 -validity 10000
```

Build the signed Android App Bundle for Play Console:

```powershell
.\gradlew.bat bundleRelease
```

The bundle is written to `app\build\outputs\bundle\release\app-release.aab`.

Before publishing, increment `versionCode` and `versionName` in `native-android-app\app\build.gradle` (and the iOS `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` to the same values; CI enforces this), test the release build on a device, supply the required store listing assets, and publish the privacy-policy URL.

### Play Console declarations for version 2.2.0

- **Target API level:** the app targets API 36, which Google Play requires for updates from 31 August 2026.
- **Foreground service permissions:** declare the `location` foreground service type. Describe it as "Shares the player's live location with their cricket group while they travel to a game, after they tap Start trip; stops on arrival". Record and attach a short video that shows Start trip, the ongoing notification, and Stop.
- **Location permissions:** the app requests only foreground (while-in-use) location, so no background-location declaration is needed.
- **Exact alarms:** the app requests `SCHEDULE_EXACT_ALARM` (granted by the user under *Alarms & reminders*) for the user-set game-day wake-up alarm. It does not use `USE_EXACT_ALARM` or full-screen intents.
- **Data safety:** declare precise location (app functionality, shared with group members, not used for tracking), device or other IDs (device registration and push token), name (roster name), and other user-generated content (game replies). Data is encrypted in transit, and users can request deletion ("Leave Game Day on this device").
- **Privacy policy URL:** `https://anujloomba.github.io/bccb_refactored/privacy-policy.html`. GitHub Pages publishes `privacy-policy.html` from `main`, so the 2.2.0 policy goes live when this release is merged.

## iOS build and App Store release

The iOS application packages the same bundled web assets as Android. It must be built on macOS with Xcode 26 or later (AlarmKit) and an Apple Developer account. The step-by-step hand-off checklist for whoever publishes the iOS app is in [`native-ios-app/README.md`](native-ios-app/README.md).

```bash
cd native-ios-app
npm install
npm run sync:ios
npm run open:ios
```

In Xcode, open `ios/App/App.xcodeproj`, select the **App** target, choose the Apple Developer signing team, and archive the Release configuration for upload through Xcode Organizer or Transporter. The current iOS marketing version is `2.2.0` and the build number is `19`, matching Android `versionName` and `versionCode`. Increment both platforms together before each store upload.

The App ID needs the **Push Notifications** capability (the app's entitlements request `aps-environment`). Background location and remote notifications are declared in `Info.plist` as background modes, and no extra capability is needed for AlarmKit.

PDF scorecards can be selected from the iOS document picker in the Analytics import workflow, or opened into the app from Files, Mail, or other apps. The app bundles the frontend offline, so no separately hosted iOS web build is needed.

### GitHub-hosted iOS verification

The [iOS verification workflow](.github/workflows/ios-verify.yml) runs on a GitHub-hosted `macos-26` runner. It checks Android and iOS parity, runs `cap sync`, builds an unsigned simulator app, launches it, and uploads screenshots of Home, Game Day, Teams, and Settings along with the simulator app. It is intentionally not an installable IPA or App Store upload: those require a valid Apple Developer signing certificate and provisioning profile, which should be configured only in a protected release workflow or Xcode keychain.

### Build a signed IPA from Windows

The manual [signed IPA workflow](.github/workflows/ios-ipa.yml) uses GitHub's macOS runner, so it can be triggered from Windows after the branch is pushed. Add these repository Actions secrets before dispatching it:

| Secret | Value |
| --- | --- |
| `IOS_CERTIFICATE_BASE64` | Base64-encoded Apple Development or Distribution `.p12` certificate. |
| `IOS_CERTIFICATE_PASSWORD` | Password for the `.p12` certificate. |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded provisioning profile for `com.cricketmanager.app`, created **after** Push Notifications was enabled on the App ID. |
| `IOS_GOOGLE_SERVICE_INFO_PLIST_BASE64` | Base64-encoded `GoogleService-Info.plist` from Firebase. Optional, but without it the IPA receives no push notifications. |

In **Actions**, select **Build signed iOS IPA**, enter the matching Apple Developer Team ID, choose the export method, and run the workflow. Download the resulting `.ipa` from the workflow artifact. For TestFlight/App Store submission, use an `app-store-connect` profile and upload the archive through your established App Store Connect release process.

#### Create Apple signing files from Windows

You need an active [Apple Developer Program](https://developer.apple.com/programs/enroll/) membership. In the Apple Developer account:

1. In **Certificates, Identifiers & Profiles**, create an explicit App ID with the bundle identifier `com.cricketmanager.app` and enable the **Push Notifications** capability.
2. Create an **Apple Distribution** certificate. A certificate signing request can be generated on Windows with OpenSSL:

   ```powershell
   openssl req -new -newkey rsa:2048 -nodes `
     -keyout ios-distribution.key `
     -out ios-distribution.csr `
     -subj "/emailAddress=YOUR_APPLE_ID_EMAIL/CN=YOUR_NAME/C=YOUR_TWO_LETTER_COUNTRY_CODE"
   ```

   Upload `ios-distribution.csr` to Apple, then download the issued `.cer` certificate. Keep `ios-distribution.key` private; it is required to export the matching certificate.
3. Export a password-protected `.p12` certificate on Windows:

   ```powershell
   openssl x509 -inform DER -in ios-distribution.cer -out ios-distribution.pem
   openssl pkcs12 -export `
     -out ios-distribution.p12 `
     -inkey ios-distribution.key `
     -in ios-distribution.pem `
     -name "Apple Distribution"
   ```

   OpenSSL will ask for a password. This is the value for `IOS_CERTIFICATE_PASSWORD`.
4. Create an App Store Connect distribution provisioning profile for `com.cricketmanager.app`, selecting the Apple Distribution certificate above, then download the resulting `.mobileprovision` file.
5. Find the Apple Developer **Team ID** under the account's Membership details.
6. In GitHub repository **Settings → Secrets and variables → Actions**, add these secrets without committing their values:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\ios-distribution.p12")) | Set-Clipboard
   ```

   Paste the clipboard value into `IOS_CERTIFICATE_BASE64`, then paste the `.p12` password into `IOS_CERTIFICATE_PASSWORD`.

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\BCCB-AppStore.mobileprovision")) | Set-Clipboard
   ```

   Paste that value into `IOS_PROVISIONING_PROFILE_BASE64`.

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\GoogleService-Info.plist")) | Set-Clipboard
   ```

   Paste that value into `IOS_GOOGLE_SERVICE_INFO_PLIST_BASE64`.

Do not upload the `.key`, `.p12`, `.cer`, `.p8`, or `.mobileprovision` files to Git, and do not paste their contents into chat. After the secrets are configured, run **Build signed iOS IPA** with the Team ID and `app-store-connect` export method.

### App Store Connect answers for version 2.2.0

- **App Privacy:** Precise Location, Device ID, Name, and Other User Content are collected for App Functionality, linked to the user, and not used for tracking. This matches `ios/App/App/PrivacyInfo.xcprivacy`.
- **Export compliance:** `ITSAppUsesNonExemptEncryption` is `NO` (the app uses only standard HTTPS).
- **Review notes (background location):** "Location is used only when the player asks for a game-day alarm recommendation or taps *Start trip* on the Game Day tab. While a trip is shared, the blue location indicator is shown, and sharing stops automatically on arrival at the venue, when the player taps Stop, or one hour after the game starts. Location is shared only with members of the player's own cricket group." Provide a demo group name and password so the reviewer can sign in.
- **Review notes (alarms):** "Game-day alarms are set only by the player, from the recommended time on the Game Day tab, using AlarmKit."
