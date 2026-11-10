import { expect, test } from "vitest";
import { finalReplyOf, rewardOf } from "./grade.ts";

const TOTAL_UNCHECKED = {
  scenario: "B1",
  verdict: "misses_requirement",
  requirement: "totals the lines",
};

function reply(findings: {
  requirements?: Record<string, unknown>[];
  additional_checks?: Record<string, unknown>[];
}): string {
  return JSON.stringify({ requirements: [], additional_checks: [], ...findings });
}

test.each([
  {
    case: "the verdict and the quote, in another case",
    requirement: { scenario: "B1", requirement: "Totals the lines", verdict: "misses_requirement" },
    reward: 1,
  },
  {
    case: "the quote inside longer words",
    requirement: {
      scenario: "B1",
      requirement: "and totals the lines of the order",
      verdict: "misses_requirement",
    },
    reward: 1,
  },
  {
    case: "the quote under another verdict",
    requirement: { scenario: "B1", requirement: "totals the lines", verdict: "aligned" },
    reward: 0,
  },
  {
    case: "the quote on another scenario",
    requirement: { scenario: "B2", requirement: "totals the lines", verdict: "misses_requirement" },
    reward: 0,
  },
  {
    case: "another requirement",
    requirement: { scenario: "B1", requirement: "every line", verdict: "misses_requirement" },
    reward: 0,
  },
])("B32: rewards $reward for $case", ({ requirement, reward }) => {
  expect(rewardOf(reply({ requirements: [requirement] }), TOTAL_UNCHECKED)).toBe(reward);
});

test.each([
  {
    case: "the verdict at the line",
    check: { scenario: "B3", test_line: 24, verdict: "adds_requirement" },
    reward: 1,
  },
  {
    case: "another line",
    check: { scenario: "B3", test_line: 23, verdict: "adds_requirement" },
    reward: 0,
  },
  {
    case: "another verdict",
    check: { scenario: "B3", test_line: 24, verdict: "setup_only" },
    reward: 0,
  },
  {
    case: "another scenario",
    check: { scenario: "B2", test_line: 24, verdict: "adds_requirement" },
    reward: 0,
  },
])("B33: rewards $reward for an additional check with $case", ({ check, reward }) => {
  const expected = { scenario: "B3", verdict: "adds_requirement" as const, test_line: 24 };

  expect(rewardOf(reply({ additional_checks: [check] }), expected)).toBe(reward);
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
    reward: 1,
  },
  {
    case: "a wrong verdict on another scenario",
    findings: {
      requirements: [{ scenario: "B1", requirement: "every line", verdict: "misses_requirement" }],
    },
    reward: 1,
  },
  {
    case: "a requirement it says the tests miss",
    findings: {
      requirements: [{ scenario: "B2", requirement: "any line", verdict: "misses_requirement" }],
    },
    reward: 0,
  },
  {
    case: "a check it says the scenario doesn't ask for",
    findings: {
      additional_checks: [{ scenario: "B2", check: "field order", verdict: "adds_requirement" }],
    },
    reward: 0,
  },
])("B34: rewards $reward for $case on an aligned scenario", ({ findings, reward }) => {
  expect(rewardOf(reply(findings), { scenario: "B2", verdict: "aligned" })).toBe(reward);
});

test("B32: grades the JSON inside a fenced reply", () => {
  const fenced = `\`\`\`json\n${reply({
    requirements: [
      { scenario: "B1", requirement: "totals the lines", verdict: "misses_requirement" },
    ],
  })}\n\`\`\``;

  expect(rewardOf(fenced, TOTAL_UNCHECKED)).toBe(1);
});

test.each([
  { case: "prose", text: "The tests look fine to me." },
  { case: "broken JSON", text: '{ "requirements": [' },
  { case: "nothing", text: "" },
])("B35: rewards 0 for a reply of $case", ({ text }) => {
  expect(rewardOf(text, { scenario: "B2", verdict: "aligned" })).toBe(0);
});

test("B35: grades the session's last result, ignoring other events and lines", () => {
  const stream = [
    '{"type":"system","subtype":"init"}',
    "not json",
    '{"type":"result","result":"first"}',
    '{"type":"assistant","message":{}}',
    '{"type":"result","result":"last"}',
    "",
  ].join("\n");

  expect(finalReplyOf(stream)).toBe("last");
});
