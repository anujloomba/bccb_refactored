# BCCB Cricket Manager

BCCB Cricket Manager is a cricket group app for Android and iPhone. It organises game days (invites, In / Maybe / Out replies, smart wake-up alarms, and a live map of who is on the way), balances teams and runs the toss, imports completed PDF scorecards, and stores player, match, and captaincy statistics in Cloudflare D1.

## Game Day

1. A group administrator schedules a game: date, start time, reach-by time, venue, and notes.
2. Every signed-in phone in the group gets a push invite with **In**, **Maybe**, and **Out** buttons. Players link their phone to their roster name once; everyone sees the live counts and who has replied.
3. At 7 PM (venue time) the evening before, players who are in get a reminder. One tap works out the recommended alarm from their current location:

   `alarm = reach-by time − driving time − getting-ready time` (45 minutes by default, adjustable)

   Driving time comes from OpenRouteService, with a distance-based estimate as a fallback. Android sets an exact alarm-clock alarm (or hands off to the Clock app). iOS 26+ sets an AlarmKit system alarm, and earlier iOS versions use an alarm-tone notification. A time-to-leave nudge follows.
4. On the day, players tap **Start trip**. The group sees them move on the Game Day map with an ETA until they arrive (within 150 m of the venue), stop, or an hour after the start. Only the latest position is kept, and it is deleted after the game.

Administrators can edit or cancel a game (which removes players' alarms) and nudge players who have not replied.

## The toss

Once teams are saved or confirmed on the Teams tab, flip the coin: it shows each captain's initials, and the winner chooses to bat or bowl. The result is saved for the group. When an administrator runs the toss, it is shared with everyone on Game Day and the Home screen.

## Scorecard workflow

1. Open Analytics and select a completed PDF scorecard, or share a PDF to the app ("Share" on Android, "Open in BCCB Cricket" on iPhone).
2. Review every scorecard name against the roster.
   - Fuzzy suggestions appear first.
   - Every other roster player remains available in the same dropdown.
   - Add a missing player inline when needed.
   - Ignore an accidental non-captain PDF entry when it should not affect analytics.
3. Confirm the associations.
4. View player, team, match-history, and captaincy analytics.

Captains are derived from the PDF title and must be among the confirmed player associations. Re-importing the same scorecard is detected before review and never creates duplicate records.

Bowling average is calculated across all imported performances as total runs conceded divided by total wickets taken.

## KPI logic

All player KPIs aggregate the confirmed, non-ignored performance rows from every imported scorecard associated with that roster player.

| KPI | Calculation |
| --- | --- |
| Matches | Unique imported matches containing the player. |
| Total runs / wickets | Sum of runs scored / wickets taken. |
| Average runs per game | Total runs divided by batting innings (an innings with runs or balls faced). |
| Batting strike rate | `(total runs / total balls faced) * 100`. |
| Overs bowled | `total balls bowled / 6`. |
| Economy | `total runs conceded / (total balls bowled / 6)`. |
| Bowling strike rate | `total balls bowled / total wickets`. |
| Bowling average | `total runs conceded / total wickets`. |
| 4s and 6s per match | Total 4s or 6s divided by batting innings. |
| Number of 50s | Imported batting innings with at least 50 runs. |

The Captaincy tab uses confirmed title captains. Games played, wins, and losses are counted from their teams' imported matches; win rate is `round((wins / games played) * 100)`. Most MOM Performer is the team member with the most Man of the Match awards while playing under that captain. Favorite Batsman is the largest positive uplift in batting average under that captain versus career batting average. Favorite Bowler is the largest positive reduction in bowling average under that captain versus career bowling average.

For team balancing, players with at least four matches use their imported totals. Players with one to three matches blend each observed metric with the established role-cohort baseline using `matches / 4` as the confidence weight; unobserved batting or bowling disciplines use the baseline, and players with no matches use the baseline entirely. The normalized team score is `0.4 * runs-per-match score + 0.3 * bowling-average score + 0.2 * economy score + 0.1 * batting-strike-rate score`; lower bowling average and economy produce higher normalized scores. The draft balances star players first, then separates established players (at least four matches) from developing players (fewer than four) as evenly as possible across the two teams, including the captains. It then balances Fast bowlers and Reliable batters before using team size and score as tie-breakers. Reshuffling keeps captains fixed and exchanges one or two eligible non-captains only when the same balance targets and a bounded team-strength difference are retained.

## Components

- `cricket-worker/cricket-api/`: Cloudflare Worker API (groups, scorecards, and Game Day), the push sender, the reminder cron, and the scorecard parser.
- `DB/`: canonical D1 schema and migrations.
- `native-android-app/`: Android WebView application. `app/src/main/assets` holds the shared web interface used by both platforms.
- `native-ios-app/`: Capacitor-based iOS application that packages the same web interface.
- `tools/native-bridge-contract.json`: every native capability the web app uses, with how Android and iOS each provide it. `tools/check-native-parity.mjs` fails when the platforms drift.
- `tests/web/`: tests for the Game Day logic (alarm maths, time zones, tallies, and toss helpers).

### Keeping Android and iOS in sync

Both apps load the same web assets, so every screen, the toss, and Game Day behave identically. Native features (push, alarms, location, trips, shared files, and links) go through one JavaScript facade, `window.BCCBNative` (`native-bridge.js`). Android implements it in `NativeBridge.java`; iOS implements it in `BCCBNativePlugin.swift` plus `@capacitor-firebase/messaging`. When you add a native capability:

1. Add it to `tools/native-bridge-contract.json` and `native-bridge.js`.
2. Implement it on both platforms.
3. Run `node tools/check-native-parity.mjs`. CI runs this check too, along with version matching (`versionName`/`versionCode` must equal the iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`).

## Local development

### Checks

```powershell
node tools/check-native-parity.mjs
node --test "tests/web/*.test.mjs"
```

### Worker

```powershell
Set-Location cricket-worker\cricket-api
npm install
npm test
npx wrangler dev
```

### Android

```powershell
Set-Location native-android-app
.\gradlew.bat assembleDebug
```

The debug APK is written to `app\build\outputs\apk\debug\app-debug.apk`. Push notifications are enabled when `app\google-services.json` (from Firebase) is present. Builds without it still work; push is simply unavailable.

### iOS

The iOS project uses the Android wrapper's existing web assets as its single source of truth. It requires macOS and Xcode 26 or later (for AlarmKit) to build or publish:

```bash
cd native-ios-app
npm install
npm run sync:ios
npm run open:ios
```

Open the generated `ios/App/App.xcodeproj` in Xcode, select an Apple Developer signing team, then run on a simulator or device. Put `GoogleService-Info.plist` from Firebase in `ios/App/App/` to enable push; a build phase copies it into the app when present. PDF scorecards are selected through the standard iOS document picker in the Analytics import flow, or opened into the app from Files or Mail. See `native-ios-app/README.md` for the App Store release checklist.

## Documentation

- `DEPLOYMENT.md`: Worker, D1, Firebase, OpenRouteService, Android, iOS, and store-release instructions.
- `native-ios-app/README.md`: iOS build and App Store hand-off checklist.
- `PRIVACY_POLICY.md` / `privacy-policy.html`: privacy policy for both stores.
- `CHANGELOG.md`: version history.
