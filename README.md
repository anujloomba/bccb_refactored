# BCCB Cricket Manager

BCCB Cricket Manager is an Android-first cricket analytics application. It imports completed PDF scorecards, associates every scorecard name with the roster, and stores aggregated player, match, and captaincy statistics in Cloudflare D1.

## Primary workflow

1. Open Analytics and select a completed PDF scorecard, or share a PDF to the Android app.
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

- `cricket-worker/cricket-api/`: Cloudflare Worker API and scorecard parser.
- `DB/`: canonical D1 schema and the scorecard-fingerprint migration.
- `native-android-app/`: Android WebView application and bundled web interface.
- `native-ios-app/`: Capacitor-based iOS application that packages the same web interface.

## Local development

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

The debug APK is written to `app\build\outputs\apk\debug\app-debug.apk`.

### iOS

The iOS project uses the Android wrapper's existing web assets as its single source of truth. It requires macOS and Xcode to build or publish:

```bash
cd native-ios-app
npm install
npm run sync:ios
npm run open:ios
```

Open the generated `ios/App/App.xcodeproj` in Xcode, select an Apple Developer signing team, then run on a simulator or device. PDF scorecards are selected through the standard iOS document picker in the Analytics import flow.

## Documentation

- `DEPLOYMENT.md`: Worker, D1, Android, iOS, and release-build instructions.
- `PRIVACY_POLICY.md`: privacy policy content for distribution.
- `CHANGELOG.md`: version history.
