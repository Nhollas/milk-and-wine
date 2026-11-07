type HiddenTestResult = { title: string };

type HiddenTests = {
  run(taskFolder: string): HiddenTestResult[];
};

type Repository = { hasUncommittedChanges(): boolean };

type Trials = { start(trial: { task: string; agent: string }): void };

type RunOptions = {
  root: string;
  hiddenTests: HiddenTests;
  repository: Repository;
  trials: Trials;
};

type RunResult = { exitCode: number; output: string };

export function run(_args: string[], _options: RunOptions): RunResult {
  return { exitCode: 0, output: "" };
}
