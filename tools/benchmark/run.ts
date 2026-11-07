import { execFileSync } from "node:child_process";
import { check, type HiddenTests } from "./check.ts";
import { vitestHiddenTests } from "./hidden-tests.ts";

type Repository = { hasUncommittedChanges(): boolean };

type Trials = { start(trial: { task: string; agent: string }): void };

type RunOptions = {
  root: string;
  hiddenTests: HiddenTests;
  repository: Repository;
  trials: Trials;
};

type RunResult = { exitCode: number; output: string };

export function run(args: string[], { root, hiddenTests, repository }: RunOptions): RunResult {
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
  return { exitCode: 0, output: "" };
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
      start() {
        throw new Error("no trial runner yet");
      },
    },
  });
  process.stdout.write(output);
  process.exitCode = exitCode;
}
