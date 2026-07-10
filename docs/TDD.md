# Deutsch Wortschatz — Technical Design Document (TDD)

**Architecture, data model & build pipeline**
**Version 1.3 · 2026-07-10**

> Markdown source of record. Companions: [`PRD.md`](PRD.md), [`TEST_REPORT.md`](TEST_REPORT.md), [`CONTENT_AUDIT.md`](CONTENT_AUDIT.md).
>
> **Changes in 1.3:** learning (flip-only) and testing (type/listen) are now **separate** — a post-session **Test yourself** step + Home shortcuts (`runTest`/`renderTest`/`retryMissed`/`learnedTodayIds`/`learnedAllIds`); a **Präpositionen** (`prep`) tab; **dict.cc** look-up via the in-app `@capacitor/browser`.
> **1.2:** light/system theme via CSS design tokens; SM-2-lite spaced repetition (box→ease migration); daily local notifications; automatic on-device backup; Home activity heatmap; accessibility pass; content-audit tool; GitHub Actions CI. The QA "test-date" bar was removed (the `simOffset` hook remains for tests).

---

## 1. Summary

Deutsch Wortschatz is a single-page web application packaged as native mobile apps using **Capacitor 6**. All UI, content (vocabulary, phrasebook, stories) and logic live in **one self-contained HTML file** (`www/index.html`, ≈1.16 MB). There is **no backend**; all state persists locally on the device. This keeps the app fully offline, private, and trivially portable across **web, iOS and Android** from a single source.

---

## 2. Architecture overview

Three layers: a native shell, the web application, and the local persistence store. There are **no network calls, servers, or third-party runtime services** in the core app.

