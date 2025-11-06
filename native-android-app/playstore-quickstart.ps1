#!/usr/bin/env pwsh
# Quick Start: Google Play Store Deployment
# Run this to get started immediately

Write-Host @"

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        🏏 Cricket Manager - Play Store Deployment 🏏        ║
║                                                            ║
╔════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

Write-Host "This script will guide you through deploying to Google Play Store`n" -ForegroundColor Green

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Cyan

# Check if keytool exists
try {
    $keytoolVersion = & keytool -version 2>&1
    Write-Host "✅ Java keytool found" -ForegroundColor Green
} catch {
    Write-Host "❌ Java keytool not found! Install Java JDK first." -ForegroundColor Red
    Write-Host "   Download from: https://www.oracle.com/java/technologies/downloads/`n" -ForegroundColor Yellow
    exit 1
}

# Check if gradlew exists
if (Test-Path ".\gradlew.bat") {
    Write-Host "✅ Gradle wrapper found" -ForegroundColor Green
} else {
    Write-Host "❌ gradlew.bat not found! Are you in the native-android-app directory?" -ForegroundColor Red
    exit 1
}

Write-Host "`n" -NoNewline

# Main menu
Write-Host "📚 What would you like to do?`n" -ForegroundColor Cyan

Write-Host "1. 🔐 Setup signing & build release (FIRST TIME)" -ForegroundColor Yellow
Write-Host "2. 📦 Build release AAB (already have keystore)" -ForegroundColor Yellow
Write-Host "3. 📸 Help with screenshots" -ForegroundColor Yellow
Write-Host "4. 📄 View documentation" -ForegroundColor Yellow
Write-Host "5. ✅ Pre-submission checklist" -ForegroundColor Yellow
Write-Host "6. ❌ Exit`n" -ForegroundColor Yellow

$choice = Read-Host "Enter choice [1-6]"

switch ($choice) {
    "1" {
        Write-Host "`n🔐 Running setup script...`n" -ForegroundColor Green
        & .\setup-playstore.ps1
    }
    
    "2" {
        Write-Host "`n📦 Building release AAB...`n" -ForegroundColor Green
        
        if (-not (Test-Path ".\cricket-manager-release.keystore")) {
            Write-Host "❌ Keystore not found! Run option 1 first." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Building...`n" -ForegroundColor Cyan
        & .\gradlew bundleRelease
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Build successful!" -ForegroundColor Green
            Write-Host "📍 Location: app\build\outputs\bundle\release\app-release.aab`n" -ForegroundColor Cyan
        } else {
            Write-Host "`n❌ Build failed!`n" -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host "`n📸 Screenshot Guide`n" -ForegroundColor Green
        Write-Host "To capture screenshots from your app:`n" -ForegroundColor White
        
        Write-Host "Method 1: Android Studio Emulator" -ForegroundColor Cyan
        Write-Host "  - Run app in emulator" -ForegroundColor White
        Write-Host "  - Click camera icon in emulator toolbar" -ForegroundColor White
        Write-Host "  - Screenshots saved to desktop`n" -ForegroundColor White
        
        Write-Host "Method 2: Connected Device" -ForegroundColor Cyan
        Write-Host "  - Connect phone via USB" -ForegroundColor White
        Write-Host "  - Run: adb shell screencap -p /sdcard/screen.png" -ForegroundColor Yellow
        Write-Host "  - Run: adb pull /sdcard/screen.png`n" -ForegroundColor Yellow
        
        Write-Host "You need:" -ForegroundColor White
        Write-Host "  ✓ Minimum 2 screenshots" -ForegroundColor Green
        Write-Host "  ✓ Recommended: 1080 x 1920 pixels (portrait)" -ForegroundColor Green
        Write-Host "  ✓ PNG or JPEG format`n" -ForegroundColor Green
        
        Write-Host "See PLAY_STORE_ASSETS.md for more details`n" -ForegroundColor Cyan
    }
    
    "4" {
        Write-Host "`n📄 Documentation Files:`n" -ForegroundColor Green
        
        Write-Host "1. GOOGLE_PLAY_DEPLOYMENT.md" -ForegroundColor Cyan
        Write-Host "   Complete step-by-step deployment guide`n" -ForegroundColor White
        
        Write-Host "2. PLAY_STORE_ASSETS.md" -ForegroundColor Cyan
        Write-Host "   Asset requirements and creation guide`n" -ForegroundColor White
        
        Write-Host "3. PRIVACY_POLICY.md" -ForegroundColor Cyan
        Write-Host "   Privacy policy template (also see privacy-policy.html)`n" -ForegroundColor White
        
        Write-Host "4. PRODUCTION_CLEANUP.md" -ForegroundColor Cyan
        Write-Host "   Record of production code cleanup`n" -ForegroundColor White
        
        $open = Read-Host "Open main deployment guide? [Y/n]"
        if ($open -ne "n" -and $open -ne "N") {
            Start-Process "..\GOOGLE_PLAY_DEPLOYMENT.md"
        }
    }
    
    "5" {
        Write-Host "`n✅ Pre-Submission Checklist`n" -ForegroundColor Green
        
        $checklist = @(
            @{Item="Google Play Developer account created ($25)"; Done=$false},
            @{Item="Keystore generated and backed up"; Done=$false},
            @{Item="Release AAB built successfully"; Done=$false},
            @{Item="512x512 app icon prepared"; Done=$false},
            @{Item="Feature graphic created (1024x500)"; Done=$false},
            @{Item="2+ screenshots captured"; Done=$false},
            @{Item="Privacy policy hosted online"; Done=$false},
            @{Item="App description written"; Done=$false},
            @{Item="Content rating completed"; Done=$false},
            @{Item="Store listing reviewed"; Done=$false}
        )
        
        Write-Host "Check off completed items:`n" -ForegroundColor Cyan
        
        foreach ($item in $checklist) {
            $status = Read-Host "$($item.Item) [y/N]"
            if ($status -eq "y" -or $status -eq "Y") {
                Write-Host "  ✅" -ForegroundColor Green
            } else {
                Write-Host "  ⏳ TODO" -ForegroundColor Yellow
            }
        }
        
        Write-Host "`nOnce all items are checked, you're ready to submit!`n" -ForegroundColor Green
    }
    
    "6" {
        Write-Host "`nGoodbye! 👋`n" -ForegroundColor Cyan
        exit 0
    }
    
    default {
        Write-Host "`n❌ Invalid choice`n" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

Write-Host "💡 Quick Links:" -ForegroundColor Cyan
Write-Host "   Play Console: https://play.google.com/console" -ForegroundColor White
Write-Host "   Documentation: GOOGLE_PLAY_DEPLOYMENT.md" -ForegroundColor White
Write-Host "   Need help? Check the docs or ask!`n" -ForegroundColor White

Write-Host "Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
