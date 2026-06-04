#!/usr/bin/env bash
set -euo pipefail

# Safe updater script that preserves core/database.json (local runtime data)
# Usage: run this instead of `git pull` on servers that keep a local database.json

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

FILE="core/database.json"
BACKUP=""

if [ -f "$FILE" ]; then
  BACKUP="$(mktemp "${FILE}.backup.XXXX")"
  cp "$FILE" "$BACKUP"
  echo "Backed up $FILE -> $BACKUP"
fi

# Determine current branch
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# Try a fast-forward pull first. If it fails, fall back to a normal pull.
if ! git pull --ff-only origin "$BRANCH"; then
  echo "Fast-forward pull failed, attempting normal pull..."
  git pull origin "$BRANCH"
fi

# Restore local database file (it is ignored by git now)
if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
  cp "$BACKUP" "$FILE"
  rm -f "$BACKUP"
  echo "Restored local $FILE from backup"
fi

echo "Update finished"
