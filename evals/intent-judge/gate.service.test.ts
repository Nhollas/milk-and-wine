import { join } from "node:path";
import { expect, test } from "vitest";
import { gate } from "./gate.ts";
import { createTempRoot } from "./temp-root.ts";

const JOB = "evals/intent-judge/results/2026-11-10";

type TrialOutcome = {
  task: string;
  reward?: number;
  reasons?: { noticed?: number; labelled?: number; false_alarms?: number };
  broke?: string;
};

/** A Harbor job with one trial per outcome. */
function jobWith(trials: TrialOutcome[]) {
  const repo = createTempRoot();
  for (const [index, { task, reward, reasons, broke }] of trials.entries()) {
    repo.write(
      `${JOB}/${task}__${index}/result.json`,
      JSON.stringify({
        task_name: task,
        verifier_result: reward === undefined ? null : { rewards: { reward, ...reasons } },
        exception_info: broke === undefined ? null : { exception_type: broke },
      }),
    );
  }
  return repo;
}

test("B36: prints each task's mean reward, trials and target, and passes", () => {
  using repo = jobWith([
    { task: "judge-001-cap", reward: 1 },
    { task: "judge-001-cap", reward: 1 },
    { task: "judge-002-at-eight", reward: 1 },
    { task: "judge-002-at-eight", reward: 1 },
    { task: "judge-002-at-eight", reward: 1 },
    { task: "judge-002-at-eight", reward: 1 },
    { task: "judge-002-at-eight", reward: 0 },
  ]);

  const { exitCode, output } = gate(join(repo.root, JOB));

  expect(exitCode).toBe(0);
  expect(output).toBe(
    [
      "judge-001-cap       1.00 over 2 trials, target 0.80",
      "judge-002-at-eight  0.80 over 5 trials, target 0.80",
      "eval:gate passed",
      "",
    ].join("\n"),
  );
});

test("B41: prints the mean of noticed, labelled and false alarms over the trials that carry them", () => {
  using repo = jobWith([
    { task: "judge-001-cap", reward: 1, reasons: { noticed: 1, labelled: 1, false_alarms: 0 } },
    { task: "judge-001-cap", reward: 0, reasons: { noticed: 1, labelled: 0, false_alarms: 3 } },
    { task: "judge-001-cap", broke: "AgentTimeoutError" },
    { task: "judge-002-at-eight", reward: 1, reasons: { false_alarms: 0 } },
  ]);

  const { output } = gate(join(repo.root, JOB));

  expect(output).toBe(
    [
      "judge-001-cap       0.33 over 3 trials (1 broke), target 0.80, below · noticed 1.00 · labelled 0.50 · false alarms 1.50",
      "judge-002-at-eight  1.00 over 1 trials, target 0.80 · false alarms 0.00",
      "eval:gate failed · 1 below target",
      "",
    ].join("\n"),
  );
});

test("B37: marks a task below the target, and fails", () => {
  using repo = jobWith([
    { task: "judge-001-cap", reward: 1 },
    { task: "judge-001-cap", reward: 1 },
    { task: "judge-001-cap", reward: 1 },
    { task: "judge-001-cap", reward: 0 },
    { task: "judge-002-at-eight", reward: 1 },
  ]);

  const { exitCode, output } = gate(join(repo.root, JOB));

  expect(exitCode).toBe(1);
  expect(output).toContain("judge-001-cap       0.75 over 4 trials, target 0.80, below\n");
  expect(output).toContain("judge-002-at-eight  1.00 over 1 trials, target 0.80\n");
  expect(output).toMatch(/eval:gate failed · 1 below target\n$/u);
});

test("B38: scores a trial that broke before grading 0, and counts it", () => {
  using repo = jobWith([
    { task: "judge-001-cap", reward: 1 },
    { task: "judge-001-cap", broke: "AgentTimeoutError" },
  ]);

  const { exitCode, output } = gate(join(repo.root, JOB));

  expect(exitCode).toBe(1);
  expect(output).toContain("judge-001-cap  0.50 over 2 trials (1 broke), target 0.80, below\n");
});
