# Quick Start: Google Play Store Deployment
# Run this to get started immediately

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    Cricket Manager - Play Store Deployment" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will guide you through deploying to Google Play Store" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Check if keytool exists
try {
    $keytoolVersion = & keytool -version 2>&1
    Write-Host "[OK] Java keytool found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Java keytool not found! Install Java JDK first." -ForegroundColor Red
    Write-Host "   Download from: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if gradlew exists
if (Test-Path ".\gradlew.bat") {
    Write-Host "[OK] Gradle wrapper found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] gradlew.bat not found! Are you in the native-android-app directory?" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Main menu
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Setup signing & build release (FIRST TIME)" -ForegroundColor Yellow
Write-Host "2. Build release AAB (already have keystore)" -ForegroundColor Yellow
Write-Host "3. Help with screenshots" -ForegroundColor Yellow
Write-Host "4. View documentation" -ForegroundColor Yellow
Write-Host "5. Pre-submission checklist" -ForegroundColor Yellow
Write-Host "6. Exit" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "Enter choice [1-6]"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Running setup script..." -ForegroundColor Green
        Write-Host ""
        & .\setup-playstore.ps1
    }
    
    "2" {
        Write-Host ""
        Write-Host "Building release AAB..." -ForegroundColor Green
        Write-Host ""
        
        if (-not (Test-Path ".\cricket-manager-release.keystore")) {
            Write-Host "[ERROR] Keystore not found! Run option 1 first." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Building..." -ForegroundColor Cyan
        Write-Host ""
        & .\gradlew bundleRelease
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[SUCCESS] Build successful!" -ForegroundColor Green
            Write-Host "Location: app\build\outputs\bundle\release\app-release.aab" -ForegroundColor Cyan
            Write-Host ""
        } else {
            Write-Host ""
            Write-Host "[ERROR] Build failed!" -ForegroundColor Red
            Write-Host ""
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "Screenshot Guide" -ForegroundColor Green
        Write-Host ""
        Write-Host "To capture screenshots from your app:" -ForegroundColor White
        Write-Host ""
        
        Write-Host "Method 1: Android Studio Emulator" -ForegroundColor Cyan
        Write-Host "  - Run app in emulator" -ForegroundColor White
        Write-Host "  - Click camera icon in emulator toolbar" -ForegroundColor White
        Write-Host "  - Screenshots saved to desktop" -ForegroundColor White
        Write-Host ""
        
        Write-Host "Method 2: Connected Device" -ForegroundColor Cyan
        Write-Host "  - Connect phone via USB" -ForegroundColor White
        Write-Host "  - Run: adb shell screencap -p /sdcard/screen.png" -ForegroundColor Yellow
        Write-Host "  - Run: adb pull /sdcard/screen.png" -ForegroundColor Yellow
        Write-Host ""
        
        Write-Host "You need:" -ForegroundColor White
        Write-Host "  [OK] Minimum 2 screenshots" -ForegroundColor Green
        Write-Host "  [OK] Recommended: 1080 x 1920 pixels (portrait)" -ForegroundColor Green
        Write-Host "  [OK] PNG or JPEG format" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "See PLAY_STORE_ASSETS.md for more details" -ForegroundColor Cyan
        Write-Host ""
    }
    
    "4" {
        Write-Host ""
        Write-Host "Documentation Files:" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "1. GOOGLE_PLAY_DEPLOYMENT.md" -ForegroundColor Cyan
        Write-Host "   Complete step-by-step deployment guide" -ForegroundColor White
        Write-Host ""
        
        Write-Host "2. PLAY_STORE_ASSETS.md" -ForegroundColor Cyan
        Write-Host "   Asset requirements and creation guide" -ForegroundColor White
        Write-Host ""
        
        Write-Host "3. PRIVACY_POLICY.md" -ForegroundColor Cyan
        Write-Host "   Privacy policy template (also see privacy-policy.html)" -ForegroundColor White
        Write-Host ""
        
        Write-Host "4. PRODUCTION_CLEANUP.md" -ForegroundColor Cyan
        Write-Host "   Record of production code cleanup" -ForegroundColor White
        Write-Host ""
        
        $open = Read-Host "Open main deployment guide? [Y/n]"
        if ($open -ne "n" -and $open -ne "N") {
            Start-Process "..\GOOGLE_PLAY_DEPLOYMENT.md"
        }
    }
    
    "5" {
        Write-Host ""
        Write-Host "Pre-Submission Checklist" -ForegroundColor Green
        Write-Host ""
        
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
        
        Write-Host "Check off completed items:" -ForegroundColor Cyan
        Write-Host ""
        
        foreach ($item in $checklist) {
            $status = Read-Host "$($item.Item) [y/N]"
            if ($status -eq "y" -or $status -eq "Y") {
                Write-Host "  [DONE]" -ForegroundColor Green
            } else {
                Write-Host "  [TODO]" -ForegroundColor Yellow
            }
        }
        
        Write-Host ""
        Write-Host "Once all items are checked, you're ready to submit!" -ForegroundColor Green
        Write-Host ""
    }
    
    "6" {
        Write-Host ""
        Write-Host "Goodbye!" -ForegroundColor Cyan
        Write-Host ""
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "[ERROR] Invalid choice" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Quick Links:" -ForegroundColor Cyan
Write-Host "   Play Console: https://play.google.com/console" -ForegroundColor White
Write-Host "   Documentation: GOOGLE_PLAY_DEPLOYMENT.md" -ForegroundColor White
Write-Host "   Need help? Check the docs or ask!" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
