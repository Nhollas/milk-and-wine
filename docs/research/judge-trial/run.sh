#!/usr/bin/env bash
# Runs the intent judge on the reminders tests as they are, and once with each weakening applied.
# Each run gets its own copy of the repo, and the runs go in parallel.
# Usage: docs/research/judge-trial/run.sh <output folder> [patch ...]
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
out="$(mkdir -p "$1" && cd "$1" && pwd)"
shift
patches=("$@")
# With --agent, the agent's own hooks don't run, so the guard is passed in here too.
guard='{"hooks":{"PreToolUse":[{"matcher":".*","hooks":[{"type":"command","command":"node \"$CLAUDE_PROJECT_DIR/.claude/agents/intent-judge/guard.ts\""}]}]}}'
[ ${#patches[@]} -eq 0 ] && patches=(none "$here"/*.patch "$root/docs/research/b3-trial/control/weaker-b3-test.patch")

judge() {
  local name copy
  name="$(basename "$1" .patch)"
  copy="$out/$name.repo"
  rsync -a --exclude node_modules --exclude .git --exclude reports "$root/" "$copy/"
  [ "$1" != none ] && patch -s -p1 -d "$copy" < "$1"
  (cd "$copy" && claude -p --agent intent-judge --settings "$guard" --output-format stream-json --verbose \
    "Judge the tests of the reminders spec.") > "$out/$name.jsonl"
  rm -rf "$copy"
  echo "judged $name"
}

for patch in "${patches[@]}"; do judge "$patch" & done
wait
