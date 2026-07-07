# Deutsch Wortschatz — Product Requirements Document (PRD)

**German Vocabulary Learning App · A1 · A2 · B1**
**Version 1.1 · 2026-07-07**

> This is the Markdown source of record for the PRD (supersedes the earlier `Deutsch_Wortschatz_PRD.docx`). Companion documents: [`TDD.md`](TDD.md) (how it's built) and [`TEST_REPORT.md`](TEST_REPORT.md) (how it's verified).

---

## 1. Overview

Deutsch Wortschatz helps learners build German vocabulary and reading comprehension across CEFR levels **A1, A2 and B1**. It combines spaced-repetition flashcards, light games, a themed phrasebook, and a daily short-story feature with audio and comprehension quizzes. The app runs **fully offline**, stores all data **locally on the device**, and requires **no account or sign-up**.

It is delivered as a **cross-platform app** — **web, Android and iOS** — built with the Capacitor framework wrapping a single self-contained web application. The same `www/index.html` powers all three targets.

### 1.1 Purpose of this document
The PRD defines *what* the product does and the requirements it must meet. The Technical Design Document describes *how* it is built; the Test Report records *how* it is verified.

### 1.2 Vision
Make daily German vocabulary practice effortless and genuinely sticky — through bite-sized goals, scientifically-spaced reviews, and engaging, level-appropriate reading — so an independent learner can progress from A1 to B1 with a single, private, offline app.

---

## 2. Goals & success metrics

| Goal | Success measure |
|------|-----------------|
| Help users learn and retain vocabulary | % of due reviews completed; growth in "known" words per level |
| Build a daily learning habit | Day-over-day streak length; daily-goal completion rate |
| Make reading practice approachable | Stories opened per week; quiz completion rate |
| Respect learner privacy | Zero personal data leaves the device (offline-first) |
| Work for everyone, everywhere | Functions with no network; no login required |

---

## 3. Target users & personas

- **Primary — the self-directed beginner.** An adult learning independently alongside work/family, who wants short, daily, low-friction practice on their phone and values privacy and offline use.
- **Secondary — the structured improver.** An A2/B1 learner consolidating vocabulary who wants to focus only on new words for their level, plus reading practice.
- **Tertiary — the young/casual learner.** Responds to games, emoji quizzes and memorable example sentences rather than rote lists.

---

## 4. Scope

### 4.1 In scope (current release)
- **Three vocabulary levels:** A1 (556 words), A2 (1,141), B1 (2,838) — **4,535 curated level words**.
- **Themed phrasebook** ("Themen-Wortschatz"): **1,039 entries across 21 topics** (greetings, food, travel, home, health, technology, …).
- **Flashcard study** with German↔English, articles, and natural example sentences.
- **Spaced-repetition review** scheduling (5 boxes: 5, 10, 20, 40, 80 days).
- **Daily stories:** 270 total (90 per level ≈ a 3-month course each), with audio, sentence-level translation, and a comprehension quiz.
- **Vocabulary filter:** hide words already learned at lower levels.
- **Games** and emoji picture quizzes.
- **My Words:** user-added custom vocabulary, studyable alongside the built-in words.
- **Daily goal, streak tracking, and per-level progress** (each level keeps independent progress/reviews/history).
- **Local profile with optional numeric PIN;** fully offline local storage.
- **German text-to-speech** for words and story sentences.
- **Backup & restore:** export/import a small JSON backup via the native share sheet.

### 4.2 Out of scope (current release)
- User accounts, cloud sync, or cross-device progress.
- B2 and C1 content (UI reserves them as "coming soon").
- Social features, leaderboards or chat.
- Online connectivity, ads, or in-app purchases.

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
| FR-12 | Schedule reviews via a 5-box spaced-repetition system (5/10/20/40/80 days). | Must |
| FR-13 | Rating "Got it" promotes a word to the next box; "Again" reschedules at the current interval. | Must |
| FR-14 | Offer German audio (TTS) for each word and example. | Must |
| FR-15 | Vocabulary filter hides words tagged to a lower level. | Should |
| FR-16 | "My Words" lets users add/edit/delete custom vocabulary, usable in study, review and games. | Should |
| FR-17 | Themed phrasebook lets users browse and study vocabulary by topic. | Should |

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

---

## 6. Non-functional requirements
- **Offline-first:** all core features work with no network.
- **Privacy:** no accounts, no analytics that leave the device, no third-party runtime calls in the core app.
- **Performance:** instant navigation; storage footprint typically 10–30 KB even after months of use.
- **Portability:** one codebase → web, Android, iOS.
- **Quality:** core logic covered by an automated test suite (see Test Report); target 100% pass before release.

---

## 7. Acceptance criteria
- A new user can onboard, learn a daily batch, and return to due reviews the next day (simulatable via the test-date bar).
- Progress, streaks and history persist across relaunch and are independent per level.
- Audio plays for words and stories on both iOS and Android.
- Backup export/import round-trips a user's progress.
- The automated suite passes (currently **70/70**); the manual UI checklist passes on a device.
