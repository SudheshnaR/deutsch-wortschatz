# Deutsch Wortschatz — Product Requirements Document (PRD)

**German Vocabulary Learning App · A1 · A2 · B1**
**Version 1.2 · 2026-07-07**

> This is the Markdown source of record for the PRD (supersedes the earlier `Deutsch_Wortschatz_PRD.docx`). Companion documents: [`TDD.md`](TDD.md) (how it's built) and [`TEST_REPORT.md`](TEST_REPORT.md) (how it's verified).
>
> **What's new in 1.2:** light/system/dark theme; three study modes (Flip / Type / Listen); smarter (SM-2-lite) spaced repetition; daily study reminders; automatic on-device backup; a Home activity heatmap; an accessibility pass; and a content-quality audit tool run in CI. All additions stay **fully offline and on-device**.

---

## 1. Overview

Deutsch Wortschatz helps learners build German vocabulary and reading comprehension across CEFR levels **A1, A2 and B1**. It combines spaced-repetition flashcards, light games, a themed phrasebook, and a daily short-story feature with audio and comprehension quizzes. The app runs **fully offline**, stores all data **locally on the device**, and requires **no account or sign-up**.

It is delivered as a **cross-platform app** — **web, Android and iOS** — built with the Capacitor framework wrapping a single self-contained web application. The same `www/index.html` powers all three targets.

### 1.1 Purpose of this document
The PRD defines *what* the product does and the requirements it must meet. The Technical Design Document describes *how* it is built; the Test Report records *how* it is verified.

### 1.2 Vision
Make daily German vocabulary practice effortless and genuinely sticky — through bite-sized goals, scientifically-spaced reviews, active-recall and listening drills, and engaging, level-appropriate reading — so an independent learner can progress from A1 to B1 with a single, private, offline app.

---

## 2. Goals & success metrics

| Goal | Success measure |
|------|-----------------|
| Help users learn and retain vocabulary | % of due reviews completed; growth in "known" words per level |
| Build a daily learning habit | Day-over-day streak length; daily-goal completion rate; reminder opt-in rate |
| Strengthen recall, not just recognition | Use of Type/Listen modes; accuracy trend over time |
| Make reading practice approachable | Stories opened per week; quiz completion rate |
| Respect learner privacy | Zero personal data leaves the device (offline-first) |
| Work for everyone, everywhere | Functions with no network; no login required; accessible & theme-aware |

---

## 3. Target users & personas

- **Primary — the self-directed beginner.** An adult learning independently alongside work/family, who wants short, daily, low-friction practice on their phone and values privacy and offline use.
- **Secondary — the structured improver.** An A2/B1 learner consolidating vocabulary who wants to focus only on new words for their level, plus reading and active-recall practice.
- **Tertiary — the young/casual learner.** Responds to games, emoji quizzes and memorable example sentences rather than rote lists.

---

## 4. Scope

### 4.1 In scope (current release)
- **Three vocabulary levels:** A1, A2 and B1 — **4,537 curated level words** (plus the phrasebook below; **5,576 entries total**, verified by `npm run audit`).
- **Themed phrasebook** ("Themen-Wortschatz"): **1,039 entries across 21 topics** (greetings, food, travel, home, health, technology, …), including a dedicated `phrase` type.
- **Flashcard study** with German↔English, articles, and natural example sentences.
- **Browse "All Words"** with search and word-type filters — Nouns, Verbs, Adjectives, **Präpositionen (prepositions)**, and Other.
- **Three study modes** — **Flip** (classic reveal), **Type** (active recall: type the German for an English prompt, with forgiving grading), and **Listen** (dictation: hear the German and type what you heard). All three feed the same schedule and daily goal.
- **Spaced-repetition review** with a per-card **ease factor + interval (SM-2-lite)**: correct answers stretch the interval, misses shrink it — so easy words return rarely and tricky ones come back soon.
- **Daily stories:** 270 total (90 per level ≈ a 3-month course each), with audio, sentence-level translation, and a comprehension quiz.
- **Vocabulary filter:** hide words already learned at lower levels.
- **Games** and emoji picture quizzes.
- **My Words:** user-added custom vocabulary — **persisted permanently until the user deletes it** — studyable alongside the built-in words.
- **Daily goal, streak tracking, per-level progress, and a Home activity heatmap** (last 12 weeks). Each level keeps independent progress/reviews/history.
- **Daily study reminder:** an opt-in local notification at a user-chosen time.
- **Appearance:** **System / Light / Dark** theme that can follow the device setting.
- **Accessibility:** pinch-to-zoom, visible keyboard focus, reduced-motion support, and screen-reader labels on icon controls.
- **Local profile with optional numeric PIN;** fully offline local storage.
- **German text-to-speech** for words and story sentences.
- **Backup & restore:** **automatic** on-device backup (written to the app's Documents, so it rides the device's iCloud/Google backup) **plus** manual export/import of a JSON file via the native share sheet.

### 4.2 Out of scope (current release)
- User accounts, cloud sync, or cross-device progress (the automatic backup is per-device, not cross-device sync).
- B2 and C1 content (UI reserves them as "coming soon").
- Social features, leaderboards or chat.
- Online connectivity, ads, or in-app purchases in the core app.

