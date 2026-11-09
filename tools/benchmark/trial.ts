import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const TASKS_FOLDER = "tools/benchmark/tasks";

// What every trial's repository takes from this one: the standards, and the config to install,
// typecheck and test. None of the lint, format or commit tooling.
const SHARED_FILES = [
  ".gitignore",
  "CODING-STANDARDS.md",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "vitest.config.ts",
];

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

// Grading lands with the measures that need it; Harbor needs a verifier to run.
const TEST_SCRIPT = `#!/bin/sh
echo 0 > /logs/verifier/reward.txt
`;

type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
};

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
  tokens: Record<string, TokenCounts>;
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
  harbor([
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
  return { ...trial, ...measure(jobsFolder) };
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
function measure(jobsFolder: string): Pick<TrialRecord, "wallClockMs" | "tokens"> {
  const trialFolder = trialFolderUnder(jobsFolder);
  if (trialFolder === undefined) return { wallClockMs: 0, tokens: {} };
  const { agent_execution } = trialResult.parse(
    JSON.parse(readFileSync(join(trialFolder, "result.json"), "utf8")),
  );
  const result = readFileSync(join(trialFolder, "agent", "claude-code.txt"), "utf8")
    .split("\n")
    .map((line) => claudeResult.safeParse(parseJson(line)))
    .findLast(({ success }) => success);
  const tokens = Object.fromEntries(
    Object.entries(result?.data?.modelUsage ?? {}).map(([model, usage]) => [
      model,
      {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadInputTokens: usage.cacheReadInputTokens,
        cacheCreationInputTokens: usage.cacheCreationInputTokens,
      },
    ]),
  );
  return {
    wallClockMs: Date.parse(agent_execution.finished_at) - Date.parse(agent_execution.started_at),
    tokens,
  };
}

function trialFolderUnder(jobsFolder: string): string | undefined {
  if (!existsSync(jobsFolder)) return undefined;
  return readdirSync(jobsFolder, { withFileTypes: true })
    .filter((job) => job.isDirectory())
    .flatMap((job) =>
      readdirSync(join(jobsFolder, job.name), { withFileTypes: true })
        .filter((trial) => trial.isDirectory())
        .map((trial) => join(jobsFolder, job.name, trial.name)),
    )
    .find((folder) => existsSync(join(folder, "result.json")));
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}
