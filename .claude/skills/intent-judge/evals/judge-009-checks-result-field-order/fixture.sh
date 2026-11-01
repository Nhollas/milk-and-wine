#!/usr/bin/env bash
# Copies this case's example into the empty workspace, with the case's plant applied.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$here/../tools/stage-case.ts" "$(basename "$here")" "$PWD"
