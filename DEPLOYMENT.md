# Deployment Guide

Complete deployment instructions for BCCB Cricket Manager across all platforms.

## 🎯 Deployment Overview

This application consists of three main components:
1. **Cloudflare Worker API** - Backend API with D1 database
2. **Progressive Web App (PWA)** - Web interface
3. **Native Android App** - Android application wrapper

## ☁️ Cloudflare Worker Deployment

### Prerequisites
- Cloudflare account (free tier works)
- Cloudflare CLI (Wrangler) installed
- Node.js 18+ installed

### Step 1: Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### Step 2: Create D1 Database
```bash
cd cricket-worker/cricket-api
wrangler d1 create cricket_mgr
```

This will output:
```
✅ Successfully created DB 'cricket_mgr'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 3: Update Configuration

Edit `wrangler.jsonc`:
```json
{
  "d1_databases": [
    {
      "binding": "cricket_mgr",
      "database_name": "cricket_mgr",
      "database_id": "YOUR_DATABASE_ID_HERE"  // <- Paste ID here
    }
  ]
}
```

### Step 4: Initialize Database Schema
```bash
# From cricket-worker/cricket-api directory
wrangler d1 execute cricket_mgr --file=../../DB/schema.sql
```

Expected output:
```
🌀 Executing on cricket_mgr (xxxxxxxx):
✅ Successfully executed SQL
```

### Step 5: Deploy Worker
```bash
npm install
npx wrangler deploy
```

Output will show your Worker URL:
```
✨ Successfully deployed cricket-api
   https://cricket-api.YOUR_SUBDOMAIN.workers.dev
```

### Step 6: Test Deployment
```bash
# Health check
curl https://cricket-api.YOUR_SUBDOMAIN.workers.dev/health

# Should return:
# {"status":"ok","timestamp":"2025-10-21T...","database":"cricket_mgr"}
```

### Step 7: Verify Database
```bash
# Check guest group was created
wrangler d1 execute cricket_mgr --command="SELECT * FROM groups"
```

## 🌐 PWA Deployment (GitHub Pages)

### Option 1: GitHub Pages (Recommended)

1. **Push to GitHub**:
```bash
git add .
git commit -m "Production ready"
git push origin main
```

2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from branch
   - Branch: main / root
   - Save

3. **Update Assets Path**:
   Edit `index.html` to use relative paths for assets.

4. **Access**:
   - URL: `https://USERNAME.github.io/REPO_NAME/`
   - Example: `https://anujloomba.github.io/bccb_refactored/`

### Option 2: Custom Web Server

1. **Build Static Files**:
```bash
# Copy assets from native-android-app/app/src/main/assets/
cp -r native-android-app/app/src/main/assets/* /path/to/webserver/
```

2. **Configure HTTPS**:
   - PWA requires HTTPS
   - Use Nginx, Apache, or cloud hosting
   - Configure SSL certificate

3. **Update Service Worker**:
   Edit `sw.js` cache name and URLs.

## 📱 Android App Deployment

### Development Build

1. **Update API Endpoint**:

Edit `native-android-app/app/src/main/assets/app.js`:
```javascript
// Line ~1450
this.workerEndpoint = 'https://cricket-api.YOUR_SUBDOMAIN.workers.dev';
```

2. **Build Debug APK**:
```bash
cd native-android-app
.\gradlew clean
.\gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

3. **Install on Device**:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Production Build (Play Store)

1. **Generate Signing Key**:
```bash
keytool -genkey -v -keystore cricket-manager.keystore -alias cricket_manager -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure Signing**:

Create `native-android-app/keystore.properties`:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=cricket_manager
storeFile=../cricket-manager.keystore
```

Update `app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. **Build Release APK**:
```bash
.\gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

4. **Generate App Bundle (AAB)**:
```bash
.\gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

5. **Test Release Build**:
```bash
adb install app/build/outputs/apk/release/app-release.apk
```

### Play Store Submission

1. **Prepare Assets**:
   - App icon (512x512 PNG)
   - Feature graphic (1024x500)
   - Screenshots (phone and tablet)
   - Privacy policy URL
   - App description

2. **Create Play Console Account**:
   - Go to https://play.google.com/console
   - Pay $25 one-time fee
   - Create developer account

