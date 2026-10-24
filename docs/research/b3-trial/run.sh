#!/usr/bin/env bash
# Applies each bug in this folder in turn and reports whether reminders B3's test catches it.
# Usage: docs/research/b3-trial/run.sh
set -uo pipefail

dir="$(cd "$(dirname "$0")" && pwd)"
cd "$dir/../../.."

for patch in "$dir"/*.patch; do
  git apply "$patch" || { echo "could not apply $(basename "$patch")"; exit 1; }
  if pnpm exec vitest run --project service src/reminders/reminders.service.test.ts -t "^B3:" > /dev/null 2>&1; then
    result="MISSED"
  else
    result="caught"
  fi
  git apply --reverse "$patch"
  echo "$result  $(basename "$patch" .patch)"
done
