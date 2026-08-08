# BCCB Cricket for iOS

This is the native iOS wrapper for BCCB Cricket Manager. It uses Capacitor and packages the shared web application from `../native-android-app/app/src/main/assets`, so Android and iOS use the same analytics and scorecard-import experience.

## Requirements

- Node.js 22 or later
- macOS with Xcode
- An Apple Developer account to install on a physical device or distribute through App Store Connect

## Sync the shared web app

Run this after changing the shared web assets:

```bash
npm install
npm run sync:ios
```

`ios/App/App/public` is generated and intentionally ignored. Do not edit it directly.

## Open and run in Xcode

```bash
npm run open:ios
```

In Xcode, select the **App** target, choose an Apple Developer signing team, then select an iPhone simulator or device. The current release is marketing version `2.1.2`, build `18`, bundle ID `com.cricketmanager.app`.

## Continuous verification

[`.github/workflows/ios-verify.yml`](../.github/workflows/ios-verify.yml) builds an unsigned simulator app on a GitHub-hosted macOS runner after relevant pushes and pull requests. It verifies the native project with Xcode but cannot produce an installable device IPA or App Store archive; those require an Apple Developer certificate and provisioning profile.

## Build a signed IPA from Windows

After pushing this project to GitHub, a Windows user can run [the signed IPA workflow](../.github/workflows/ios-ipa.yml) from the **Actions** tab. Before running it, add these repository Actions secrets:

- `IOS_CERTIFICATE_BASE64`: Base64-encoded Apple Distribution or Development `.p12` certificate.
- `IOS_CERTIFICATE_PASSWORD`: Password for that `.p12` certificate.
- `IOS_PROVISIONING_PROFILE_BASE64`: Base64-encoded `.mobileprovision` profile for `com.cricketmanager.app`.

Supply the matching Apple Developer Team ID and export method when dispatching the workflow. The workflow runs on GitHub's macOS runner and uploads the signed `.ipa` as a workflow artifact. Keep certificates and profiles in GitHub Actions secrets only; never commit them to this repository.

## PDF scorecard imports

In the Analytics tab, the existing PDF upload control opens the standard iOS document picker. The scorecard review and administrator-access checks remain in the shared web application.

## Refresh native artwork

`resources/icon.png` and `resources/splash.png` are the source artwork for the iOS asset catalog. After updating either image, run:

```bash
npm run generate:ios-assets
```
