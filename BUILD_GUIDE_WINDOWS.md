# Deutsch Wortschatz — Build Guide (Windows user, both platforms)

This guide is written for **your exact setup**: building from **Windows**, wanting
**both Android and iOS**, and **testing on your own phone first** before going to the stores.

The one hard rule to know up front:

> **Windows can build Android. Windows CANNOT build iOS.**
> Apple requires a Mac to compile iOS apps. Since you're on Windows, we build iOS
> **in the cloud** (a service runs a Mac for you). This guide covers both.

---

## PART 1 — ANDROID (do this first, today, on your PC)

### Step 1. Install the tools (one-time, ~30–45 min)
1. **Node.js 18+** → https://nodejs.org (pick the "LTS" version, click through the installer).
2. **Android Studio** → https://developer.android.com/studio
   - Run the installer with default options.
   - **Open Android Studio once** and let it finish downloading the Android SDK
     (it shows a progress bar on first launch). This step is essential.

### Step 2. Build the APK
1. Unzip this project somewhere simple, e.g. `C:\deutsch-wortschatz`.
2. **Double-click `build-android.bat`** (or open a terminal in the folder and run `build-android.bat`).
3. Wait ~10–15 min the first time (it downloads build pieces). When it finishes you'll see:
   ```
   android\app\build\outputs\apk\debug\app-debug.apk
   ```

### Step 3. Test it on YOUR Android phone (no store, no account)
**Easiest way — copy & tap:**
1. Connect your phone by USB (or use Google Drive / email to send yourself the `.apk`).
2. Copy `app-debug.apk` to the phone.
3. On the phone, tap the file. Android will ask to **"allow installing unknown apps"** — say yes.
4. The app installs like any other. Done — you can use it fully offline.

**Alternative — via USB with adb:**
- Enable **Developer Options** on the phone (tap *Settings ▸ About phone ▸ Build number* 7 times),
  then turn on **USB debugging**.
- Run: `adb install -r android\app\build\outputs\apk\debug\app-debug.apk`

That's the whole Android test loop. No Google account needed yet.

---

## PART 2 — iOS (cloud build, because you're on Windows)

You can't build iOS on Windows, so we use **Codemagic**, a service that runs a Mac in the cloud
and builds it for you. Two stages:

### Stage A — Test on the iOS Simulator (no Apple account, free-ish)
This proves the app builds for iOS and lets you see it running, without paying Apple yet.
1. Push this project to a **GitHub repo** (free).
2. Sign up at **https://codemagic.io** and connect that repo.
3. The included `codemagic.yaml` defines a workflow called **`ios-simulator-test`** — run it.
4. Codemagic builds the app on a cloud Mac and gives you a `.app` you can preview.

> Note: To install on a **physical iPhone** (not just the simulator), Apple requires the paid
> Developer account below — there's no free sideloading path from Windows.

### Stage B — Real iPhone testing + App Store (needs the Apple account)
1. Join the **Apple Developer Program** — **$99/year** → https://developer.apple.com/programs
2. In Codemagic, add your **App Store Connect** key (Teams ▸ Integrations — Codemagic has a guide).
3. Run the **`ios-release`** workflow in `codemagic.yaml`.
4. It produces a signed app and can push it straight to **TestFlight**, where you install it on your
   own iPhone via Apple's TestFlight app — then later submit to the App Store.

---

## PART 3 — Going to the stores (when you're ready)

### Google Play (Android)
- Create a **Google Play Developer account** — **$25 one-time** → https://play.google.com/console
- Build a **release bundle** instead of a debug APK:
  ```
  cd android
  gradlew.bat bundleRelease      # produces an .aab (Play wants .aab, not .apk)
  ```
- You'll first generate a signing key (one-time):
  ```
  keytool -genkey -v -keystore release.keystore -alias wortschatz -keyalg RSA -keysize 2048 -validity 10000
  ```
  (then reference it in `android/app/build.gradle` — see Android's "Sign your app" docs)
- Upload the `.aab` in the Play Console, fill in the store listing, and submit.

### Apple App Store (iOS)
- The **$99/year** Apple Developer account (above) covers this.
- Use the Codemagic **`ios-release`** workflow → it uploads to **App Store Connect**.
- Fill in the listing in App Store Connect and submit for review.

---

## Before you publish — change the app identity
Open `capacitor.config.json` and set your own values (currently placeholders):
- `appId` — currently `com.sudheshna.deutschwortschatz`. Use your own reverse-domain.
  This is permanent once published, so pick carefully.
- `appName` — currently `Deutsch Wortschatz` (this is fine).
- App icon — replace `assets/icon.png` (1024×1024) and run `npm run icons`.
After any change to `appId`, run `npx cap sync`.

Also: a small **date "sim bar"** is currently visible in the app for testing the daily-story
rotation. Hide it before a public release (it's harmless but looks like a dev tool).

---

## Quick reference — which machine builds what

| Task                          | Windows PC | Cloud (Codemagic) | Need paid account? |
|-------------------------------|:----------:|:-----------------:|--------------------|
| Android APK (test on phone)   |     ✅     |        ✅         | No                 |
| Android release for Play      |     ✅     |        ✅         | Google $25 one-time|
| iOS simulator build           |     ❌     |        ✅         | No                 |
| iOS on real iPhone / TestFlight|    ❌     |        ✅         | Apple $99/year     |
| iOS App Store                 |     ❌     |        ✅         | Apple $99/year     |

---

## TL;DR for you, right now
1. **Today:** install Node + Android Studio, run `build-android.bat`, copy the APK to your
   Android phone, tap to install. You're testing within the hour.
2. **Next:** push to GitHub, run Codemagic's `ios-simulator-test` to confirm the iOS build.
3. **When ready to ship:** get the Google ($25) and Apple ($99/yr) accounts and use the
   release steps above.