```
┌─────────────────────────────────────────────────┐
│  Native shell (Capacitor)                         │
│  • iOS (WKWebView)   • Android (WebView)   • Web  │
│  • Plugins: Preferences, Filesystem, Share,       │
│    SplashScreen, StatusBar, TextToSpeech,         │
│    SpeechRecognition, LocalNotifications          │
│                                                   │
│   ┌───────────────────────────────────────────┐  │
│   │  Web app  (www/index.html)                 │  │
│   │  • Content: WORDS_A1 / WORDS / WORDS_B1,    │  │
│   │    THEMES, STORIES                          │  │
│   │  • Logic: SM-2 SRS, sessions, study modes,  │  │
│   │    filter, rotation, theme, reminders       │  │
│   │  • DB module (profiles, levels, storage)    │  │
│   │  • Render functions (screens) + router      │  │
│   │  • TextToSpeech plugin / Web Speech (TTS)   │  │
│   └────────────────┬──────────────────────────┘  │
│                    │ read / write state           │
│   ┌────────────────▼──────────────────────────┐  │
│   │  Local persistence                         │  │
│   │  Capacitor Preferences (native)            │  │
│   │  / localStorage (web dev fallback)         │  │
│   │  + auto-backup file in Documents           │  │
│   └───────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

---

## 3. Technology stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Native wrapper | Capacitor 6 | Wraps the web app as iOS/Android apps; native plugins |
| UI / logic | Vanilla JavaScript, HTML, CSS | Single-file SPA; no framework or build step for the web layer |
| Theming | CSS custom properties (design tokens) | Light/dark/system theme by swapping `:root` tokens; `prefers-color-scheme` |
| Audio (out) | `@capacitor-community/text-to-speech` + Web Speech API | On-device German TTS for words & stories |
| Speech (in) | `@capacitor-community/speech-recognition` | On-device STT (declared; reserved for the planned tutor) |
| Reminders | `@capacitor/local-notifications` | Opt-in daily study reminder |
| Persistence | `@capacitor/preferences` / `localStorage` | Local key-value store for all user state |
| Files / sharing | `@capacitor/filesystem`, `@capacitor/share` | Manual export/import + automatic on-device backup file |
| Native build | Xcode (iOS), Gradle (Android) | Compiles the native app / IPA / APK |
| Icons/splash | `@capacitor/assets` | Generates launcher icons and splash screens |
| Tests | Node.js `vm` harness (`tests/run.js`) | Executes real app logic in a mocked-browser sandbox |
| Content QA | `tests/audit.js` (`npm run audit`) | Rule-based audit of the vocabulary data |
| CI | GitHub Actions | Runs the test suite, builds Android, deploys web (Pages) on every push/PR |

---

## 4. Application structure

The web app is organised by concern inside one file: content data, pure logic, a data-store module, and per-screen render functions invoked by a simple screen router (`showScreen`).

| Module / area | Responsibility |
|---------------|----------------|
| `WORDS_A1` / `WORDS` / `WORDS_B1` | Vocabulary datasets. Nouns use `{art, base, pl}`; other entries use `{w}`. Recurring entries carry a `level` tag for the filter. |
| `WORDLISTS` | Maps each CEFR level to its dataset (`{A1, A2, B1, B2, C1}`); single lookup point. |
| `THEMES` | Themed phrasebook — 21 topic groups, 1,039 entries; adds a `phrase` type alongside noun/verb/adj/other. |
| `STORIES` | 270 story objects (90 per level): `{id, level, title, sentences:[{de,en}], quiz}`. |
| `WORD_BY_ID` | Index of every word by a stable ID (`wid`), so lookups work regardless of level. |
| `DB` module | Profiles, levels, load/save/migrate; exposes `get()`, `setLevel()`, `loginAs()`, `logout()`, `importData()`, `reset()`, custom-word CRUD (`addCustomWord`/`updateCustomWord`/…, each `save()`-backed), `serialize()`, `sizeBytes()`. |
| SRS core | `INTERVALS` (legacy, used for migration), `ensureProg`, `migrateProg`, `rateWord`, `dueReviewIds`, `scheduledReviews`, `pullNewBatch`, `buildSession`. |
| Learn / test flow | **Learn** = flip-only flashcards (`renderStudy` → `flipStudy`/`doRate` → SRS). **Test** = `renderTest` over a word set via `runTest`/`startTest`/`restartTest`/`retryMissed`, with `checkTest`/`nextTest`/`gradeTyped` — a self-check that does *not* change the schedule. Word sets: `learnedTodayIds`/`learnedAllIds`; chooser `openTestChooser`/`chooseTest`; state in the module var `test`. |
| dict.cc / browser | `dictccUrl`, `openDictcc` — open a word on dict.cc in the in-app browser (`@capacitor/browser`), with a web fallback. |
| Theme | `applyTheme`, `setTheme` — set `data-theme` on `<html>` and sync `StatusBar` style. |
| Reminders | `applyReminder`, `reminderNotification`, `reminderTimeParts`, `setReminderEnabled`, `setReminderTime`. |
| Backup | `autoBackup`, `setAutoBackup`, `restoreAutoBackup` (Filesystem, Documents dir). |
| Progress viz | `activityData`, `activityHeatmap` (last 12 weeks per current level). |
| `activeWords()` | Words to study for the current level/theme/custom set, applying the vocabulary filter. |
| Render functions | `renderHome`, `renderStudy`, `renderReview`, `renderStories`, `renderThemes`, `renderMyWords`, `renderHistory`, `renderSettings`, … |

---

## 5. Data model

### 5.1 Word schema
- **Noun:** `{ art:"der|die|das", base:"Haus", pl:"Häuser", type:"noun", en, ex, level? }`
- **Non-noun:** `{ w:"gehen", type:"verb|adj|other|prep|phrase", en, ex, level? }` — `prep` (prepositions) is surfaced as a filter tab in "All Words"; `phrase` is used by the phrasebook.
- **ID (`wid`):** nouns → `N:<art>:<base>`; others → `<type>:<w>`; an explicit `id` (custom words) overrides.
- `germanOf(w)` returns the display word (`base` for nouns, else `w`); `fullGerman(w)` prepends the article for nouns.

### 5.2 Story schema
`{ id, level, emoji, title, titleEn, blurb, sentences:[{de,en}], quiz? }` — rotated deterministically per day via `rotationFor()` (a fixed epoch + per-cycle seeded shuffle).

### 5.3 Persisted state (storage shape v2)
```
{ profiles: { "<name>": profileBlob }, activeName: "<name>"|null }
```
Each `profileBlob`:
```
{ profile:{name,pin}, currentLevel,
  settings:{ reviewMode, dailyGoal, autoReview, hideLowerLevel,
             theme:"system|light|dark", studyStyle:"flip|type|listen",
             reminder:{enabled,time}, autoBackup, lastBackupAt },
  levels:{ A1..C1:{ progress, days } }, storiesDone, customWords, simOffset, firstRun }
