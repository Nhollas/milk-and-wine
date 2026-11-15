import { expect, test } from "vitest";
import { finalReplyOf, rewardsOf } from "./grade.ts";

const TOTAL_UNCHECKED = {
  scenario: "B1",
  verdict: "misses_requirement",
  requirement: "totals the lines",
};

const KEYS_ADDED = { scenario: "B3", verdict: "adds_requirement", test_line: 24 };

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
    noticed: 1,
    labelled: 1,
  },
  {
    case: "the quote inside longer words",
    requirement: {
      scenario: "B1",
      requirement: "and totals the lines of the order",
      verdict: "misses_requirement",
    },
    noticed: 1,
    labelled: 1,
  },
  {
    case: "the quote under another wrong verdict",
    requirement: {
      scenario: "B1",
      requirement: "totals the lines",
      verdict: "contradicts_requirement",
    },
    noticed: 1,
    labelled: 0,
  },
  {
    case: "the quote under aligned",
    requirement: { scenario: "B1", requirement: "totals the lines", verdict: "aligned" },
    noticed: 0,
    labelled: 0,
  },
  {
    case: "the quote on another scenario",
    requirement: { scenario: "B2", requirement: "totals the lines", verdict: "misses_requirement" },
    noticed: 0,
    labelled: 0,
  },
  {
    case: "another requirement",
    requirement: { scenario: "B1", requirement: "every line", verdict: "misses_requirement" },
    noticed: 0,
    labelled: 0,
  },
])(
  "B32: noticed $noticed and labelled $labelled for $case",
  ({ requirement, noticed, labelled }) => {
    const rewards = rewardsOf(reply({ requirements: [requirement] }), TOTAL_UNCHECKED);

    expect(rewards).toMatchObject({ noticed, labelled });
  },
);

test.each([
  {
    case: "the verdict at the line",
    check: { scenario: "B3", test_line: 24, verdict: "adds_requirement" },
    noticed: 1,
    labelled: 1,
  },
  {
    case: "another wrong verdict at the line",
    check: { scenario: "B3", test_line: 24, verdict: "misses_requirement" },
    noticed: 1,
    labelled: 0,
  },
  {
    case: "another line",
    check: { scenario: "B3", test_line: 23, verdict: "adds_requirement" },
    noticed: 0,
    labelled: 0,
  },
  {
    case: "a verdict that says the check is fine",
    check: { scenario: "B3", test_line: 24, verdict: "boundary_of_requirement" },
    noticed: 0,
    labelled: 0,
  },
  {
    case: "another scenario",
    check: { scenario: "B2", test_line: 24, verdict: "adds_requirement" },
    noticed: 0,
    labelled: 0,
  },
])(
  "B33: noticed $noticed and labelled $labelled for an additional check with $case",
  ({ check, noticed, labelled }) => {
    const rewards = rewardsOf(reply({ additional_checks: [check] }), KEYS_ADDED);

    expect(rewards).toMatchObject({ noticed, labelled });
  },
);

test.each([
  {
    case: "the gap under its verdict and nothing else wrong",
    requirements: [
      { scenario: "B1", requirement: "totals the lines", verdict: "misses_requirement" },
    ],
    rewards: { reward: 1, noticed: 1, labelled: 1, false_alarms: 0 },
  },
  {
    case: "the gap under its verdict and a false alarm",
    requirements: [
      { scenario: "B1", requirement: "totals the lines", verdict: "misses_requirement" },
      { scenario: "B1", requirement: "every line", verdict: "contradicts_requirement" },
    ],
    rewards: { reward: 0, noticed: 1, labelled: 1, false_alarms: 1 },
  },
  {
    case: "the gap under another wrong verdict",
    requirements: [
      { scenario: "B1", requirement: "totals the lines", verdict: "contradicts_requirement" },
    ],
    rewards: { reward: 0, noticed: 1, labelled: 0, false_alarms: 0 },
  },
  {
    case: "nothing wrong",
    requirements: [{ scenario: "B1", requirement: "totals the lines", verdict: "aligned" }],
    rewards: { reward: 0, noticed: 0, labelled: 0, false_alarms: 0 },
  },
])("B40: rewards $rewards.reward for $case", ({ requirements, rewards }) => {
  expect(rewardsOf(reply({ requirements }), TOTAL_UNCHECKED)).toEqual(rewards);
});

test("B32: grades the JSON inside a fenced reply", () => {
  const fenced = `\`\`\`json\n${reply({
    requirements: [
      { scenario: "B1", requirement: "totals the lines", verdict: "misses_requirement" },
    ],
  })}\n\`\`\``;

  expect(rewardsOf(fenced, TOTAL_UNCHECKED)).toMatchObject({ noticed: 1, labelled: 1 });
});

test.each([
  { case: "prose", text: "The tests look fine to me." },
  { case: "broken JSON", text: '{ "requirements": [' },
  { case: "nothing", text: "" },
])("B35: rewards 0 for a reply of $case", ({ text }) => {
  expect(rewardsOf(text, { scenario: "B2", verdict: "aligned" })).toEqual({
    reward: 0,
    false_alarms: 0,
  });
  expect(rewardsOf(text, TOTAL_UNCHECKED)).toEqual({
    reward: 0,
    noticed: 0,
    labelled: 0,
    false_alarms: 0,
  });
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
