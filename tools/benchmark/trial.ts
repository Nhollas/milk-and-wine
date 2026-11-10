import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import { scenarioLines } from "../specs/specs.ts";
import {
  HIDDEN_TESTS_CONFIG,
  HIDDEN_TESTS_CONFIG_SOURCE,
  HIDDEN_TESTS_FOLDER,
  hiddenTestResults,
} from "./hidden-tests.ts";
import { gradeScenarios } from "./measure.ts";

const TASKS_FOLDER = "tools/benchmark/tasks";

// A trial's own config, just enough to install, typecheck and test: not this repository's tooling.
const TRIAL_CONFIG_FOLDER = "tools/benchmark/trial-config";

// What every trial's repository takes from this one besides its config.
const SHARED_FILES = ["CODING-STANDARDS.md"];

// Foreman's process, and what its skills read.
const FOREMAN_FILES = [
  ".claude",
  "GLOSSARY.md",
  "docs/adr",
  "docs/agents/issue-tracker",
  "tools/specs",
  "tools/spec-mutants",
];

const AGENT_TIMEOUT_SEC = 2 * 60 * 60;

const DOCKERFILE = `FROM node:24-bookworm
RUN npm install --global pnpm @anthropic-ai/claude-code
WORKDIR /app
COPY repo/ /app/
`;

// Harbor uploads `tests/` to `/tests` once the agent is done, runs this, and keeps `/logs/verifier`.
// The reward is only what Harbor needs to call the trial graded: the measures read the report.
const VERIFIER_REPORT = "vitest-report.json";

const TEST_SCRIPT = `#!/bin/sh
cd /app
rm -rf ${HIDDEN_TESTS_FOLDER}
cp -R /tests/${HIDDEN_TESTS_FOLDER} ${HIDDEN_TESTS_FOLDER}
pnpm install > /logs/verifier/install.txt 2>&1
pnpm exec vitest run --root /app --config ${HIDDEN_TESTS_CONFIG} --reporter=json --outputFile=/logs/verifier/${VERIFIER_REPORT} > /logs/verifier/vitest.txt 2>&1
if grep -q '"numFailedTests":0' /logs/verifier/${VERIFIER_REPORT}; then echo 1; else echo 0; fi > /logs/verifier/reward.txt
`;

type TrialOptions = {
  root: string;
  /** A folder the trial may write its Harbor task folder and Harbor's output folder in. */
  workFolder: string;
  /** Harbor: takes the arguments after `harbor` (`run -p <task folder> ...`) and waits for it to finish. */
  harbor: (args: string[]) => { exitCode: number };
};

type TrialRecord = {
  task: string;
  agent: string;
  wallClockMs: number;
  tokens: z.infer<typeof claudeResult>["modelUsage"];
  /** Scenarios whose hidden tests all pass, over the task's scenarios. */
  passRate: number;
  /** The scenarios with a hidden test that failed or never ran. */
  failedScenarios: string[];
};

const trialResult = z.object({
  agent_execution: z.object({ started_at: z.string(), finished_at: z.string() }),
});

const claudeResult = z.object({
  type: z.literal("result"),
  modelUsage: z.record(
    z.string(),
    z.object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheReadInputTokens: z.number(),
      cacheCreationInputTokens: z.number(),
    }),
  ),
});

export function runTrial(
  trial: { task: string; agent: string },
  { root, workFolder, harbor }: TrialOptions,
): TrialRecord {
  const taskFolder = join(workFolder, trial.task);
  const jobsFolder = join(workFolder, "jobs");
  writeTaskFolder(trial, root, taskFolder);
  const { exitCode } = harbor([
    "run",
    "-p",
    taskFolder,
    "-o",
    jobsFolder,
    "-a",
    "claude-code",
    "--ae",
    "ISSUE_TRACKER=bench",
  ]);
  if (exitCode !== 0) throw new Error(`harbor exited ${exitCode}`);
  const trialFolder = trialFolderUnder(jobsFolder);
  return {
    ...trial,
    ...measure(trialFolder),
    ...grade(trialFolder, join(root, TASKS_FOLDER, trial.task)),
  };
}

