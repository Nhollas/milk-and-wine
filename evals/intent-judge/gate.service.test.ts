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

/** A root holding tasks of each difficulty, and a Harbor job with one trial per outcome. */
function jobWith(trials: TrialOutcome[]) {
  const repo = createTempRoot();
  for (const [task, difficulty] of [
    ["judge-001-easy", "easy"],
    ["judge-002-medium", "medium"],
    ["judge-003-hard", "hard"],
  ]) {
    repo.write(
      `evals/intent-judge/${task}/task.toml`,
      `[metadata]\nfixture = "widgets"\ndifficulty = "${difficulty}"\n`,
    );
  }
  for (const [index, { task, reward, reasons, broke }] of trials.entries()) {
    repo.write(
      `${JOB}/${task}__${index}/result.json`,
      JSON.stringify({
        task_name: task,
        config: { task: { path: `evals/intent-judge/${task}` } },
        verifier_result: reward === undefined ? null : { rewards: { reward, ...reasons } },
        exception_info: broke === undefined ? null : { exception_type: broke },
      }),
    );
  }
  return repo;
}

test("B36: prints each task's difficulty, mean reward, trials and target, and passes", () => {
  using repo = jobWith([
    { task: "judge-001-easy", reward: 1 },
    { task: "judge-001-easy", reward: 1 },
    { task: "judge-002-medium", reward: 1 },
    { task: "judge-002-medium", reward: 1 },
    { task: "judge-002-medium", reward: 1 },
    { task: "judge-002-medium", reward: 0 },
    { task: "judge-003-hard", reward: 0 },
  ]);

  const { exitCode, output } = gate(repo.root, join(repo.root, JOB));

  expect(exitCode).toBe(0);
  expect(output).toBe(
    [
      "judge-001-easy    easy    1.00 over 2 trials, target 0.95",
      "judge-002-medium  medium  0.75 over 4 trials, target 0.75",
      "judge-003-hard    hard    0.00 over 1 trials, reported",
      "eval:gate passed",
      "",
    ].join("\n"),
  );
});

test("B41: prints the mean of noticed, labelled and false alarms over the trials that carry them", () => {
  using repo = jobWith([
    { task: "judge-001-easy", reward: 1, reasons: { noticed: 1, labelled: 1, false_alarms: 0 } },
    { task: "judge-001-easy", reward: 0, reasons: { noticed: 1, labelled: 0, false_alarms: 3 } },
    { task: "judge-001-easy", broke: "AgentTimeoutError" },
    { task: "judge-002-medium", reward: 1, reasons: { false_alarms: 0 } },
  ]);

  const { output } = gate(repo.root, join(repo.root, JOB));

  expect(output).toBe(
    [
      "judge-001-easy    easy    0.33 over 3 trials (1 broke), target 0.95, below · noticed 1.00 · labelled 0.50 · false alarms 1.50",
      "judge-002-medium  medium  1.00 over 1 trials, target 0.75 · false alarms 0.00",
      "eval:gate failed · 1 below target",
      "",
    ].join("\n"),
  );
});

test("B37: marks a task below its target, and fails", () => {
  using repo = jobWith([
    { task: "judge-001-easy", reward: 1 },
    { task: "judge-001-easy", reward: 0 },
    { task: "judge-002-medium", reward: 1 },
  ]);

  const { exitCode, output } = gate(repo.root, join(repo.root, JOB));

  expect(exitCode).toBe(1);
  expect(output).toContain("judge-001-easy    easy    0.50 over 2 trials, target 0.95, below\n");
  expect(output).toContain("judge-002-medium  medium  1.00 over 1 trials, target 0.75\n");
  expect(output).toMatch(/eval:gate failed · 1 below target\n$/u);
});

test("B38: scores a trial that broke before grading 0, and counts it", () => {
  using repo = jobWith([
    { task: "judge-001-easy", reward: 1 },
    { task: "judge-001-easy", broke: "AgentTimeoutError" },
  ]);

  const { exitCode, output } = gate(repo.root, join(repo.root, JOB));

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "judge-001-easy  easy    0.50 over 2 trials (1 broke), target 0.95, below\n",
  );
});
