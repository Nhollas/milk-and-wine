#!/bin/sh
# Harbor runs this in the trial's container once the judge stops. /logs/agent holds its stream.
node /grader/grade.ts /logs/agent/claude-code.txt /tests/expected.json > /logs/verifier/reward.json
