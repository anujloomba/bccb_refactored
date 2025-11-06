# Google Play Store Deployment Guide

## Prerequisites Checklist

### 1. Google Play Console Account
- [ ] Create a Google Play Developer account at https://play.google.com/console
- [ ] Pay the one-time $25 registration fee
- [ ] Complete account verification (may take 24-48 hours)

### 2. App Requirements
- [ ] App must be production-ready (✅ Already cleaned)
- [ ] Privacy policy URL (if app collects data)
- [ ] App icon and screenshots
- [ ] App description and promotional materials

## Step 1: Generate a Signing Key

You need a keystore file to sign your app for release. Run this command:

```powershell
# Navigate to your project
cd c:\Users\anujl\PycharmProjects\cricket-pwa-standalone\native-android-app

# Generate keystore (replace YOUR_NAME with your name/company)
keytool -genkey -v -keystore cricket-manager-release.keystore -alias cricket-manager -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: 
- Remember your passwords! You'll need them for every release.
- Store the keystore file securely - losing it means you can't update your app.
- The keystore will be created in: `native-android-app/cricket-manager-release.keystore`

## Step 2: Configure Signing in Gradle

I'll update your `app/build.gradle` to add signing configuration.

## Step 3: Build Release APK/AAB

Google Play Store requires Android App Bundle (AAB) format:

```powershell
# Build signed AAB
.\gradlew bundleRelease

# Or build signed APK
.\gradlew assembleRelease
```

Output will be at:
- AAB: `app/build/outputs/bundle/release/app-release.aab`
- APK: `app/build/outputs/apk/release/app-release.apk`

## Step 4: Prepare App Store Listing Materials

### Required Assets:

#### 1. App Icon
- Already have: `app/src/main/res/mipmap-*/ic_launcher.png`
- 512x512 high-resolution icon for Play Store

#### 2. Feature Graphic
- Size: 1024 x 500 pixels
- Required for Play Store listing

#### 3. Screenshots
- Minimum 2, maximum 8 screenshots
- Recommended size: 1080 x 1920 (portrait) or 1920 x 1080 (landscape)
- Show key features of your app

#### 4. App Description

**Short Description** (max 80 characters):
```
Cricket match scorer with live stats, player tracking, and match history
```

**Full Description** (max 4000 characters):
```
Cricket Manager - Your Complete Cricket Scoring Solution

Manage cricket matches with ease using our comprehensive scoring app. Perfect for local tournaments, practice matches, and friendly games.

KEY FEATURES:
✓ Live Match Scoring - Track runs, wickets, and overs in real-time
✓ Player Statistics - Comprehensive batting and bowling stats
✓ Team Management - Create and manage multiple teams
✓ Match History - Review past matches and performances
✓ Offline Support - Score matches without internet connection
✓ Detailed Analytics - Spider charts and performance metrics
✓ Toss Management - Built-in toss feature to start matches
✓ Over-by-over Commentary - Track every ball of the match

PERFECT FOR:
• Cricket clubs and local teams
• Tournament organizers
• Cricket enthusiasts and scorers
• Coaches tracking player performance

FEATURES IN DETAIL:
• Intuitive scoring interface with quick tap controls
• Track runs, wides, no-balls, byes, and leg-byes
• Automatic strike rotation and over completion
• Detailed player profiles with match-by-match breakdown
• Beautiful data visualizations and charts
• Export match data for records
• Support for various cricket formats

Whether you're organizing a tournament or just keeping score for a weekend match, Cricket Manager provides all the tools you need for accurate, professional cricket scoring.

No ads. No subscriptions. Complete cricket management in your pocket.
```

#### 5. Privacy Policy
Your app accesses:
- Internet (for potential online features)
- Network state
- WiFi state

If you collect any user data, you MUST have a privacy policy. You can host it on:
- GitHub Pages (free)
- Google Sites (free)
- Your own website

## Step 5: Upload to Google Play Console

### A. Create New App
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in details:
   - App name: **Cricket Manager**
   - Default language: **English (United States)**
   - App or game: **App**
   - Free or paid: **Free**
4. Accept declarations and create app

### B. Set Up Store Listing
1. Go to **Store presence** → **Main store listing**
2. Upload:
   - App icon (512x512)
   - Feature graphic (1024x500)
   - Screenshots (at least 2)
3. Add:
   - Short description
   - Full description
   - App category: **Sports**
4. Contact details:
   - Email address
   - Phone number (optional)
   - Website (optional)

### C. Content Rating
1. Go to **Policy** → **App content**
2. Fill out content rating questionnaire
3. Your app is likely **Everyone** or **Everyone 10+** rating

### D. Target Audience and Content
1. Select target age groups
2. Declare if app is designed for children under 13 (probably No)
3. Fill out app content sections

### E. Privacy Policy (if applicable)
1. If you collect ANY user data, you need a privacy policy
2. Add the URL in the app content section

### F. Upload App Bundle
1. Go to **Release** → **Production**
2. Click **Create new release**
3. Upload your AAB file: `app-release.aab`
4. Fill in release notes:
   ```
   Initial release of Cricket Manager
   - Complete cricket match scoring system
   - Player and team management
   - Live statistics and analytics
   - Offline support
   - Match history tracking
   ```
5. Review and roll out release

## Step 6: Testing (Recommended)

Before production, test with **Internal Testing** or **Closed Testing**:

1. Go to **Release** → **Testing** → **Internal testing**
2. Create new release
3. Upload AAB
4. Add test users (email addresses)
5. Test thoroughly before production release

## Step 7: Submit for Review

1. Complete all required sections (green checkmarks)
2. Go to **Release** → **Production**
3. Click **Send for review**
4. Google will review (typically 1-7 days)

## Important Notes

### Versioning
- Every update must have higher `versionCode` in `build.gradle`
- Current version: `versionCode 1`, `versionName "1.0"`
- Next update should be: `versionCode 2`, `versionName "1.1"`, etc.

### App Updates
To update your app:
1. Increment `versionCode` in `build.gradle`
2. Build new AAB: `.\gradlew bundleRelease`
3. Upload to Play Console
4. Add release notes explaining what's new
5. Submit for review

### Common Rejection Reasons
- Missing privacy policy (if you collect data)
- Inappropriate content
- Crashes or bugs
- Misleading description or screenshots
- Copyright violations in icon/screenshots

### After Approval
- App will be live on Play Store in a few hours
- Users can search and install
- Monitor crash reports in Play Console
- Respond to user reviews

## Cost Breakdown
- Google Play Developer Account: **$25 one-time fee**
- App distribution: **FREE**
- Optional: Paid features in future

## Useful Links
- Play Console: https://play.google.com/console
- Developer Policy: https://play.google.com/about/developer-content-policy/
- App Bundle Guide: https://developer.android.com/guide/app-bundle

## Quick Commands Reference

```powershell
# Generate keystore (first time only)
keytool -genkey -v -keystore cricket-manager-release.keystore -alias cricket-manager -keyalg RSA -keysize 2048 -validity 10000

# Build release AAB (for Play Store)
cd native-android-app
.\gradlew bundleRelease

# Build release APK (for direct distribution)
.\gradlew assembleRelease

# List current version
grep -E "versionCode|versionName" app/build.gradle
```

## Next Steps for You

1. ✅ Generate signing keystore
2. ✅ Update build.gradle with signing config  
3. ✅ Build release AAB
4. ⏳ Create Google Play Developer account ($25)
5. ⏳ Prepare screenshots and graphics
6. ⏳ Write privacy policy (if needed)
7. ⏳ Upload and submit for review

---

Need help with any specific step? Let me know!
