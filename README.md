# Deutsch Wortschatz — German Vocabulary App (A1–B1)

## ▶️ Try it & share

**Open in any browser — no install, no sign-up:** **https://sudheshnar.github.io/deutsch-wortschatz/**

<p align="center">
  <img src="docs/wortschatz_qr.png" alt="QR code — open Deutsch Wortschatz" width="200">
</p>

Scan the QR (or open the link) → on a phone, tap **Share → Add to Home Screen** for an app icon. It works **offline** after the first load. There's also a ready-to-post [share card](docs/wortschatz_share_card.png).

> **Copy-paste blurb:** *Deutsch Wortschatz — a free German vocabulary app (A1–B1): flashcards with spaced repetition, Type & Listen practice, a themed phrasebook, daily stories with audio, and games. Works offline, no sign-up.* https://sudheshnar.github.io/deutsch-wortschatz/

---

**Quick links**

| I want to… | See |
|---|---|
| Install on an iPhone (step by step) | [`docs/Deutsch_Wortschatz_iPhone_Install_Guide.pdf`](docs/Deutsch_Wortschatz_iPhone_Install_Guide.pdf) |
| Read the product spec | [`docs/PRD.md`](docs/PRD.md) |
| Read the technical design | [`docs/TDD.md`](docs/TDD.md) |
| Read the test report (118/118 passing) | [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) |
| See the content-quality audit | [`docs/CONTENT_AUDIT.md`](docs/CONTENT_AUDIT.md) |
| Run the automated tests / audit | `npm test` · `npm run audit` |
| CI (tests + Android build + web deploy) | GitHub Actions — `.github/workflows/` |
| Build & test on Android (Windows) | `BUILD_GUIDE_WINDOWS.md` → run `build-android.bat` |

> All docs are Markdown (they render on GitHub): [`PRD.md`](docs/PRD.md), [`TDD.md`](docs/TDD.md), [`TEST_REPORT.md`](docs/TEST_REPORT.md), and [`CONTENT_AUDIT.md`](docs/CONTENT_AUDIT.md).

---


A complete iOS/Android app built with **Capacitor**, wrapping the Wortschatz web app
(flashcards, spaced-repetition reviews, games, audio pronunciation, daily history)
into a native app you can run on an iPhone and submit to the App Store.

Your whole app lives in **`www/index.html`** — one self-contained file. Capacitor
wraps it in a native shell and gives it real device storage, status-bar control,
and a splash screen.

---

## Features

- **Flashcards** across **A1, A2 and B1** (4,537 curated words) + a **1,039-entry themed phrasebook**.
- **Three study modes:** Flip · **Type** (active recall) · **Listen** (dictation).
- **Smarter spaced repetition** — per-card ease + interval (SM-2-lite).
- **Daily stories** (270) with audio, translation, and a comprehension quiz.
- **My Words** — add your own vocabulary; it persists until you delete it.
- **Daily reminder** (opt-in notification), **Home activity heatmap**, and streaks.
- **System / Light / Dark theme** and an accessibility pass (zoom, focus, reduced-motion, screen-reader labels).
- **Automatic on-device backup** (rides your iCloud/Google backup) + manual export/import.
- **German text-to-speech**, fully **offline**, **no account** — all data stays on the device.

---

## What you need (one time)

1. **A Mac** (required by Apple to build iOS apps).
2. **Xcode** — free from the Mac App Store. Open it once after install so it finishes setup.
3. **Node.js 18+** — https://nodejs.org (the LTS version is fine).
4. **CocoaPods** — run in Terminal: `sudo gem install cocoapods`
5. An **Apple ID**. A paid **Apple Developer account** ($99/yr) is only needed to publish
   to the App Store — *not* to test on your own iPhone.

---

## Quick start

Open Terminal, `cd` into this folder, then:

```bash
./setup.sh
```

That installs everything, adds the iOS project, generates icons, and syncs.
When it finishes:

```bash
npx cap open ios
```

Xcode opens. Plug in your iPhone (or pick a simulator) from the device dropdown at
the top, then press the ▶ **Run** button. The app installs and launches.

> First time on a real device: Xcode → select the **App** target → **Signing &
> Capabilities** → check **Automatically manage signing** → choose your Apple ID
> under **Team**. On the iPhone, after first install, go to **Settings → General →
> VPN & Device Management** and trust your developer certificate.

---

## Manual setup (if you prefer step-by-step)

```bash
npm install                 # install Capacitor + plugins
npx cap add ios             # create the native iOS project
npx cap add android         # (optional) Android too
npm run icons               # generate all icon/splash sizes from assets/icon.png
npx cap sync                # copy www/ into the native projects
npx cap open ios            # open in Xcode
```

---

## The one rule to remember

**Every time you change `www/index.html`, run:**

```bash
npx cap sync
```

…then re-run from Xcode. That's the entire edit loop. `sync` copies your updated
web app into the native project.

To preview in a browser without Xcode while editing:

