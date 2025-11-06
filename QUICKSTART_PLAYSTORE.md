# 🚀 Quick Start: Deploy to Google Play Store

## TL;DR - 3 Simple Steps

### 1️⃣ Setup Signing (First Time Only)
```powershell
cd native-android-app
.\setup-playstore.ps1
```
This will:
- Generate signing keystore
- Configure Gradle
- Build release AAB

### 2️⃣ Prepare Assets
- Take 2+ screenshots from your app
- Create feature graphic (1024x500) using Canva
- Host privacy policy at: https://anujloomba.github.io/bccb_refactored/privacy-policy.html

### 3️⃣ Upload to Play Store
1. Create account: https://play.google.com/console ($25)
2. Upload `app-release.aab`
3. Fill store listing
4. Submit for review ✅

---

## Interactive Quick Start

```powershell
cd native-android-app
.\playstore-quickstart.ps1
```

This gives you a menu with all options!

---

## Documentation

| File | Purpose |
|------|---------|
| [GOOGLE_PLAY_DEPLOYMENT.md](GOOGLE_PLAY_DEPLOYMENT.md) | Complete step-by-step guide |
| [PLAY_STORE_ASSETS.md](PLAY_STORE_ASSETS.md) | Asset requirements & tools |
| [PRIVACY_POLICY.md](PRIVACY_POLICY.md) | Privacy policy template |
| [privacy-policy.html](privacy-policy.html) | Ready-to-host HTML version |

---

## Current Status

### ✅ Completed
- [x] Production code cleanup (removed 135KB debug code)
- [x] Build configuration updated for release
- [x] Privacy policy created
- [x] Automated setup scripts ready
- [x] Documentation complete

### ⏳ You Need To Do
- [ ] Create Google Play Developer account ($25)
- [ ] Generate signing keystore (run setup-playstore.ps1)
- [ ] Take 2-8 screenshots
- [ ] Create feature graphic (1024x500)
- [ ] Host privacy policy online
- [ ] Upload to Play Console
- [ ] Submit for review

---

## Quick Commands

```powershell
# First time setup (generates keystore + builds AAB)
cd native-android-app
.\setup-playstore.ps1

# Build release AAB (after first setup)
.\gradlew bundleRelease

# Build debug APK for testing
.\gradlew assembleDebug

# Check version
grep -E "versionCode|versionName" app/build.gradle

# Take screenshot from device
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png
```

---

## Asset Checklist

Before submitting to Play Store, prepare:

- [ ] **App Icon**: 512x512 PNG (you already have this!)
- [ ] **Feature Graphic**: 1024x500 PNG/JPEG
- [ ] **Screenshots**: 2-8 images, 1080x1920 recommended
- [ ] **Privacy Policy**: Hosted online with URL
- [ ] **Descriptions**: Short (80 chars) & full (4000 chars)
- [ ] **Content Rating**: Complete questionnaire
- [ ] **Release AAB**: Built and tested

---

## Costs

| Item | Cost |
|------|------|
| Google Play Developer Account | **$25 one-time** |
| App Distribution | **FREE** |
| **Total** | **$25** |

---

## Timeline

| Day | Tasks | Time |
|-----|-------|------|
| **Day 1** | Create Play account, run setup script | 1-2 hours |
| **Day 2** | Prepare assets (screenshots, graphics) | 2-3 hours |
| **Day 3** | Upload & complete store listing | 1-2 hours |
| **Review** | Google reviews your submission | 1-7 days |
| **Live!** | App appears on Play Store | 🎉 |

---

## Support Links

- **Play Console**: https://play.google.com/console
- **Developer Policies**: https://play.google.com/about/developer-content-policy/
- **Support**: https://support.google.com/googleplay/android-developer

---

## Next Action

**Start here:**
```powershell
cd native-android-app
.\playstore-quickstart.ps1
```

Choose option 1 to begin setup!

---

## Privacy Policy Hosting (Quick Setup)

### Option 1: GitHub Pages (Recommended)
```powershell
# Enable GitHub Pages in repo settings
# Your privacy policy will be at:
# https://anujloomba.github.io/bccb_refactored/privacy-policy.html
```

### Option 2: Simple Copy
1. Go to: https://www.yoursite.com/privacy
2. Copy content from `privacy-policy.html`
3. Paste and save

---

## Need Help?

1. Check `GOOGLE_PLAY_DEPLOYMENT.md` for detailed guide
2. Check `PLAY_STORE_ASSETS.md` for asset help
3. Run `.\playstore-quickstart.ps1` for interactive menu

**You're ready to deploy! 🚀**
