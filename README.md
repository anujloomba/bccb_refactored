# BCCB Cricket Manager - Production Ready

A comprehensive cricket match management Progressive Web App (PWA) with native Android support, cloud synchronization, and advanced team balancing algorithms.

## 🏏 Features

### Core Functionality
- **Player Management**: Add, edit, and track player statistics with bowling/batting styles
- **Team Balancing**: AI-powered team balancing using BCCB algorithm for fair matches
- **Live Scoring**: Ball-by-ball match tracking with real-time updates
- **Match History**: Complete scorecard history with detailed analytics
- **Cloud Sync**: Cloudflare D1 database integration for multi-device access
- **Group System**: Multi-tenant architecture with separate group data isolation

### Advanced Features
- **Captain Recommendations**: AI-suggested captains based on historical performance
- **Performance Analytics**: Comprehensive player statistics and trends
- **Offline Support**: Service Worker enables offline functionality
- **Native Android App**: Trusted Web Activity (TWA) wrapper for Play Store distribution
- **Dark Mode UI**: Modern glass-morphism design optimized for mobile

### Technical Highlights
- **Authentication**: SHA-256 password hashing with optional guest access
- **Data Protection**: Automatic duplicate prevention and data validation
- **Real-time Sync**: Automatic cloud backup on data changes
- **Developer Tools**: Built-in debugging interface for troubleshooting

## 📁 Project Structure

```
cricket-pwa-standalone/
├── cricket-worker/              # Cloudflare Worker API
│   └── cricket-api/
│       ├── src/
│       │   └── index.ts        # Main API endpoints
│       ├── package.json
│       ├── tsconfig.json
│       └── wrangler.jsonc      # Cloudflare configuration
│
├── DB/                          # Database scripts
│   ├── schema.sql              # Database schema (groups, players, matches)
│   ├── reset_database.sql      # Fresh database initialization
│   ├── check_groups.sql        # Utility queries for debugging
│   └── wrangler.toml           # D1 database binding
│
└── native-android-app/          # Android application
    ├── app/
    │   ├── src/main/
    │   │   ├── assets/
    │   │   │   ├── app.js           # Main application logic (~16k lines)
    │   │   │   ├── index.html       # UI and components (~6k lines)
    │   │   │   ├── debug-auth.html  # Authentication debugging tool
    │   │   │   ├── data-loader.js   # Data loading utilities
    │   │   │   ├── stats-aggregator.js  # Statistics calculations
    │   │   │   ├── templates.js     # UI templates
    │   │   │   ├── sw.js           # Service Worker
    │   │   │   ├── manifest.json   # PWA manifest
    │   │   │   └── icon-512.png    # App icon
    │   │   └── java/
    │   │       └── com/cricketmanager/app/
    │   │           └── MainActivity.java
    │   └── build.gradle
    ├── gradle/
    ├── build.gradle
    ├── settings.gradle
    └── gradlew.bat
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for Cloudflare Worker development)
- Android Studio (for Android app)
- Cloudflare account (for D1 database and Worker deployment)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/anujloomba/bccb_refactored.git
cd bccb_refactored
```

### 2. Deploy Cloudflare Worker

```bash
cd cricket-worker/cricket-api
npm install
npx wrangler login
npx wrangler d1 create cricket_mgr
# Update wrangler.jsonc with your D1 database ID
npx wrangler d1 execute cricket_mgr --file=../../DB/schema.sql
npx wrangler deploy
```

### 3. Update API Endpoint

Edit `native-android-app/app/src/main/assets/app.js`:
```javascript
// Line ~1450
this.workerEndpoint = 'https://your-worker-name.your-subdomain.workers.dev';
```

### 4. Build Android App

```powershell
cd native-android-app
.\gradlew clean
.\gradlew assembleDebug
# For release build:
.\gradlew assembleRelease
```

### 5. Install on Device

```bash
adb install app\build\outputs\apk\debug\app-debug.apk
```

Or open in Android Studio and run directly.

## 🔧 Configuration

### Cloudflare Worker Configuration

**File**: `cricket-worker/cricket-api/wrangler.jsonc`

