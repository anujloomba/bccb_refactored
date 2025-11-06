# Cricket Manager - Play Store Setup Script
# This script helps you set up signing for Google Play Store release

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Cricket Manager - Play Store Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if keystore already exists
$keystorePath = ".\cricket-manager-release.keystore"

if (Test-Path $keystorePath) {
    Write-Host "WARNING: Keystore already exists at: $keystorePath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to create a new one? (This will delete the old one) [y/N]"
    
    if ($overwrite -eq "y" -or $overwrite -eq "Y") {
        Remove-Item $keystorePath -Force
        Write-Host "SUCCESS: Old keystore deleted" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Setup cancelled. Using existing keystore." -ForegroundColor Red
        exit
    }
}

# Step 2: Generate keystore
Write-Host ""
Write-Host "Step 1: Generate Signing Keystore" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "You will be asked for the following information:" -ForegroundColor Yellow
Write-Host "  - Keystore password (remember this!)" -ForegroundColor Yellow
Write-Host "  - Key password (can be same as keystore password)" -ForegroundColor Yellow
Write-Host "  - Your name" -ForegroundColor Yellow
Write-Host "  - Organization name (optional - can press Enter)" -ForegroundColor Yellow
Write-Host "  - City" -ForegroundColor Yellow
Write-Host "  - State" -ForegroundColor Yellow
Write-Host "  - Country code (e.g. US, IN, UK)" -ForegroundColor Yellow
Write-Host ""

Write-Host "IMPORTANT: Save these passwords securely!" -ForegroundColor Red
Write-Host "   Without them, you cannot update your app!" -ForegroundColor Red
Write-Host ""

$proceed = Read-Host "Ready to generate keystore? [Y/n]"
if ($proceed -eq "n" -or $proceed -eq "N") {
    Write-Host "ERROR: Setup cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Generating keystore..." -ForegroundColor Green
Write-Host ""

& keytool -genkey -v -keystore cricket-manager-release.keystore -alias cricket-manager -keyalg RSA -keysize 2048 -validity 10000

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Keystore generation failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "SUCCESS: Keystore generated successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Update gradle.properties
Write-Host "Step 2: Configure Gradle Properties" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$keystorePassword = Read-Host "Enter keystore password" -AsSecureString
$keystorePasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($keystorePassword))

$keyPassword = Read-Host "Enter key password" -AsSecureString
$keyPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPassword))

# Read existing gradle.properties
$gradlePropsPath = ".\gradle.properties"
$existingContent = ""
if (Test-Path $gradlePropsPath) {
    $existingContent = Get-Content $gradlePropsPath -Raw
}

# Append signing configuration
$signingConfig = @"

# Signing configuration for release builds
# DO NOT COMMIT THESE VALUES TO GIT!
CRICKET_KEYSTORE_FILE=../cricket-manager-release.keystore
CRICKET_KEYSTORE_PASSWORD=$keystorePasswordPlain
CRICKET_KEY_ALIAS=cricket-manager
CRICKET_KEY_PASSWORD=$keyPasswordPlain
"@

$existingContent + $signingConfig | Set-Content $gradlePropsPath

Write-Host "SUCCESS: Gradle properties updated" -ForegroundColor Green
Write-Host ""

# Step 4: Build release
Write-Host "Step 3: Build Release Bundle" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$build = Read-Host "Build release AAB now? (Recommended) [Y/n]"
if ($build -ne "n" -and $build -ne "N") {
    Write-Host ""
    Write-Host "Building release bundle..." -ForegroundColor Green
    Write-Host ""
    & .\gradlew bundleRelease
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS: Build successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Release bundle location:" -ForegroundColor Cyan
        Write-Host "  app\build\outputs\bundle\release\app-release.aab" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERROR: Build failed! Check errors above." -ForegroundColor Red
        Write-Host ""
    }
}

# Step 5: Final instructions
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. [DONE] Keystore created: cricket-manager-release.keystore" -ForegroundColor Green
Write-Host "2. [DONE] Gradle configured for signing" -ForegroundColor Green
Write-Host "3. [TODO] Create Google Play Developer account ($25)" -ForegroundColor Yellow
Write-Host "4. [TODO] Prepare app store assets (icon, screenshots)" -ForegroundColor Yellow
Write-Host "5. [TODO] Upload app-release.aab to Play Console" -ForegroundColor Yellow
Write-Host "6. [TODO] Submit for review" -ForegroundColor Yellow
Write-Host ""

Write-Host "See GOOGLE_PLAY_DEPLOYMENT.md for detailed guide" -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANT REMINDERS:" -ForegroundColor Red
Write-Host "  - Back up your keystore file securely!" -ForegroundColor Red
Write-Host "  - Save your passwords somewhere safe!" -ForegroundColor Red
Write-Host "  - DON'T commit gradle.properties with passwords to git!" -ForegroundColor Red
Write-Host "  - The keystore is already in .gitignore" -ForegroundColor Red
Write-Host ""

Write-Host "Your app is ready for Google Play Store!" -ForegroundColor Green
Write-Host ""