function writeTaskFolder(
  { task, agent }: { task: string; agent: string },
  root: string,
  taskFolder: string,
) {
  const write = (path: string, content: string) => {
    mkdirSync(join(taskFolder, path, ".."), { recursive: true });
    writeFileSync(join(taskFolder, path), content);
  };
  write("task.toml", `[agent]\ntimeout_sec = ${AGENT_TIMEOUT_SEC}\n`);
  write("instruction.md", `${instruction(task, agent)}\n`);
  write("environment/Dockerfile", DOCKERFILE);
  write("tests/test.sh", TEST_SCRIPT);
  cpSync(join(root, TASKS_FOLDER, task, "tests"), join(taskFolder, "tests", HIDDEN_TESTS_FOLDER), {
    recursive: true,
  });
  write(`tests/${HIDDEN_TESTS_CONFIG}`, HIDDEN_TESTS_CONFIG_SOURCE);
  writeRepository(task, agent, root, join(taskFolder, "environment", "repo"));
}

function instruction(task: string, agent: string): string {
  return agent === "foreman"
    ? `/foreman ${task}`
    : `Deliver the tickets in ${task}. ISSUE-TRACKER.md says how to use the issue tracker.`;
}

function writeRepository(task: string, agent: string, root: string, repository: string) {
  const taskFolder = join(root, TASKS_FOLDER, task);
  const copy = (from: string, to: string) =>
    cpSync(from, join(repository, to), { recursive: true });
  const projectFiles = agent === "foreman" ? [...SHARED_FILES, ...FOREMAN_FILES] : SHARED_FILES;
  for (const path of projectFiles) copy(join(root, path), path);
  cpSync(join(root, TRIAL_CONFIG_FOLDER), repository, {
    recursive: true,
    filter: (path) => basename(path) !== "node_modules",
  });
  copy(join(root, "docs/agents/issue-tracker/bench.md"), "ISSUE-TRACKER.md");
  copy(join(taskFolder, "spec.md"), `specs/${task}/spec.md`);
  copy(join(taskFolder, "issue.md"), `.issues/${task}/issue.md`);
  copy(join(taskFolder, "tickets"), `.issues/${task}/tickets`);
  copy(join(taskFolder, "starter"), ".");
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repository, stdio: "ignore" });
  git("init", "--initial-branch=main");
  git("add", "--all");
  git(
    "-c",
    "user.name=bench",
    "-c",
    "user.email=bench@localhost",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--message",
    `Start ${task}`,
  );
}

// Harbor leaves `<jobs>/<job>/<trial>/result.json`, and `<trial>/agent/claude-code.txt`, whose final
// `result` message counts every model's tokens, subagents' included.
function measure(trialFolder: string): Pick<TrialRecord, "wallClockMs" | "tokens"> {
  const { agent_execution } = trialResult.parse(
    JSON.parse(readFileSync(join(trialFolder, "result.json"), "utf8")),
  );
  const result = readFileSync(join(trialFolder, "agent", "claude-code.txt"), "utf8")
    .split("\n")
    .map((line) => claudeResult.safeParse(parseJson(line)))
    .findLast(({ success }) => success);
  if (result?.data === undefined) throw new Error(`no result message in ${trialFolder}`);
  return {
    wallClockMs: Date.parse(agent_execution.finished_at) - Date.parse(agent_execution.started_at),
    tokens: result.data.modelUsage,
  };
}

// With no report, because the agent's code couldn't be installed or run, no scenario passes.
function grade(trialFolder: string, taskFolder: string) {
  const scenarioIds = [...scenarioLines(readFileSync(join(taskFolder, "spec.md"), "utf8"))].map(
    ({ cells: [id = ""] }) => id,
  );
  const reportPath = join(trialFolder, "verifier", VERIFIER_REPORT);
  const results = existsSync(reportPath) ? hiddenTestResults(readFileSync(reportPath, "utf8")) : [];
  return gradeScenarios(scenarioIds, results);
}

function trialFolderUnder(jobsFolder: string): string {
  const trialFolder = readdirSync(jobsFolder, { withFileTypes: true })
    .filter((job) => job.isDirectory())
    .flatMap((job) =>
      readdirSync(join(jobsFolder, job.name), { withFileTypes: true })
        .filter((trial) => trial.isDirectory())
        .map((trial) => join(jobsFolder, job.name, trial.name)),
    )
    .find((folder) => existsSync(join(folder, "result.json")));
  if (trialFolder === undefined) throw new Error(`no trial result under ${jobsFolder}`);
  return trialFolder;
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}
