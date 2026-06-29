@echo off
REM ============================================================
REM  Deutsch Wortschatz - Android APK build for WINDOWS
REM  One-time prerequisites (see BUILD_GUIDE_WINDOWS.md):
REM    - Node.js 18+        https://nodejs.org
REM    - Android Studio     https://developer.android.com/studio
REM      (bundles the Android SDK and a compatible JDK)
REM  Then just double-click this file, or run it in a terminal.
REM ============================================================
setlocal

echo.
echo === 1/5  Installing npm dependencies...
call npm install || goto :err

echo.
echo === 2/5  Adding the Android platform (safe if already added)...
call npx cap add android 2>nul
echo    (continuing)

echo.
echo === 3/5  Generating icons and splash from assets\icon.png...
call npx @capacitor/assets generate --android --assetPath assets 2>nul
echo    (continuing)

echo.
echo === 4/5  Syncing web assets into the native project...
call npx cap sync android || goto :err

echo.
echo === 5/5  Building the APK with Gradle...
cd android
call gradlew.bat assembleDebug || goto :err
cd ..

echo.
echo ============================================================
echo  DONE!  Your installable APK is here:
echo    android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo  Copy that .apk to your Android phone and tap it to install
echo  (enable "Install unknown apps" when prompted), OR run:
echo    adb install -r android\app\build\outputs\apk\debug\app-debug.apk
echo ============================================================
goto :eof

:err
echo.
echo  BUILD FAILED. Scroll up to read the error.
echo  Most common fix: open Android Studio once so it finishes
echo  downloading the SDK, then run this script again.
exit /b 1