### 4.3 Roadmap (planned, not yet built)
- **Interactive AI tutor** — a voice-in/voice-out German tutor (ask-me-anything grammar/vocabulary help, plus conversation practice, role-play, and pronunciation coaching) powered by Claude. This introduces optional network use and a backend; it will be additive and gated so the core app stays offline and private. See a future design doc before implementation.

---

## 5. Functional requirements

Priorities: **Must / Should / Could.** Applies to all levels unless noted.

### 5.1 Onboarding & profile
| ID | Requirement | Prio |
|----|-------------|------|
| FR-01 | Create a local profile with a name and optional numeric PIN (no email/account). | Must |
| FR-02 | Select a starting level (A1/A2/B1), switchable later in Settings. | Must |
| FR-03 | When a level above A1 is chosen, offer the vocabulary-filter choice. | Must |
| FR-04 | Returning users see a welcome/unlock screen; "Forgot PIN" clears the PIN without deleting progress. | Must |
| FR-05 | Support multiple named profiles on one device, each with isolated progress. | Should |

### 5.2 Vocabulary & study
| ID | Requirement | Prio |
|----|-------------|------|
| FR-10 | Present flashcards with the German word (article for nouns), English gloss, and an example sentence. | Must |
| FR-11 | Introduce a configurable number of new words per day (daily goal). | Must |
| FR-12 | Schedule reviews via a per-card **ease factor + interval (SM-2-lite)**; existing box-based progress migrates automatically. | Must |
| FR-13 | Rating "Got it" grows the interval by the card's ease; "Again" relearns the next day and lowers the ease (floor 1.3). | Must |
| FR-14 | Offer German audio (TTS) for each word and example. | Must |
| FR-15 | Vocabulary filter hides words tagged to a lower level. | Should |
| FR-16 | "My Words" lets users add/edit/delete custom vocabulary, usable in study, review and games; added words persist until deleted. | Should |
| FR-17 | Themed phrasebook lets users browse and study vocabulary by topic. | Should |
| FR-18 | Offer a **Type** (active-recall) mode: user types the German for an English prompt, graded leniently (case/whitespace-insensitive, article-optional, 1-character typo = "almost"). | Should |
| FR-19 | Offer a **Listen** (dictation) mode: play the German audio and let the user type what they heard, graded like Type. | Should |

### 5.3 Reading (stories)
| ID | Requirement | Prio |
|----|-------------|------|
| FR-20 | Provide a rotating "story of the day" per level, with German + English sentences. | Must |
| FR-21 | Read story sentences aloud (TTS). | Must |
| FR-22 | Offer a comprehension quiz per story and record the best score. | Should |

### 5.4 Progress, data & privacy
| ID | Requirement | Prio |
|----|-------------|------|
| FR-30 | Track daily goal completion, streaks, and per-level history. | Must |
| FR-31 | Persist all state locally; survive relaunch and app update. | Must |
| FR-32 | Keep each CEFR level's progress, reviews and history independent. | Must |
| FR-33 | Export and import a backup file (JSON) via the native share sheet. | Should |
| FR-34 | Never transmit personal data off-device in the core app. | Must |
| FR-35 | **Automatically** write an on-device backup (rides the device's iCloud/Google backup) and offer a one-tap "restore latest auto-backup." | Should |
| FR-36 | Show a Home **activity heatmap** of the last ~12 weeks of study. | Could |

### 5.5 Habit, appearance & accessibility
| ID | Requirement | Prio |
|----|-------------|------|
| FR-40 | Offer an **opt-in daily reminder** (local notification) at a user-chosen time; request permission on enable and cancel on disable. | Should |
| FR-41 | Offer a **System / Light / Dark** appearance setting that can follow the device theme; apply on launch and sync the native status bar. | Should |
| FR-42 | Meet baseline **accessibility**: allow pinch-zoom, provide visible keyboard focus, respect reduced-motion, and label icon-only controls for screen readers. | Should |

---

## 6. Non-functional requirements
- **Offline-first:** all core features work with no network.
- **Privacy:** no accounts, no analytics that leave the device, no third-party runtime calls in the core app.
- **Performance:** instant navigation; storage footprint typically 10–30 KB even after months of use.
- **Portability:** one codebase → web, Android, iOS.
- **Appearance:** theme-aware (light/dark/system) with adequate contrast in both modes.
- **Accessibility:** zoomable, keyboard-focusable, reduced-motion-aware, screen-reader-labelled controls.
- **Quality:** core logic covered by an automated test suite **run in CI on every change**; a content-quality audit guards the vocabulary data. Target 100% pass before release.

---

## 7. Acceptance criteria
- A new user can onboard, learn a daily batch (in Flip, Type or Listen mode), and return to due reviews the next day.
- Reviews reschedule per the SM-2-lite ease/interval model; existing progress migrates without loss.
- Progress, streaks and history persist across relaunch and are independent per level; custom words persist until deleted.
- Audio plays for words and stories on both iOS and Android; the daily reminder fires when enabled.
- Backup export/import round-trips a user's progress, and the automatic on-device backup restores.
- Light and dark themes are both fully readable (no invisible text).
- The automated suite passes (currently **110/110**) in CI, the content audit reports **0 hard errors**, and the manual UI checklist passes on a device.
