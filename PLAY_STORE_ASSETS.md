# Google Play Store Asset Requirements

## Required Assets Checklist

### 1. App Icon ✅
**Current Status**: Already have in `app/src/main/res/mipmap-*/ic_launcher.png`

**Play Store Requirement**:
- 512 x 512 pixels
- 32-bit PNG (with alpha)
- Maximum 1024 KB
- Full asset, not rounded

**Action**: Export 512x512 version of your current icon

---

### 2. Feature Graphic ⚠️
**Status**: REQUIRED - Need to create

**Requirements**:
- Size: 1024 x 500 pixels
- Format: PNG or JPEG
- Maximum 1024 KB

**Content Ideas**:
```
- App logo/name in center
- Cricket-themed background
- Show key features (scoring, stats, match history)
- Use your app's color scheme
```

**Quick Creation Options**:
1. Canva.com (free templates)
2. Photoshop/GIMP
3. PowerPoint/Google Slides (export as PNG)

---

### 3. Screenshots ⚠️
**Status**: REQUIRED - Need to create

**Requirements**:
- Minimum: 2 screenshots
- Maximum: 8 screenshots
- Recommended size: 1080 x 1920 pixels (portrait)
- Format: PNG or JPEG

**Suggested Screenshots**:
1. **Home/Team Setup Screen** - Show team creation
2. **Live Scoring Screen** - Active match with score
3. **Player Stats** - Spider chart or statistics view
4. **Match History** - List of completed matches
5. **Toss Screen** - Starting a match
6. **Team Management** - Adding/editing players

**How to Capture**:
1. Run app on emulator or device
2. Use Android Studio screenshot tool
3. Or use: `adb shell screencap -p /sdcard/screenshot.png`
4. Pull: `adb pull /sdcard/screenshot.png`

---

### 4. App Description ✅
**Status**: Template provided in GOOGLE_PLAY_DEPLOYMENT.md

**Short Description** (max 80 chars):
```
Cricket match scorer with live stats, player tracking, and match history
```

**Full Description**: See GOOGLE_PLAY_DEPLOYMENT.md

---

### 5. Privacy Policy URL ✅
**Status**: Template created in PRIVACY_POLICY.md

**Options to Host**:

#### Option A: GitHub Pages (Recommended - Free)
```powershell
# 1. Create a new branch
git checkout -b gh-pages

# 2. Create index.html from PRIVACY_POLICY.md
# (Convert markdown to HTML or use simple HTML)

# 3. Push to GitHub
git push origin gh-pages

# 4. Enable GitHub Pages in repo settings
# URL will be: https://anujloomba.github.io/bccb_refactored/
```

#### Option B: Google Sites (Free)
1. Go to sites.google.com
2. Create new site
3. Paste privacy policy content
4. Publish
5. Get URL

#### Option C: Simple HTML hosting
Upload PRIVACY_POLICY.md (as HTML) to any free hosting:
- Netlify
- Vercel
- Firebase Hosting

---

## Asset Creation Timeline

### Day 1: Basic Assets (2-3 hours)
- [ ] Export 512x512 app icon
- [ ] Take 2-4 screenshots from app
- [ ] Create basic feature graphic

### Day 2: Polish (1-2 hours)
- [ ] Add more screenshots (up to 8)
- [ ] Review and improve feature graphic
- [ ] Host privacy policy online

### Day 3: Upload (1 hour)
- [ ] Upload all assets to Play Console
- [ ] Fill in store listing
- [ ] Submit for review

---

## Asset Templates & Tools

### Free Design Tools
- **Canva**: Feature graphics and promotional images
- **GIMP**: Free Photoshop alternative
- **Figma**: Professional design tool (free tier)
- **Google Slides**: Simple graphics

### Screenshot Tools
```powershell
# Android Studio: Built-in screenshot button in emulator

# Or command line:
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./screenshots/

# Or use scrcpy for live mirroring:
scrcpy
# Then take screenshots on your computer
```

### Color Scheme (from your app)
```
Primary: #00ff88 (Bright green)
Secondary: #00ccff (Cyan)
Background: #1a1a1a (Dark gray)
Text: #ffffff (White)
```

---

## Quick Create Feature Graphic Template

**Simple Template in PowerPoint/Google Slides**:
1. Create 1024 x 500 px slide
2. Dark background (#1a1a1a)
3. App logo/icon on left
4. "Cricket Manager" title in center (large, white)
5. Key features bullets on right:
   - Live Scoring
   - Player Stats
   - Match History
6. Add cricket ball or bat graphic
7. Export as PNG

---

## Asset Checklist Before Upload

- [ ] High-res icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG/JPEG)
- [ ] At least 2 screenshots (1080x1920 recommended)
- [ ] Short description (under 80 chars)
- [ ] Full description (compelling, accurate)
- [ ] Privacy policy URL (live and accessible)
- [ ] Category selected (Sports)
- [ ] Content rating completed
- [ ] App bundle (AAB) built and tested

---

## Example Asset Locations

After creation, organize like this:
```
cricket-pwa-standalone/
├── play-store-assets/
│   ├── icon-512.png
│   ├── feature-graphic.png
│   ├── screenshots/
│   │   ├── 1-home-screen.png
│   │   ├── 2-live-scoring.png
│   │   ├── 3-player-stats.png
│   │   ├── 4-match-history.png
│   │   └── 5-team-management.png
│   └── promo-video.mp4 (optional)
```

---

## Need Help?

**Quick Start**:
1. Run: `.\setup-playstore.ps1` (generates keystore and builds AAB)
2. Take screenshots from your app
3. Create feature graphic in Canva
4. Host privacy policy on GitHub Pages
5. Upload to Play Console!

**Resources**:
- Play Console Help: https://support.google.com/googleplay/android-developer
- Asset Requirements: https://support.google.com/googleplay/android-developer/answer/9866151
- Design Guidelines: https://developer.android.com/distribute/marketing-tools/device-art-generator
