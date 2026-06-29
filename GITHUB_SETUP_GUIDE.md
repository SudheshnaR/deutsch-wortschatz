# GitHub Setup Guide — Deutsch Wortschatz

This walks you through creating a GitHub account and uploading the **entire project**
(app code + build configs + the PRD, TDD and Test Report documents) in about 15 minutes.

> You have to do the account creation yourself — it needs your email and identity
> verification. These steps make it quick, and the included script does the actual upload.

---

## Step 1 — Create a free GitHub account
1. Go to **https://github.com/signup**
2. Enter your **email**, a **password**, and a **username** (e.g. `sudheshna`).
3. Verify your email (GitHub sends a code).
4. Choose the **Free** plan when asked — it's all you need.
5. **Turn on two-factor authentication (2FA)** when prompted — GitHub now requires it.
   Use an authenticator app (e.g. Google Authenticator) or your phone number.

## Step 2 — Create an empty repository
1. Click the **+** in the top-right of GitHub → **New repository**.
2. **Repository name:** `deutsch-wortschatz`
3. Set it to **Private** (recommended while developing) or Public.
4. **Do NOT** tick "Add a README", ".gitignore", or "license" — leave it empty.
   (The project already has these; an empty repo avoids conflicts.)
5. Click **Create repository**.
6. Copy the repo URL shown — it looks like:
   `https://github.com/yourname/deutsch-wortschatz.git`

## Step 3 — Install Git
- **Windows:** https://git-scm.com/download/win (run installer, accept defaults)
- **Mac:** open Terminal and type `git --version` — it will offer to install if missing
- **Linux:** `sudo apt install git`

## Step 4 — Upload everything (one command)
1. Unzip this project somewhere simple (e.g. `C:\deutsch-wortschatz`).
2. Run the upload script in the project folder:
   - **Windows:** double-click **`push-to-github.bat`**
   - **Mac/Linux:** `bash push-to-github.sh`
3. When asked, **paste the repo URL** you copied in Step 2.
4. The script uploads the code and the `docs/` folder (PRD, TDD, Test Report).

## Step 5 — Signing in during the push (important)
When Git asks you to authenticate:
- **Username:** your GitHub username
- **Password:** do **NOT** use your account password. Use a **Personal Access Token (PAT)**:
  1. GitHub → click your avatar → **Settings**
  2. **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**
  3. Tick the **`repo`** scope, generate, and **copy the token**.
  4. Paste that token as the "password" when Git prompts.

  (On Windows, a sign-in window may pop up instead — just click **Sign in with your browser**,
  which is even easier and skips the token.)

## Step 6 — Confirm
Refresh your repo page on github.com. You should see:
```
deutsch-wortschatz/
├── www/index.html          ← the app
├── docs/                    ← PRD, TDD, Test Report
├── build-android.bat / .sh  ← Android build
├── codemagic.yaml           ← iOS + Android cloud build
├── .github/workflows/       ← free Android cloud build
└── ...                      ← configs, guides
```

---

## What you can do once it's on GitHub
- **Android, automatically:** the `.github/workflows/android-build.yml` runs on every push and
  produces an APK under **Actions ▸ (latest run) ▸ Artifacts** — no PC build needed.
- **iOS (and Android) via Codemagic:** sign up at https://codemagic.io, connect this repo,
  and run the workflows in `codemagic.yaml`. Codemagic runs a Mac in the cloud for iOS.
- **Backup & history:** every change is versioned; you can never lose your work.

## Updating later
After you change any file, upload the update with three commands in the project folder:
```
git add .
git commit -m "describe what changed"
git push
```
(Or re-run the push script.)

---

### Troubleshooting
- **"remote origin already exists"** → the script handles this; if doing it by hand, run
  `git remote remove origin` then add it again.
- **Push rejected / authentication failed** → you used your password instead of a token (Step 5).
- **"src refspec main does not match"** → nothing was committed; make sure `git commit` ran.
- **Large file warnings** → none expected; the app is a single ~0.9 MB file and docs are small.
