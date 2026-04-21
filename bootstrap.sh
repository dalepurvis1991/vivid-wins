#!/usr/bin/env bash
# Vivid Wins — one-shot bootstrap for the dev environment.
# Run from this directory:
#   cd ~/Desktop/Vivid-wins/vivid-wins-nextjs && bash bootstrap.sh
#
# This installs node deps, then starts the Next.js dev server.
# In a SECOND terminal tab, you should run:
#   stripe listen --forward-to localhost:3000/api/stripe/webhook
# …and paste the `whsec_…` it prints into .env.local as STRIPE_WEBHOOK_SECRET.

set -euo pipefail

echo "→ node: $(node -v 2>/dev/null || echo 'NOT FOUND')"
echo "→ npm:  $(npm -v 2>/dev/null || echo 'NOT FOUND')"

if [ ! -f package.json ]; then
  echo "!! No package.json here — are you in vivid-wins-nextjs/?"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "→ Installing dependencies (this takes ~1 minute first time)…"
  npm install
else
  echo "→ node_modules already present — skipping install."
fi

echo "→ Starting dev server on http://localhost:3000"
echo "   (Ctrl-C to stop.)"
npm run dev
