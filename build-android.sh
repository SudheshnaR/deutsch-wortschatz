#!/usr/bin/env bash
# ============================================================
# Deutsch Wortschatz — One-command Android APK build
# Requires (one-time): Node.js 18+, JDK 17, Android SDK
#   - Easiest: install Android Studio (bundles SDK + JDK)
# ============================================================
set -e
echo "📦 1/5  Installing npm dependencies…"
npm install

echo "🤖 2/5  Adding the Android platform (safe if already added)…"
npx cap add android 2>/dev/null || echo "   (android already present — continuing)"

echo "🎨 3/5  Generating icons & splash from assets/icon.png…"
npx @capacitor/assets generate --android --assetPath assets || echo "   (icon gen skipped)"

echo "🔄 4/5  Syncing web assets into the native project…"
npx cap sync android

echo "🏗  5/5  Building the APK with Gradle…"
cd android
chmod +x ./gradlew
./gradlew assembleDebug
cd ..

APK="android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
if [ -f "$APK" ]; then
  echo "✅ DONE!  Your installable APK is here:"
  echo "    $(pwd)/$APK"
  echo ""
  echo "Install on a phone:  adb install -r \"$APK\""
  echo "Or copy the .apk to the phone and tap it (enable 'install unknown apps')."
else
  echo "⚠️  Build finished but APK not found at expected path."
  echo "    Check the Gradle output above for errors."
fi
