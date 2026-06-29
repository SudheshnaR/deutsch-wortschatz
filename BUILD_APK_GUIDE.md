# Building the Deutsch Wortschatz APK

You have three ways to get an installable Android APK, from easiest to most hands-on.

---

## Why isn't a prebuilt APK included?
An Android APK must be **compiled** from this project using the Android SDK + Gradle + a Java
toolchain (≈1.5 GB of build tooling that downloads from the internet). That compile step can't run
in the assistant's sandbox, so this package gives you the project plus a one-command build script.
The build itself is automated and takes ~10–15 minutes the first time.

---

## Option A — One command (recommended)
**Prerequisites (one-time):**
1. Install **Node.js 18+**  → https://nodejs.org
2. Install **Android Studio** → https://developer.android.com/studio
   (it bundles the Android SDK and a compatible JDK)
3. Open Android Studio once so it finishes downloading the SDK.

**Then, from this folder:**
```bash
./build-android.sh          # macOS / Linux
```
On **Windows**, run the steps in `build-android.sh` manually in order, or use Git Bash.

When it finishes, your APK is at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Install it on a phone:**
- USB: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
- Or copy the `.apk` to the phone, tap it, and allow "install unknown apps".

---

## Option B — Android Studio GUI (no command line)
```bash
npm install
npx cap add android
npx cap sync android
npx cap open android      # opens the project in Android Studio
```
In Android Studio:  **Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)** → click **locate** to find the APK.

---

## Option C — Cloud build (no SDK on your machine)
If you don't want to install Android Studio, build in the cloud:
1. Push this folder to a GitHub repo.
2. Add the included GitHub Actions workflow (`.github/workflows/android-build.yml` — already in this package).
3. On every push, GitHub builds the APK for you and attaches it under **Actions ▸ (run) ▸ Artifacts**.

---

## Producing a RELEASE APK (for the Play Store)
The steps above build a **debug** APK (fine for testing/sideloading). For a Play Store release:
1. Generate a signing key:
   ```bash
   keytool -genkey -v -keystore release.keystore -alias wortschatz -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Configure signing in `android/app/build.gradle` (see Android docs: "Sign your app").
3. Build the release bundle:
   ```bash
   cd android && ./gradlew bundleRelease   # produces an .aab for Play Store
   # or ./gradlew assembleRelease           # produces a signed release .apk
   ```

---

## Changing the app identity before publishing
- **App ID** (`com.yourname.wortschatz`) → edit `capacitor.config.json` ▸ `appId`, then `npx cap sync`.
  Use your own reverse-domain (e.g. `com.sudheshna.deutschwortschatz`).
- **App name** → `capacitor.config.json` ▸ `appName`.
- **Icon / splash** → replace `assets/icon.png` (1024×1024) and run `npm run icons`.

## Troubleshooting
- *"SDK location not found"* → open Android Studio once, or set `ANDROID_HOME`.
- *"JAVA_HOME / Gradle / JDK version"* → use JDK 17 (Android Studio ships one under its `jbr` folder).
- *Gradle fails first run* → it's downloading dependencies; re-run once network completes.
