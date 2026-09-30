# Changelog

All notable changes to BCCB Cricket Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - Unreleased

### Added
- **The toss is back.** Confirmed or saved teams show an animated coin with each captain's initials. The winning captain chooses to bat or bowl. The result is saved per group, and administrators share it with everyone on Game Day and the Home screen.
- **Game Day.** Administrators schedule a game with its date, start time, reach-by time, venue (search, tap to drop a pin, or use the current location), and notes, then edit, cancel, or nudge players who haven't replied.
- Every signed-in phone in the group gets a push invite with In / Maybe / Out buttons. Android saves the reply straight from the notification; iOS opens the app and saves it.
- Everyone sees live counts, a tally bar, and who has replied. Players link their phone to their roster name once, and administrators can reset a wrong link.
- **Smart game-day alarm.** The evening before (7 PM at the venue's local time), players who are in get a reminder. One tap reads their current location, estimates the drive with OpenRouteService (with a distance-based fallback), and recommends an alarm: reach-by time − drive − getting-ready time (45 minutes by default, adjustable). A time-to-leave nudge follows.
  - Android: an exact system alarm-clock alarm with Stop and Start trip actions, with a hand-off to the Clock app if exact alarms are not allowed.
  - iOS 26+: an AlarmKit system alarm with a Start trip button. Earlier iOS versions use an alarm-tone notification with follow-ups.
  - Changing your reply or a cancelled game removes the alarm, and edited times prompt an update.
- **Live trip map.** Players tap Start trip to share their location until they arrive, stop, or an hour after the start. A themed map shows the venue, each traveller's position and ETA, arrivals, and who hasn't left yet. Sharing runs as an Android location foreground service and as background location updates with the location indicator on iOS. The server keeps only each player's latest position and deletes it after the game.
- Game Day tab and Next game card on Home, plus Game Day settings: player link, notification and alarm status, and leaving Game Day on a phone.
- `bccb://` deep links on both platforms (`bccb://game-day/{id}[/alarm|/trip]`, `bccb://page/{page}`).
- iOS can now open shared PDF scorecards ("Open in BCCB Cricket"), matching the Android share target.
- Cloudflare Worker: device registration with hashed per-device secrets, game day, reply, toss, route, trip, and venue-search APIs, Firebase Cloud Messaging HTTP v1 delivery, and a 15-minute cron for reminders and trip clean-up. Migration `DB/migrations/20261001_add_game_day.sql` adds the new tables.
- One shared native bridge contract (`tools/native-bridge-contract.json`) implemented by the Android and iOS shells. `tools/check-native-parity.mjs` fails CI if methods, events, notification actions, permissions, link schemes, or versions drift between the platforms.
- CI workflow for parity, Game Day logic tests, Worker tests, and the Android build, lint, and R8. The iOS verification workflow now builds on `macos-26` and captures simulator screenshots.

### Changed
- Android targets and compiles against API 36 (required for Google Play updates from 31 August 2026), uses Android Gradle Plugin 8.10.1 with Gradle 8.11.1 and Java 17, and raises the minimum to Android 6.0 (API 23) for Firebase.
- Android back navigation uses `OnBackInvokedCallback`, which Android 16 requires: back closes sheets, then returns Home, then leaves the app.
- Android WebView debugging is enabled only in debug builds, and mixed content is blocked.
- iOS uses Capacitor 8.5.2 and is iPhone-only and portrait-only (matching Android), requires arm64, declares export compliance, and includes a privacy manifest.
- Shared PDF imports go through the same native bridge on both platforms.
- Advanced Android to version 2.2.0 (versionCode 19) and iOS to 2.2.0 (build 19).
- The privacy policy now describes cloud sync, Game Day, location, push notifications, and service providers.

### Removed
- The old toss-to-opening-batters chain that led into the retired live-scoring screens.

## [2.1.2] - Unreleased

### Added
- Added a native iOS Capacitor project that packages the shared PWA assets for Xcode and App Store distribution, including an iOS document-picker path for PDF scorecard imports.
- Added a GitHub-hosted macOS workflow that verifies the iOS project with an unsigned simulator build.
- Added a manual GitHub-hosted macOS workflow that exports a signed IPA when Apple certificate and provisioning-profile secrets are configured.

### Changed
- Matchup win chances now use a calibrated logistic conversion of batting-weighted team ratings, so substantial roster changes produce visibly different estimates while equal teams remain 50/50.
- Batting and bowling dominance now use the same performance data as the win estimate once a player has at least four recorded matches.
- Advanced the Android release to version 2.1.2 (versionCode 18).

### Fixed
- Direct player moves now immediately show the odds and dominant batting or bowling side for the exact modified team rosters.

## [2.1.1]

### Added
- Import-first analytics workflow for PDF scorecards, including preview, parsing, player-match suggestions, and confirmed D1 persistence.
- Full-roster player association during import, inline roster creation with batting and bowling classifications, and optional manual many-to-one associations.
- Scorecard fingerprinting to prevent duplicate statistics when the same PDF is reviewed or imported again.
- Captaincy analytics derived from confirmed scorecard associations: win/loss record, favorite batter and bowler by performance uplift, and Man of the Match totals.
- Android PDF share-target support so a shared scorecard opens directly in the review workflow.

### Changed
- Refocused the product documentation, PWA metadata, cache configuration, and Android package on scorecard imports and analytics.
- Team balancing now uses imported performance data once a player has recorded at least four games.
- Statistics-based team balancing now distributes established and developing players as evenly as possible between both teams.
- Statistics-based drafts also balance star players, Fast bowlers, and Reliable batters wherever the roster permits.
- Players with one to three matches now blend observed statistics with established role-cohort baselines rather than receiving only a category proxy.
- Reshuffling now produces a different balanced team assignment through constrained non-captain exchanges.
- Matching controls show fuzzy suggestions first while retaining every other roster player as an explicit selectable option.
- Restricted scorecard PDF upload, shared-PDF hand-off, scorecard-import API routes, and player-classification controls to each group's administrator login.
- Generated teams now use captain-first names and show a four-line matchup outlook with estimated win chances plus relative batting and bowling strength.
- Removed obsolete local JSON backup/import code and the no-op data-manager compatibility layer.
- Advanced the Android release to version 2.1.1 (versionCode 17).

### Fixed
- Title-only captain names now resolve through the normal confirmed player-association flow.
- Accidental non-captain scorecard entries can be ignored without creating player performances or team-composition records; captain entries remain mandatory.
- Removed duplicate frontend application initialization and stale asset requests.
- Bowling-average cards, comparisons, and sorting now consistently use total runs conceded divided by total wickets taken.
- Favorite Bowler now measures the positive reduction in bowling average under a captain, matching the uplift rule used for Favorite Batsman.
- Average-runs, fours, and sixes ranking tables now use the same batting-innings denominators as the imported-stat calculations.

### Removed
- Live ball-by-ball score controls, toss actions, and resume-match paths. Legacy in-progress match state is discarded on startup so it cannot reopen the retired workflow.
- Match Settings, including overs, wides, no-balls, and byes controls, plus their home-screen shortcut and backup payload.
- Obsolete repair scripts, debug tooling, backup copies, stale deployment material, and tracked local Android configuration.

## [1.0.0] - 2025-10-21 - Production Release

### 🎉 Production Ready
- First production-ready release
- Cleaned up all temporary files and documentation
- Comprehensive README and deployment guides
- Stable authentication and data sync

### ✨ Added
- **Group Authentication System**
  - Multi-tenant architecture with group isolation
  - SHA-256 password hashing
  - Guest group with no password requirement
  - Group creation and login flows
  
- **Cloudflare D1 Integration**
  - Full CRUD operations for groups, players, and matches
  - Real-time data synchronization
  - Automatic conflict resolution
  - Data validation and duplicate prevention

- **Team Balancing Algorithm**
  - BCCB-based skill scoring system
  - Captain recommendation engine
  - Historical performance analysis
  - Fair team generation with minimal strength difference

- **Live Match Scoring**
  - Ball-by-ball tracking
  - Wicket details (dismissal type, bowler, fielder)
  - Extras handling (wides, no-balls, byes)
  - Over-by-over tracking
  - Real-time score updates

- **Player Management**
  - Add/edit/delete players
  - Bowling style categorization (Fast, Medium, Spin, DNB)
  - Batting style categorization (Aggressive, Reliable, So-So, Tailend)
  - Star player designation
  - Performance statistics

- **Match History**
  - Complete scorecard view
  - Match details (teams, score, result, overs)
  - Fall of wickets
  - Player performance in each match
  - Win/loss records

- **Analytics Dashboard**
  - Player statistics (runs, wickets, average, strike rate)
  - Form trends (last 5 matches)
  - Captain performance (wins/losses)
  - Head-to-head comparisons
  - Team composition analysis

- **Developer Tools**
  - Authentication debug interface
  - LocalStorage inspection
  - Password hash calculator
  - D1 connection tester
  - Group management utilities

- **Android Native App**
  - Trusted Web Activity (TWA) wrapper
  - Offline support with Service Worker
  - Native install experience
  - Splash screen and app icon

### 🔧 Fixed
- **Authentication Issues**
  - Fixed undefined group name after login (line 1843 in app.js)
  - Fixed guest login not updating UI immediately
  - Fixed cached authentication preventing fresh logins
  - Added explicit updateUI() calls after login/create group

- **Data Synchronization**
  - Fixed duplicate match prevention
  - Fixed performance data not syncing correctly
  - Fixed group ID mismatch between localStorage and D1
  - Added proper error handling for sync failures

- **Match Recording**
  - Fixed no-ball not increasing over count
  - Fixed wide ball counting towards overs
  - Fixed wicket details not saving properly
  - Added validation for dismissal types

- **UI/UX Issues**
  - Fixed player list not refreshing after add/edit
  - Fixed team generation showing negative strength
  - Fixed scorecard modal not displaying correctly
  - Added loading indicators for async operations

### 🗑️ Removed
- Temporary documentation files (AUTH_FIX_SUMMARY.md, etc.)
- Backup JavaScript files (app_backup.js, app_minimal.js)
- Old sync system (azure-sync.js)
- Static data files (cricket_stats.js, default-data.js)
- One-time SQL migration files
- Development test files
- Example/template files

### 📚 Documentation
- Comprehensive README.md with full feature list
- DEPLOYMENT.md with step-by-step deployment instructions
- CHANGELOG.md (this file)
- Code comments and inline documentation
- API endpoint documentation in README

### 🔒 Security
- SHA-256 password hashing on client-side
- Passwords never transmitted in plain text
- SQL injection prevention using prepared statements
- CORS configuration for API security
- Input validation on all user inputs
- XSS protection in UI rendering

### 🎨 UI/UX Improvements
- Modern glass-morphism design
- Dark mode optimized
- Mobile-first responsive design
- Smooth animations and transitions
- Intuitive navigation
- Clear error messages
- Loading states for async operations
- Toast notifications for user feedback

### 🏗️ Technical Improvements
- Modular code organization
- Clear separation of concerns (auth, data, UI)
- Efficient data structures
- Optimized API calls
- Reduced bundle size
- Better error handling
- Comprehensive logging
- Type safety in Worker API (TypeScript)

### 📱 Android App Improvements
- WebView optimization
- Hardware acceleration enabled
- Splash screen implementation
- App icon configured
- Manifest configuration
- Build optimization
- ProGuard rules for release

## [0.9.0] - 2025-10-15 - Beta Release

### Added
- Initial beta release
- Basic player and match management
- Local data storage
- Team generation
- Match scoring

### Known Issues
- Authentication bugs
- Data sync inconsistencies
- UI update delays
- Documentation scattered

## Development Timeline

### Phase 1: Core Features (Sep 2025)
- Player management
- Basic match tracking
- LocalStorage implementation

### Phase 2: Cloud Integration (Oct 2025)
- Cloudflare Worker API
- D1 database setup
- Data synchronization
- Multi-tenant architecture

### Phase 3: Advanced Features (Oct 2025)
- Team balancing algorithm
- Analytics dashboard
- Captain recommendations
- Historical analysis

### Phase 4: Polish & Production (Oct 2025)
- Bug fixes
- Authentication improvements
- UI refinements
- Documentation
- Testing
- Production deployment

## Future Roadmap

### Version 1.1.0 (Planned)
- [ ] Export data to CSV/PDF
- [ ] Import players from file
- [ ] Custom match formats (ODI, Test)
- [ ] Tournament mode
- [ ] Push notifications
- [ ] Dark/light theme toggle

### Version 1.2.0 (Planned)
- [ ] Player photos
- [ ] Video highlights integration
- [ ] Social sharing
- [ ] Leaderboards
- [ ] Achievements/badges
- [ ] Multi-language support

### Version 2.0.0 (Future)
- [ ] Live streaming integration
- [ ] Ball tracking with computer vision
- [ ] AI-powered umpiring
- [ ] Fantasy cricket integration
- [ ] Tournament bracket system
- [ ] Betting odds integration

## Migration Notes

### Upgrading from 0.9.0 to 1.0.0
1. Clear browser cache and localStorage
2. Reinstall Android app
3. Use "Force Guest Login" in debug tool if issues
4. Re-sync data from D1 database

### Database Schema Changes
- Added `Winning_Captain` and `Losing_Captain` fields to `match_data`
- No breaking changes to existing data
- Automatic migration on first sync

## Breaking Changes

### Version 1.0.0
- Removed old azure-sync.js authentication system
- Changed API endpoint structure (ensure Worker is updated)
- Updated group authentication flow (may require re-login)

## Contributors

- **Anuj Loomba** - Lead Developer
  - Core application logic
  - Team balancing algorithm
  - Android app development
  - Cloudflare Worker API
  - UI/UX design

## Acknowledgments

- BCCB cricket team for feature requirements and testing
- Cloudflare for D1 database and Workers platform
- Android community for TWA guidance

---

**Legend**:
- ✨ Added - New features
- 🔧 Fixed - Bug fixes
- 🗑️ Removed - Removed features
- 📚 Documentation - Documentation changes
- 🔒 Security - Security improvements
- 🎨 UI/UX - User interface improvements
- 🏗️ Technical - Technical improvements
- 📱 Android - Android-specific changes

For questions or issues, please visit: https://github.com/anujloomba/bccb_refactored/issues
