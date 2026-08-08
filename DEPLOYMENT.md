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

5. Validate and deploy.

   ```powershell
   npm test
   npx tsc --noEmit
   npx wrangler deploy
   curl.exe https://YOUR_WORKER.workers.dev/health
   ```

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

Before publishing, increment `versionCode` and `versionName` in `native-android-app\app\build.gradle`, test the release build on a device, supply the required store listing assets, and publish the privacy-policy URL.

## iOS build and App Store release

The iOS application packages the same bundled web assets as Android. It must be built on macOS with Xcode and an Apple Developer account.

```bash
cd native-ios-app
npm install
npm run sync:ios
npm run open:ios
```

In Xcode, open `ios/App/App.xcodeproj`, select the **App** target, choose the Apple Developer signing team, and archive the Release configuration for upload through Xcode Organizer or Transporter. The current iOS marketing version is `2.1.2` and the build number is `18`; increment both before each App Store upload.

PDF scorecards can be selected from the iOS document picker in the Analytics import workflow. The app bundles the frontend offline, so no separately hosted iOS web build is needed.

### GitHub-hosted iOS verification

The [iOS verification workflow](.github/workflows/ios-verify.yml) runs `xcodebuild` on a GitHub-hosted macOS runner and uploads an unsigned simulator app artifact. It is intentionally not an installable IPA or App Store upload: those require a valid Apple Developer signing certificate and provisioning profile, which should be configured only in a protected release workflow or Xcode keychain.

### Build a signed IPA from Windows

The manual [signed IPA workflow](.github/workflows/ios-ipa.yml) uses GitHub's macOS runner, so it can be triggered from Windows after the branch is pushed. Add these repository Actions secrets before dispatching it:

| Secret | Value |
| --- | --- |
| `IOS_CERTIFICATE_BASE64` | Base64-encoded Apple Development or Distribution `.p12` certificate. |
| `IOS_CERTIFICATE_PASSWORD` | Password for the `.p12` certificate. |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded provisioning profile for `com.cricketmanager.app`. |

In **Actions**, select **Build signed iOS IPA**, enter the matching Apple Developer Team ID, choose the export method, and run the workflow. Download the resulting `.ipa` from the workflow artifact. For TestFlight/App Store submission, use an `app-store-connect` profile and upload the archive through your established App Store Connect release process.
