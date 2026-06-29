#!/usr/bin/env bash
# Deutsch Wortschatz — one-time native setup. Run on a Mac with Xcode installed.
set -e

echo "📦 Installing dependencies…"
npm install

echo "🍏 Adding iOS platform…"
npx cap add ios

echo "🤖 Adding Android platform (optional, safe to keep)…"
npx cap add android || echo "  (skipped Android — that's fine)"

echo "🎨 Generating app icons & splash from assets/icon.png…"
npx @capacitor/assets generate --assetPath assets || echo "  (icon gen skipped — you can run 'npm run icons' later)"

echo "🔄 Syncing web assets into native projects…"
npx cap sync

echo ""
echo "✅ Done! Next:"
echo "   npx cap open ios     → opens Xcode. Pick your device, press ▶ to run."
echo ""
echo "Whenever you edit www/index.html, run:  npx cap sync"
