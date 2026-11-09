import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, type HiddenTests } from "./check.ts";
import { vitestHiddenTests } from "./hidden-tests.ts";
import { runTrial } from "./trial.ts";

type Repository = { hasUncommittedChanges(): boolean };

type Trials = { start(trial: { task: string; agent: string }): void };

type RunOptions = {
  root: string;
  hiddenTests: HiddenTests;
  repository: Repository;
  trials: Trials;
};

type RunResult = { exitCode: number; output: string };

export function run(
  args: string[],
  { root, hiddenTests, repository, trials }: RunOptions,
): RunResult {
  if (repository.hasUncommittedChanges()) {
    return { exitCode: 1, output: "commit first: results name the commit they measured\n" };
  }
  const firstFlag = args.findIndex((arg) => arg.startsWith("--"));
  const tasks = firstFlag === -1 ? args : args.slice(0, firstFlag);
  const failures = tasks
    .map((task) => check([task], { root, hiddenTests }))
    .filter(({ exitCode }) => exitCode !== 0);
  if (failures.length > 0) {
    return { exitCode: 1, output: failures.map(({ output }) => output).join("") };
  }
  const agents = valuesOf("--agent", args);
  const trialCount = Number(valuesOf("--trials", args)[0] ?? "1");
  for (const task of tasks) {
    for (const agent of agents) {
      for (let count = 0; count < trialCount; count++) trials.start({ task, agent });
    }
  }
  return { exitCode: 0, output: "" };
}

function valuesOf(flag: string, args: string[]): string[] {
  return args.flatMap((arg, index) => (arg === flag ? (args[index + 1] ?? []) : []));
}

function harbor(args: string[]): { exitCode: number } {
  const result = spawnSync("harbor", args, { stdio: "inherit" });
  if (result.error) throw result.error;
  return { exitCode: result.status ?? 1 };
}

function gitRepository(root: string): Repository {
  return {
    hasUncommittedChanges() {
      return execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }) !== "";
    },
  };
}

if (import.meta.main) {
  const root = process.cwd();
  const { exitCode, output } = run(process.argv.slice(2), {
    root,
    hiddenTests: vitestHiddenTests(root),
    repository: gitRepository(root),
    trials: {
      start(trial) {
        const workFolder = mkdtempSync(join(tmpdir(), "bench-trial-"));
        const record = runTrial(trial, { root, workFolder, harbor });
        process.stdout.write(`${JSON.stringify(record)}\n`);
      },
    },
  });
  process.stdout.write(output);
  process.exitCode = exitCode;
}
