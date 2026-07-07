# Deutsch Wortschatz — Technical Design Document (TDD)

**Architecture, data model & build pipeline**
**Version 1.1 · 2026-07-07**

> Markdown source of record (supersedes `Deutsch_Wortschatz_TDD.docx`). Companions: [`PRD.md`](PRD.md), [`TEST_REPORT.md`](TEST_REPORT.md).

---

## 1. Summary

Deutsch Wortschatz is a single-page web application packaged as native mobile apps using **Capacitor 6**. All UI, content (vocabulary, phrasebook, stories) and logic live in **one self-contained HTML file** (`www/index.html`, ≈1.14 MB). There is **no backend**; all state persists locally on the device. This keeps the app fully offline, private, and trivially portable across **web, iOS and Android** from a single source.

---

## 2. Architecture overview

Three layers: a native shell, the web application, and the local persistence store. There are **no network calls, servers, or third-party runtime services** in the core app.

```
┌─────────────────────────────────────────────────┐
│  Native shell (Capacitor)                         │
│  • iOS (WKWebView)   • Android (WebView)   • Web  │
│  • Plugins: Preferences, Filesystem, Share,       │
│    SplashScreen, StatusBar, TextToSpeech,         │
│    SpeechRecognition                              │
│                                                   │
│   ┌───────────────────────────────────────────┐  │
│   │  Web app  (www/index.html)                 │  │
│   │  • Content: WORDS_A1 / WORDS / WORDS_B1,    │  │
│   │    THEMES, STORIES                          │  │
│   │  • Logic: SRS, sessions, filter, rotation   │  │
│   │  • DB module (profiles, levels, storage)    │  │
│   │  • Render functions (screens) + router      │  │
│   │  • TextToSpeech plugin / Web Speech (TTS)   │  │
│   └────────────────┬──────────────────────────┘  │
│                    │ read / write state           │
│   ┌────────────────▼──────────────────────────┐  │
│   │  Local persistence                         │  │
│   │  Capacitor Preferences (native)            │  │
│   │  / localStorage (web dev fallback)         │  │
│   └───────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

---

## 3. Technology stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Native wrapper | Capacitor 6 | Wraps the web app as iOS/Android apps; native plugins |
| UI / logic | Vanilla JavaScript, HTML, CSS | Single-file SPA; no framework or build step for the web layer |
| Audio (out) | `@capacitor-community/text-to-speech` + Web Speech API | On-device German TTS for words & stories |
| Speech (in) | `@capacitor-community/speech-recognition` | On-device STT (declared; reserved for the planned tutor) |
| Persistence | `@capacitor/preferences` / `localStorage` | Local key-value store for all user state |
| Files / sharing | `@capacitor/filesystem`, `@capacitor/share` | Backup export/import via the native share sheet |
| Native build | Xcode (iOS), Gradle (Android) | Compiles the native app / IPA / APK |
| Icons/splash | `@capacitor/assets` | Generates launcher icons and splash screens |
| Tests | Node.js `vm` harness (`tests/run.js`) | Executes real app logic in a mocked-browser sandbox |

---

## 4. Application structure

The web app is organised by concern inside one file: content data, pure logic, a data-store module, and per-screen render functions invoked by a simple screen router (`showScreen`).

| Module / area | Responsibility |
|---------------|----------------|
| `WORDS_A1` / `WORDS` / `WORDS_B1` | Vocabulary datasets (556 / 1,141 / 2,838 entries). B1 nouns use `{art, base, pl}`; other entries use `{w}`. Recurring entries carry a `level` tag for the filter. |
| `WORDLISTS` | Maps each CEFR level to its dataset (`{A1, A2, B1, B2, C1}`); single lookup point. |
| `THEMES` | Themed phrasebook — 21 topic groups, 1,039 entries; each entry has the same word schema. |
| `STORIES` | 270 story objects (90 per level): `{id, level, title, sentences:[{de,en}], quiz}`. |
| `WORD_BY_ID` | Index of every word by a stable ID (`wid`), so lookups work regardless of level. |
| `DB` module | Profiles, levels, load/save/migrate; exposes `get()`, `setLevel()`, `loginAs()`, `logout()`, `importData()`, `reset()`, custom-word CRUD, `serialize()`, `sizeBytes()`. |
| SRS core | `INTERVALS`, `ensureProg`, `rateWord`, `dueReviewIds`, `scheduledReviews`, `pullNewBatch`, `buildSession`. |
| `activeWords()` | Words to study for the current level/theme/custom set, applying the vocabulary filter. |
| Render functions | `renderHome`, `renderStudy`, `renderReview`, `renderStories`, `renderThemes`, `renderMyWords`, `renderHistory`, `renderSettings`, … |

---

## 5. Data model

### 5.1 Word schema
- **Noun:** `{ art:"der|die|das", base:"Haus", pl:"Häuser", type:"noun", en, ex, level? }`
- **Non-noun:** `{ w:"gehen", type:"verb|adj|other|phrase", en, ex, level? }`
- **ID (`wid`):** nouns → `N:<art>:<base>`; others → `<type>:<w>`; an explicit `id` (custom words) overrides.
- `germanOf(w)` returns the display word (`base` for nouns, else `w`); `fullGerman(w)` prepends the article for nouns.

### 5.2 Story schema
`{ id, level, emoji, title, titleEn, blurb, sentences:[{de,en}], quiz? }` — rotated deterministically per day via `rotationFor()` (a fixed epoch + per-cycle seeded shuffle).

### 5.3 Persisted state (storage shape v2)
```
{ profiles: { "<name>": profileBlob }, activeName: "<name>"|null }
```
Each `profileBlob`: `{ profile:{name,pin}, currentLevel, settings:{reviewMode,dailyGoal,autoReview,hideLowerLevel}, levels:{A1..C1:{progress,days}}, storiesDone, customWords, simOffset, firstRun }`. Per-level `progress[id] = {box,due,graduated,lastSeen}`; `days["yyyy-mm-dd"] = {new:[], reviewed:[{id,result}]}`.

Persistence lives in one place (the `DB` module's `rawGet`/`rawSet`): **Capacitor Preferences** on device (survives relaunch and app updates), **localStorage** in a browser. Writes are awaited/serialized and flushed on background/pagehide.

---

## 6. Core algorithms

- **Spaced repetition.** Boxes `[5,10,20,40,80]` days. "Got it" → `box = min(box+1, 4)`, `due = today + INTERVALS[box]`. "Again" → keep box, `due = today + INTERVALS[box]`. `dueReviewIds()` returns entries with `due ≤ today`. Date is computed via `today()` with a `simOffset` hook (the QA "test date" bar; also drives date-dependent tests).
- **Daily batch.** `pullNewBatch(n)` picks `n` not-yet-seen words from `activeWords()`, seeds `progress` at box 0, and logs them in today's `new`.
- **Session build.** `buildSession()` merges today's un-rated new words with due reviews per `reviewMode` (`mixed` / `within` / `separate`); `autoReview:false` excludes due reviews from the daily session.
- **Vocabulary filter.** When `hideLowerLevel` is on, `activeWords()` drops entries whose `level` is below the current CEFR level.

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
```