3. **Create New App**:
   - App name: "BCCB Cricket Manager"
   - Default language: English
   - App or game: App
   - Free or paid: Free

4. **Upload AAB**:
   - Production → Create new release
   - Upload `app-release.aab`
   - Add release notes
   - Review and rollout

5. **Store Listing**:
   - Fill in app details
   - Upload graphics
   - Select category: Sports
   - Set content rating
   - Complete questionnaire

6. **Publish**:
   - Review all sections
   - Submit for review
   - Wait for approval (1-7 days)

## 🔄 Update Deployment

### Worker Updates
```bash
cd cricket-worker/cricket-api
# Make changes to src/index.ts
npm run deploy
```

### Database Schema Updates
```bash
# Create migration SQL file
wrangler d1 execute cricket_mgr --file=DB/migration_v2.sql

# Backup before major changes
wrangler d1 execute cricket_mgr --command="SELECT * FROM groups" > backup.json
```

### Android App Updates
```bash
# 1. Update version in build.gradle
android {
    defaultConfig {
        versionCode 2
        versionName "1.1.0"
    }
}

# 2. Build new release
.\gradlew assembleRelease

# 3. Upload to Play Store
# Internal testing → Production
```

## 🔒 Security Checklist

### Before Production Deployment

- [ ] Changed all default passwords
- [ ] API endpoint uses HTTPS
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (Cloudflare)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using prepared statements)
- [ ] Authentication tokens properly hashed
- [ ] Debug logs removed from production
- [ ] Error messages don't expose sensitive info
- [ ] Database backups configured
- [ ] SSL certificate valid
- [ ] App signing key secured
- [ ] ProGuard enabled for release builds

## 📊 Monitoring

### Cloudflare Worker Monitoring
1. Cloudflare Dashboard → Workers
2. View analytics:
   - Request count
   - Error rate
   - Response time
   - Data transfer

### D1 Database Monitoring
```bash
# Check database size
wrangler d1 info cricket_mgr

# Check number of rows
wrangler d1 execute cricket_mgr --command="
  SELECT 
    (SELECT COUNT(*) FROM groups) as groups,
    (SELECT COUNT(*) FROM player_data) as players,
    (SELECT COUNT(*) FROM match_data) as matches
"
```

### Android App Monitoring
- Google Play Console → Statistics
- Crash reports
- ANR (Application Not Responding) reports
- User reviews and ratings

## 🚨 Rollback Procedures

### Worker Rollback
```bash
# View deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [DEPLOYMENT_ID]
```

### Database Rollback
```bash
# Restore from backup
wrangler d1 execute cricket_mgr --file=backup.sql
```

### Android App Rollback
- Play Console → Production → Manage
- Halt rollout
- Create new release with previous version

## 📝 Post-Deployment Checklist

- [ ] Health check endpoint responding
- [ ] Database queries working
- [ ] Authentication functioning
- [ ] Guest group accessible
- [ ] Can create new groups
- [ ] Data sync working
- [ ] PWA installable
- [ ] Service worker caching correctly
- [ ] Android app installs successfully
- [ ] No console errors in browser
- [ ] No crashes in Android app
- [ ] Analytics tracking (if applicable)
- [ ] Backup schedule configured
- [ ] Documentation updated
- [ ] Team notified of deployment

## 🆘 Troubleshooting Deployments

### Worker Deployment Fails
```bash
# Check syntax errors
npm run build

# Check wrangler.jsonc is valid JSON
# Use jsonlint or IDE validation

# Verify authentication
wrangler whoami
```

### Database Connection Issues
```bash
# Verify database exists
wrangler d1 list

# Check binding name matches code
grep "cricket_mgr" src/index.ts
grep "cricket_mgr" wrangler.jsonc
```

### Android Build Fails
```bash
# Clean project
.\gradlew clean

# Check Java version
java -version  # Should be Java 11+

# Verify Gradle wrapper
.\gradlew --version

# Check for dependency issues
.\gradlew dependencies
```

## 📧 Support

For deployment issues:
1. Check Cloudflare documentation
2. Review Android Studio build logs
3. Check this deployment guide
4. Open GitHub issue with logs

---

**Last Updated**: October 21, 2025
