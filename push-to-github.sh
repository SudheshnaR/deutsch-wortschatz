#!/usr/bin/env bash
# ============================================================
#  Push Deutsch Wortschatz to GitHub  (macOS / Linux)
#  Run AFTER creating an empty repo on github.com.
# ============================================================
set -e
if ! command -v git >/dev/null 2>&1; then
  echo "Git is not installed. Install it, then run this again."
  exit 1
fi
read -p "Paste your GitHub repo URL (https://github.com/you/deutsch-wortschatz.git): " REPOURL
[ -z "$REPOURL" ] && { echo "No URL entered. Aborting."; exit 1; }

git init
git add .
git commit -m "Deutsch Wortschatz: app, build configs, and documents"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "$REPOURL"
git push -u origin main

echo ""
echo "DONE! Your code and documents are on GitHub: $REPOURL"
