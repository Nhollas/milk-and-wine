#!/bin/sh
# Prints how to use the issue tracker of the kind ISSUE_TRACKER names, for a skill to inject.
cat "$(dirname "$0")/${ISSUE_TRACKER:?Set ISSUE_TRACKER to github or local}.md"
