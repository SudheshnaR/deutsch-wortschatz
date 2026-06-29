@echo off
REM ============================================================
REM  Push Deutsch Wortschatz to GitHub  (Windows)
REM  Run this AFTER you have:
REM    1. Created a free GitHub account
REM    2. Created an EMPTY repo on github.com (no README)
REM    3. Installed Git for Windows: https://git-scm.com/download/win
REM
REM  Then double-click this file and paste your repo URL when asked.
REM ============================================================
setlocal

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Get it from https://git-scm.com/download/win
  echo then run this script again.
  pause
  exit /b 1
)

echo.
set /p REPOURL="Paste your GitHub repo URL (e.g. https://github.com/you/deutsch-wortschatz.git): "
if "%REPOURL%"=="" (
  echo No URL entered. Aborting.
  pause
  exit /b 1
)

echo.
echo === Initialising git repository...
git init
git add .
git commit -m "Deutsch Wortschatz: app, build configs, and documents"
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPOURL%

echo.
echo === Uploading to GitHub...
git push -u origin main
if errorlevel 1 (
  echo.
  echo  Push failed. The most common reason is sign-in.
  echo  When prompted for a password, use a GitHub PERSONAL ACCESS TOKEN,
  echo  not your account password. See GITHUB_SETUP_GUIDE.md, step 5.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  DONE!  Your code and documents are now on GitHub:
echo     %REPOURL%
echo  Next: connect this repo to Codemagic to build iOS,
echo  or it will auto-build Android via GitHub Actions.
echo ============================================================
pause