```json
{
  "name": "cricket-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "d1_databases": [
    {
      "binding": "cricket_mgr",
      "database_name": "cricket_mgr",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

### Android App Configuration

**File**: `native-android-app/app/src/main/java/com/cricketmanager/app/MainActivity.java`

```java
private static final String URL = "https://your-github-pages-url.github.io/bccb_refactored/";
```

Or for local testing:
```java
private static final String URL = "file:///android_asset/index.html";
```

## 📱 Usage

### Creating a Group
1. Open app → Settings → Group Login
2. Click "Create New Group"
3. Enter unique group name and optional password
4. Data is automatically synced to cloud

### Adding Players
1. Go to Players tab
2. Click "Add New Player"
3. Enter name, select bowling/batting style
4. Mark as star player if applicable

### Creating Balanced Teams
1. Go to Teams tab
2. Select players for the match
3. Optionally select captains
4. Click "Generate Balanced Teams"
5. Review team statistics and strength difference

### Starting a Match
1. After generating teams, click "Start Match"
2. Select batting/bowling teams
3. Use ball-by-ball controls to record match
4. Match auto-saves to cloud every few balls

### Viewing Analytics
1. Go to Stats tab
2. View player performance, form trends
3. See captain win/loss records
4. Analyze team performance over time

## 🔐 Authentication & Security

### Group System
- **Guest Group**: Default, no password, ID=1
- **Custom Groups**: User-created with optional passwords
- **Password Hashing**: SHA-256 client-side, stored hashed in D1
- **Data Isolation**: Each group's data is completely separate

### Debugging Authentication
1. Settings → Developer Tools → Authentication Debug Tool
2. View current group state
3. Clear cached authentication
4. Test D1 connections
5. Calculate password hashes

## 🌐 API Endpoints

### Group Management
- `POST /groups` - Create new group
- `POST /groups/auth` - Authenticate group
- `GET /groups/:id/data` - Get group's data
- `GET /groups/find/:name` - Find group by name
- `DELETE /groups/:id/wipe` - Wipe group data

### Player Management
- `POST /players` - Create/update player
- `GET /groups/:id/players` - Get all players for group

### Match Management
- `POST /matches` - Create match
- `GET /groups/:id/matches` - Get all matches for group

### Data Sync
- `POST /sync/upload` - Upload all data
- `GET /sync/download/:groupId` - Download all data

## 🛠️ Development

### Running Locally

**Worker (API)**:
```bash
cd cricket-worker/cricket-api
npm run dev
# Worker runs at http://localhost:8787
```

**Android App**:
```bash
cd native-android-app
.\gradlew installDebug
adb logcat | Select-String "chromium"
```

### Testing

```bash
# Test Worker
cd cricket-worker/cricket-api
npm test

# Build Android
cd native-android-app
.\gradlew test
```

### Debugging

1. **Chrome DevTools**: For PWA debugging
2. **adb logcat**: For Android app logs
3. **debug-auth.html**: For authentication issues
4. **Cloudflare Dashboard**: For D1 queries and Worker logs

## 📊 Database Schema

### Groups Table
```sql
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Players Table
```sql
CREATE TABLE player_data (
  Player_ID TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL DEFAULT 1,
  Name TEXT NOT NULL,
  Bowling_Style TEXT,
  Batting_Style TEXT,
  Is_Star BOOLEAN DEFAULT FALSE,
  Last_Updated DATE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);
```

### Matches Table
```sql
CREATE TABLE match_data (
  Match_ID TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL DEFAULT 1,
  Date DATE NOT NULL,
  Team1 TEXT NOT NULL,
  Team2 TEXT NOT NULL,
  Winning_Team TEXT,
  Losing_Team TEXT,
  Result TEXT,
  Overs INTEGER DEFAULT 20,
  Winning_Captain TEXT,
  Losing_Captain TEXT,
  -- ... additional fields
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);
```

## 🐛 Troubleshooting

### "Invalid Password" Error
- Use debug-auth.html to clear cached groups
- Force login to guest
- Recalculate password hash

### Data Not Syncing
- Check Cloudflare Worker is deployed
- Verify D1 database binding is correct
- Check network connectivity
- Review Worker logs in Cloudflare dashboard

### App Shows "Undefined" Group
- Clear app data and reinstall
- Use "Force Guest Login" in debug tool
- Check app.js has correct API endpoint

### Build Errors
```bash
# Clean build
.\gradlew clean
# Rebuild
.\gradlew assembleDebug --info
```

## 📝 License

[Add your license here]

## 👥 Contributors

- Anuj Loomba - Original Author

## 🔗 Links

- **Live Demo**: https://anujloomba.github.io/bccb_refactored/
- **API**: https://cricket-api.cricketmgr.workers.dev
- **Repository**: https://github.com/anujloomba/bccb_refactored

## 📞 Support

For issues, questions, or contributions:
1. Open an issue on GitHub
2. Use debug-auth.html for authentication problems
3. Check Cloudflare Worker logs for API issues
4. Review adb logcat for Android app issues

---

**Version**: 1.0.0 (Production Ready)
**Last Updated**: October 21, 2025