```
Per-level `progress[id] = { box, due, graduated, lastSeen, ease, reps, interval }` (SM-2-lite; `box` retained for backward compatibility); `days["yyyy-mm-dd"] = { new:[], reviewed:[{id,result}] }`. `normalize()` backfills any missing settings/fields on load, so older backups upgrade cleanly.

Persistence lives in one place (the `DB` module's `rawGet`/`rawSet`): **Capacitor Preferences** on device (survives relaunch and app updates), **localStorage** in a browser. Writes are awaited/serialized and flushed on background/pagehide; the same lifecycle triggers the automatic backup.

---

## 6. Core algorithms

- **Spaced repetition (SM-2-lite).** Each card has an `ease` (default 2.5, clamped **1.3–2.7**) and an `interval` in days. "Got it" → `ease += 0.05`; interval grows `1 → 4 → round(interval × ease)`; `reps++`. "Again" → `ease −= 0.2`, `reps = 0`, `interval = 1` (relearn tomorrow). `due = today + interval`. Legacy box-only entries are migrated on first touch (`migrateProg`: `interval = INTERVALS[box]`, `ease = 2.5`). `dueReviewIds()` returns entries with `due ≤ today`.
- **Learn → test.** The Study session is **flip-only** (learn: flip, hear, rate → `rateWord` sets the SRS). After the queue, a **Test yourself** screen starts a self-test (`runTest(mode, ids)` sets the `test` state and reuses the type/listen render). `gradeTyped()` normalises both sides (`normalizeAnswer`: lowercase, trim, strip article, drop punctuation) → `correct` / `almost` (Levenshtein ≤ 1) / `wrong`. Tests **never call `rateWord`** (self-check only); missed ids are collected for `retryMissed`. Home entry points test today's words (`learnedTodayIds`) or all learned words (`learnedAllIds`).
- **Daily batch & session.** `pullNewBatch(n)` seeds `n` unseen words; `buildSession()` merges today's un-rated new words with due reviews per `reviewMode` (`mixed`/`within`/`separate`); `autoReview:false` holds due reviews in the Review tab.
- **Vocabulary filter.** When `hideLowerLevel` is on, `activeWords()` drops entries whose `level` is below the current CEFR level.
- **Theme.** `applyTheme()` sets `document.documentElement.dataset.theme` to the setting; CSS overrides the `:root` surface tokens (`--bg/--bg2/--card/--card2/--txt/--dim/--line`) for light, and `@media (prefers-color-scheme: light)` handles "system". The native status-bar style is synced to match.
- **Reminders.** `applyReminder()` cancels any existing notification and, if enabled, requests permission and schedules a daily repeating notification at `reminder.time`; re-synced on every launch. No-ops gracefully where the plugin is absent (web/tests).
- **Auto-backup.** On background/leave, `autoBackup()` writes `wortschatz-backup.json` to the app's Documents directory (included in the device's iCloud/Google backup) and records `lastBackupAt`; `restoreAutoBackup()` reads and re-imports it.
- **Activity heatmap.** `activityData(weeks=12)` counts `new + reviewed` per day from the day log; `activityHeatmap()` renders an inline-SVG-free grid of shaded cells.

---

## 7. Build pipeline

The native `ios/` and `android/` projects are **committed to the repo** (generated with `npx cap add`). Typical flow:

```bash
npm install            # Capacitor core + plugins
npm run icons          # generate iOS/Android icons + splash from assets/
npx cap sync           # copy www/ into the native projects, update plugins/pods
npx cap open ios       # → Xcode  (▶ Run to a simulator or device)
npx cap open android   # → Android Studio
npm test               # run the automated suite
npm run audit          # run the content-quality audit
```

- **iOS** builds locally with Xcode (CocoaPods); `Info.plist` includes microphone + speech usage strings. Local notifications need no extra Info.plist key (permission is requested at runtime).
- **Android** builds with Gradle.
- **CI (GitHub Actions):** `test.yml` runs `npm test` on every push/PR; **`android-build.yml` runs `npx cap sync android` → `gradlew assembleDebug` and uploads the APK as a build artifact** (each merge yields an up-to-date Android app); `pages.yml` deploys the web app to GitHub Pages from `www/`. **iOS** is built locally (Xcode) after `npx cap sync ios` — there is no cloud iOS build because Apple code-signing is required.
- **The one rule:** after editing `www/index.html`, run `npx cap sync` before rebuilding native (and after adding a plugin, `npx cap sync` updates the Podfile/Gradle modules).

---

## 8. Testing

`tests/run.js` loads the app's real script into a Node `vm` sandbox with mocked browser globals and asserts across ~21 areas — word data, content quality, themes, IDs, filter, **SM-2 spaced repetition**, sessions, profiles/levels, persistence, custom words (incl. persistence-after-reload), stories, date/streak, **study modes** (typing grading), **theme** (surface-token coverage, no hardcoded-dark-background regression), **reminders & backup** (defaults, config builder, graceful degradation), **progress heatmap**, **accessibility**, **study/test flow** (learn is flip-only; the self-test does not touch the SRS; missed-word retry), **prepositions**, **dict.cc**, config, and build. Run with `npm test`; regenerate the report with `npm run test:report`. Current status: **122/122 passing**. See [`TEST_REPORT.md`](TEST_REPORT.md).

`tests/audit.js` (`npm run audit`) rule-checks all ~5,576 vocabulary entries, separating **hard errors** (must be zero — CI-guarded: noun capitalisation, valid article/type, no fillers, no untrimmed fields, no exact duplicates) from **review candidates** (a curated shortlist for a human/native eye). It writes [`CONTENT_AUDIT.md`](CONTENT_AUDIT.md). Current status: **0 hard errors**.

---

## 9. Key design decisions

- **Single self-contained file.** No build step for the web layer keeps the app easy to reason about, diff and ship; Capacitor adds native capability without a framework.
- **One source, three platforms.** `www/index.html` drives web, Android and iOS; native folders are thin shells.
- **Offline & private by default.** No backend or accounts; all data stays on device. Reminders and backup use only on-device OS capabilities. The planned AI tutor is deliberately additive and gated to preserve this default.
- **Theme via design tokens.** All surfaces read from CSS custom properties, so light/dark is a token swap — with a regression test asserting every surface token is overridden and no component hardcodes a dark background (the bug that caused invisible text in an early light-theme build).
- **SM-2-lite, migrated not reset.** The scheduler was upgraded from fixed boxes to per-card ease/interval without discarding anyone's progress (`migrateProg` maps box → interval on load).
- **Storage abstraction in one place.** Swapping native vs. browser storage is a two-function change (`rawGet`/`rawSet`); the auto-backup layers on top of it.
- **Test hook baked in.** `simOffset` makes date-dependent behaviour deterministically testable (the user-facing "test date" bar was removed for release; the hook remains for the suite).
