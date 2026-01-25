#!/usr/bin/env bash
set -euo pipefail

while true; do
  claude --add-dir . -p "$(cat PROMPT.md)"
  echo "---- sanity ----"
  if [ -f package.json ]; then
    npm run build || true
  fi
  echo "Looping again... (Ctrl+C to stop)"
done
