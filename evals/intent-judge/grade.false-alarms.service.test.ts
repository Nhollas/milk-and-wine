import { expect, test } from "vitest";
import { rewardsOf } from "./grade.ts";

/** One line can't show "every line" or a total, and its assertion on line 9 is fair to call added. */
const ONE_LINE = {
  scenario: "B1",
  verdict: "misses_requirement",
  requirement: "every line",
  fair: [{ requirement: "totals the lines", verdict: "misses_requirement" }, { test_line: 9 }],
};

const WHOLE_THEN = "Takes 10% off every line, rounded down to the penny, and totals the lines";

function reply(findings: {
  requirements?: Record<string, unknown>[];
  additional_checks?: Record<string, unknown>[];
}): string {
  return JSON.stringify({ requirements: [], additional_checks: [], ...findings });
}

test.each([
  {
    case: "the gap alone",
    findings: {
      requirements: [{ scenario: "B1", requirement: "every line", verdict: "misses_requirement" }],
    },
    falseAlarms: 0,
  },
  {
    case: "the gap under another wrong verdict",
    findings: {
      requirements: [
        { scenario: "B1", requirement: "every line", verdict: "contradicts_requirement" },
      ],
    },
    falseAlarms: 0,
  },
  {
    case: "the gap and both fair findings under their verdicts",
    findings: {
      requirements: [
        { scenario: "B1", requirement: "every line", verdict: "misses_requirement" },
        { scenario: "B1", requirement: "totals the lines", verdict: "misses_requirement" },
      ],
      additional_checks: [{ scenario: "B1", test_line: 9, verdict: "adds_requirement" }],
    },
    falseAlarms: 0,
  },
  {
    case: "a fair finding under another verdict",
    findings: {
      requirements: [
        { scenario: "B1", requirement: "every line", verdict: "misses_requirement" },
        { scenario: "B1", requirement: "totals the lines", verdict: "contradicts_requirement" },
      ],
    },
    falseAlarms: 1,
  },
  {
    case: "a requirement that is neither the gap nor fair",
    findings: {
      requirements: [
        { scenario: "B1", requirement: "every line", verdict: "misses_requirement" },
        { scenario: "B1", requirement: "10%", verdict: "contradicts_requirement" },
      ],
    },
    falseAlarms: 1,
  },
  {
    case: "an additional check at a line that isn't fair",
    findings: {
      additional_checks: [{ scenario: "B1", test_line: 5, verdict: "adds_requirement" }],
    },
    falseAlarms: 1,
  },
  {
    case: "the gap twice under its verdict, once for each test",
    findings: {
      requirements: [
        { scenario: "B1", requirement: "every line", verdict: "misses_requirement" },
        {
          scenario: "B1",
          requirement: "every line (messages)",
          verdict: "misses_requirement",
        },
      ],
    },
    falseAlarms: 0,
  },
  {
    case: "the gap under its verdict and another",
    findings: {
      requirements: [
        { scenario: "B1", requirement: "every line", verdict: "contradicts_requirement" },
        { scenario: "B1", requirement: "every line", verdict: "misses_requirement" },
      ],
    },
    falseAlarms: 1,
  },
  {
    case: "the gap under two verdicts, neither its own",
    findings: {
      requirements: [
        { scenario: "B1", requirement: "every line", verdict: "contradicts_requirement" },
        { scenario: "B1", requirement: "every line", verdict: "adds_requirement" },
      ],
    },
    falseAlarms: 1,
  },
  {
    case: "the whole Then under three verdicts",
    findings: {
      requirements: [
        { scenario: "B1", requirement: WHOLE_THEN, verdict: "misses_requirement" },
        { scenario: "B1", requirement: WHOLE_THEN, verdict: "contradicts_requirement" },
        { scenario: "B1", requirement: WHOLE_THEN, verdict: "adds_requirement" },
      ],
    },
    falseAlarms: 2,
  },
  {
    case: "wrong verdicts on another scenario, and verdicts that aren't wrong",
    findings: {
      requirements: [
        { scenario: "B2", requirement: "any line", verdict: "contradicts_requirement" },
        { scenario: "B1", requirement: "10%", verdict: "aligned" },
      ],
      additional_checks: [{ scenario: "B1", test_line: 5, verdict: "setup_only" }],
    },
    falseAlarms: 0,
  },
])("B39: counts $falseAlarms false alarms for $case", ({ findings, falseAlarms }) => {
  expect(rewardsOf(reply(findings), ONE_LINE).false_alarms).toBe(falseAlarms);
});

test.each([
  {
    case: "only aligned requirements, setup and boundaries",
    findings: {
      requirements: [{ scenario: "B2", requirement: "any line", verdict: "aligned" }],
      additional_checks: [
        { scenario: "B2", check: "the order's date", verdict: "setup_only" },
        { scenario: "B2", check: "yesterday's order", verdict: "boundary_of_requirement" },
      ],
    },
    rewards: { reward: 1, false_alarms: 0 },
  },
  {
    case: "a wrong verdict on another scenario",
    findings: {
      requirements: [{ scenario: "B1", requirement: "every line", verdict: "misses_requirement" }],
    },
    rewards: { reward: 1, false_alarms: 0 },
  },
  {
    case: "a requirement it says the tests miss",
    findings: {
      requirements: [{ scenario: "B2", requirement: "any line", verdict: "misses_requirement" }],
    },
    rewards: { reward: 0, false_alarms: 1 },
  },
  {
    case: "a missed requirement and a check it says the scenario doesn't ask for",
    findings: {
      requirements: [{ scenario: "B2", requirement: "any line", verdict: "misses_requirement" }],
      additional_checks: [{ scenario: "B2", check: "field order", verdict: "adds_requirement" }],
    },
    rewards: { reward: 0, false_alarms: 2 },
  },
])(
  "B34: counts $rewards.false_alarms false alarms for $case on an aligned scenario",
  ({ findings, rewards }) => {
    expect(rewardsOf(reply(findings), { scenario: "B2", verdict: "aligned" })).toEqual(rewards);
  },
);