- **iOS** builds locally with Xcode (CocoaPods); `Info.plist` includes microphone + speech usage strings.
- **Android** builds with Gradle.
- **CI:** `codemagic.yaml` defines cloud Android and iOS (simulator + signed) workflows.
- **The one rule:** after editing `www/index.html`, run `npx cap sync` before rebuilding native.

---

## 8. Testing

`tests/run.js` loads the app's real script into a Node `vm` sandbox with mocked browser globals and asserts across 15 areas (word data, content quality, themes, IDs, filter, SRS, sessions, profiles/levels, persistence, custom words, stories, date/streak, config, build). Run with `npm test`; regenerate the report with `npm run test:report`. Current status: **70/70 passing**. See [`TEST_REPORT.md`](TEST_REPORT.md).

---

## 9. Key design decisions

- **Single self-contained file.** No build step for the web layer keeps the app easy to reason about, diff and ship; Capacitor adds native capability without a framework.
- **One source, three platforms.** `www/index.html` drives web, Android and iOS; native folders are thin shells.
- **Offline & private by default.** No backend or accounts; all data stays on device. The planned AI tutor is deliberately additive and gated to preserve this default.
- **Storage abstraction in one place.** Swapping native vs. browser storage is a two-function change (`rawGet`/`rawSet`).
- **Test hook baked in.** `simOffset` makes date-dependent behaviour deterministically testable and lets QA fast-forward days.