```bash
npm run dev          # serves www/ at http://localhost:3000
```

---

## Login & levels

- **Local profile login.** On first launch the app asks for a name and an optional
  numeric PIN, stored only on-device. Returning users see a welcome (and a PIN unlock
  if they set one). There's no server and no account — nothing leaves the phone.
  "Forgot PIN" clears the PIN without deleting progress.
- **CEFR levels (A1–C1).** Onboarding asks which level to learn and how many words per
  day. Each level keeps **its own separate progress, reviews, and history**, so a user
  can learn A2 and B1 in parallel and switch freely in Settings.
- **Words currently loaded:** **A1, A2 and B1** are fully loaded (**4,537** curated words), plus a **1,039-entry** themed phrasebook. B2/C1 are wired into the UI and marked "coming soon" until their word lists are added. To add a level, drop its
  array into `WORDLISTS` near the top of the `<script>` in `index.html` (same word
  format as the A2 list) and it lights up automatically.

## How storage works (and why your progress is now safe)

All persistence lives in **one place** — the `DB` object near the top of the
`<script>` in `index.html`, specifically the `rawGet` / `rawSet` helpers:

- **On device:** uses Capacitor **Preferences** — native key/value storage that
  survives app relaunches *and* app updates.
- **In a browser (dev):** falls back to `localStorage` automatically.

You don't have to change anything — the same file works in both places. This is the
fix for the "doesn't remember words" problem: writes are awaited and serialized, and
flushed when the app is backgrounded.

---

## Audio pronunciation

Uses the device's built-in German text-to-speech (no network, no API key). iOS and
Android ship with a German voice. On iOS, the first tap anywhere "warms up" the voice
(Apple requires a user gesture before audio) — this is already handled in the code.

If a user's device somehow has no German voice installed, the app shows a brief
notice instead of failing. (iOS users can add voices in **Settings → Accessibility →
Spoken Content → Voices → German**.)

---

## Storage display & backup/restore (in Settings)

The **Settings** screen now shows:

- **Storage** — how much space the user's progress occupies (typically 10–30 KB even
  after months of use) plus a breakdown of words in progress, scheduled reviews, and
  days of history. It also reminds the user that the built-in dictionary doesn't count
  toward this.
- **Backup & restore:**
  - **Automatic backup** — the app writes a small backup file to its Documents folder when
    it goes to the background, so it's included in the device's iCloud/Google backup. Settings
    shows the last backup time and a one-tap **"Restore latest auto-backup."**
  - **Export** writes a small `.json` backup. On device it opens the native iOS/Android
    **share sheet** (save to Files, AirDrop, email, etc.) via the Filesystem + Share
    plugins; in a browser it downloads the file.
  - **Import** lets the user pick a backup file and restore it (with a confirmation that
    shows what's in the backup first). This is how a user moves progress to a new phone.

These use two extra plugins already listed in `package.json`:
`@capacitor/filesystem` and `@capacitor/share`. `./setup.sh` and `npm install` pick
them up automatically — no extra steps.

---

## Customising

| What | Where |
|------|-------|
| App name | `capacitor.config.json` → `appName`, and Xcode → target → **Display Name** |
| Bundle ID | `capacitor.config.json` → `appId` (use your own, e.g. `com.yourname.wortschatz`) |
| App icon | replace `assets/icon.png` (1024×1024), then `npm run icons` + `npx cap sync` |
| Splash screen | replace `assets/splash.png` (2732×2732), then `npm run icons` + `npx cap sync` |
| Colors / words / games | edit `www/index.html` directly, then `npx cap sync` |
| Theme colors | edit the CSS `--` tokens in `:root` and the `:root[data-theme="light"]` block |

> **Before publishing:** the app collects no personal data (everything stays on-device),
> so a simple privacy-policy URL is enough for App Store review. (The old yellow dev
> "test date" bar has already been removed.)

---

## Publishing to the App Store (overview)

1. In **App Store Connect** (https://appstoreconnect.apple.com) create a new app
   record with your bundle ID.
2. In Xcode: set a **version** and **build** number, pick a real signing **Team**.
3. **Product → Archive**. When the Organizer opens, **Distribute App → App Store Connect**.
4. Back in App Store Connect, add screenshots, description, age rating, then submit
   for review.

Apple's review usually takes a day or two. Common first-submission needs: a privacy
policy URL (even a simple one — your app collects no personal data, which you can
state), and screenshots at the required iPhone sizes.

---

## Project structure

```
wortschatz-app/
├── www/
│   └── index.html         ← your entire app (native-storage version)
├── assets/
│   ├── icon.png           ← 1024×1024 app icon source
│   └── splash.png         ← 2732×2732 splash source
├── capacitor.config.json  ← app id, name, splash/status-bar config
├── package.json           ← dependencies + handy npm scripts
├── setup.sh               ← one-shot setup
├── .gitignore
└── README.md              ← this file
```

That's it. Run `./setup.sh`, then `npx cap open ios`, and you're on a real iPhone.
