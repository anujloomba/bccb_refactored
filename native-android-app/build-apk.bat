@echo off
echo Building Cricket Manager Native Android App...
echo.

REM Check if ANDROID_HOME is set
if "%ANDROID_HOME%"=="" (
    echo ERROR: ANDROID_HOME environment variable not set.
    echo Please install Android Studio and set ANDROID_HOME to your Android SDK path.
    echo Example: C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    echo.
    pause
    exit /b 1
)

echo Using Android SDK: %ANDROID_HOME%
echo.

REM Clean previous builds
if exist "app\build" (
    echo Cleaning previous build...
    rmdir /s /q "app\build"
)

REM Build the APK
echo Building APK...
call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! APK built successfully.
    echo Location: app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Transfer this APK to your Android device and install it.
) else (
    echo.
    echo BUILD FAILED! 
    echo Try using Android Studio instead for easier building.
)

pause
