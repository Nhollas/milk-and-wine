import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test as base } from "vitest";

type TaskPart = "spec" | "issue" | "ticket" | "starter code" | "hidden tests" | "solution";

type FolderPart = Exclude<TaskPart, "spec" | "issue">;

type TaskOptions = {
  scenarios?: string[];
  hiddenTests?: string[];
  failingHiddenTests?: string[];
  without?: TaskPart[];
  emptied?: FolderPart[];
};

type HiddenTestResult = { title: string; passed: boolean };

type CodeUnderTest = "solution" | "starter";

const TASKS_FOLDER = "tools/benchmark/tasks";

function specMarkdown(task: string, scenarios: string[]): string {
  return [
    `# ${task}`,
    "",
    "| ID | Given | When | Then | Verified |",
    "| --- | --- | --- | --- | --- |",
    ...scenarios.map((id) => `| ${id} | A widget exists | It is priced | Costs 2 each | service |`),
    "",
  ].join("\n");
}

function hiddenTestsSource(titles: string[], failingTitles: string[]): string {
  return [
    `import { expect, test } from "vitest";`,
    "",
    ...titles.map((title) => `test("${title}", () => {});`),
    ...(failingTitles.length > 0 ? [`import { mode } from "../src/widgets.ts";`] : []),
    // Fails on the solution, passes on the starter code.
    ...failingTitles.map((title) => `test("${title}", () => { expect(mode).toBe("starter"); });`),
    "",
  ].join("\n");
}

function benchmarkTasks() {
  const root = mkdtempSync(join(tmpdir(), "benchmark-tasks-"));

  function write(path: string, content: string) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  return {
    root,
    addFiles(files: Record<string, string>) {
      for (const [path, content] of Object.entries(files)) write(path, content);
    },
    addTask(
      name: string,
      {
        scenarios = ["B1"],
        hiddenTests = ["B1: costs 2 each"],
        failingHiddenTests = [],
        without = [],
        emptied = [],
      }: TaskOptions = {},
    ) {
      const folder = `${TASKS_FOLDER}/${name}`;
      const has = (part: TaskPart) => !without.includes(part);
      mkdirSync(join(root, folder), { recursive: true });
      if (has("spec")) write(`${folder}/spec.md`, specMarkdown(name, scenarios));
      if (has("issue")) write(`${folder}/issue.md`, `# ${name}\n`);
      const folderOf: Record<FolderPart, string> = {
        ticket: "tickets",
        "starter code": "starter",
        "hidden tests": "tests",
        solution: "solution",
      };
      for (const part of emptied) {
        mkdirSync(join(root, folder, folderOf[part]), { recursive: true });
      }
      if (has("ticket") && !emptied.includes("ticket"))
        write(`${folder}/tickets/01.md`, `# Price a widget\n`);
      if (has("starter code") && !emptied.includes("starter code"))
        write(`${folder}/starter/src/widgets.ts`, `export const mode = "starter";\n`);
      if (has("hidden tests") && !emptied.includes("hidden tests")) {
        write(
          `${folder}/tests/widgets.service.test.ts`,
          hiddenTestsSource(hiddenTests, failingHiddenTests),
        );
      }
      if (has("solution") && !emptied.includes("solution"))
        write(`${folder}/solution/src/widgets.ts`, `export const mode = "solution";\n`);
    },
    [Symbol.dispose]() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function passing(results: { title: string; passed?: boolean }[]): HiddenTestResult[] {
  return results.map(({ title, passed = true }) => ({ title, passed }));
}

function fakeHiddenTests() {
  let solution: HiddenTestResult[] = [];
  let starter: HiddenTestResult[] | undefined;

  return {
    onSolution(results: { title: string; passed?: boolean }[]) {
      solution = passing(results);
    },
    onStarter(results: { title: string; passed?: boolean }[]) {
      starter = passing(results);
    },
    run(_taskFolder: string, against: CodeUnderTest = "solution"): HiddenTestResult[] {
      if (against === "solution") return solution;
      return starter ?? solution.map(({ title }) => ({ title, passed: false }));
    },
  };
}

function fakeRepository() {
  let uncommittedChanges = false;

  return {
    addUncommittedChanges() {
      uncommittedChanges = true;
    },
    hasUncommittedChanges(): boolean {
      return uncommittedChanges;
    },
  };
}

type StartedTrial = { task: string; agent: string };

function fakeTrials() {
  const started: StartedTrial[] = [];

  return {
    started,
    start(trial: StartedTrial) {
      started.push(trial);
    },
  };
}

type HarborRun = { args: string[] };

type TrialOutput = {
  /** The trial's `agent_execution` timing in `result.json`: the agent's own run. */
  agentStartedAt: string;
  agentFinishedAt: string;
  /** The final `result` message of Claude Code's stream-json output. */
  claudeResult: Record<string, unknown>;
};

// A fake Harbor: records the args it was run with and leaves a recorded output folder under `-o`.
// It simulates nothing of what Harbor does with the task folder.
function fakeHarbor() {
  const runs: HarborRun[] = [];
  let output: TrialOutput | undefined;

  // Harbor's layout: `<jobs>/<job>/<trial>/result.json` (a TrialResult) and, for the
  // `claude-code` agent, `agent/claude-code.txt`, the agent's stream-json output teed by Harbor.
  function leaveOutputFolder(
    jobsFolder: string,
    { agentStartedAt, agentFinishedAt, claudeResult }: TrialOutput,
  ) {
    const trialFolder = join(jobsFolder, "2026-11-09__14-00-00", "widgets__k7Qp2Xa");
    mkdirSync(join(trialFolder, "agent"), { recursive: true });
    writeFileSync(
      join(trialFolder, "result.json"),
      JSON.stringify({
        task_name: "widgets",
        trial_name: "widgets__k7Qp2Xa",
        // The whole trial, environment build and verifier included: longer than the agent's run.
        started_at: "2026-11-09T13:55:00.000000Z",
        finished_at: "2026-11-09T14:10:00.000000Z",
        environment_setup: {
          started_at: "2026-11-09T13:55:00.000000Z",
          finished_at: "2026-11-09T13:58:00.000000Z",
        },
        agent_execution: { started_at: agentStartedAt, finished_at: agentFinishedAt },
        exception_info: null,
      }),
    );
    const systemMessage = { type: "system", subtype: "init", model: "claude-opus-4-1" };
    writeFileSync(
      join(trialFolder, "agent", "claude-code.txt"),
      [
        "Not JSON: a line of the agent's other output",
        JSON.stringify(systemMessage),
        JSON.stringify(claudeResult),
        "",
      ].join("\n"),
    );
  }

  return {
    runs,
    /** What `harbor run` leaves in its output folder. */
    leavesOutput(trialOutput: TrialOutput) {
      output = trialOutput;
    },
    run: (args: string[]) => {
      runs.push({ args });
      const jobsFolder = args[args.indexOf("-o") + 1];
      if (output !== undefined && jobsFolder !== undefined) leaveOutputFolder(jobsFolder, output);
      return { exitCode: 0 };
    },
    /** The task folder the trial gave Harbor, `harbor run -p <task folder>`. */
    taskFolder: (): string => {
      const args = runs[0]?.args ?? [];
      return args[args.indexOf("-p") + 1] ?? "";
    },
  };
}

/** Every file under a folder outside `.git`, relative to it and sorted. */
function filesUnder(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(folder.length + 1))
    .filter((path) => !path.startsWith(".git/"))
    .toSorted();
}

function fileText(folder: string, path: string): string | undefined {
  return existsSync(join(folder, path)) ? readFileSync(join(folder, path), "utf8") : undefined;
}

function isGitRoot(folder: string): boolean {
  if (!existsSync(join(folder, ".git"))) return false;
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: folder,
    encoding: "utf8",
  });
  return root.trim() === realpathSync(folder);
}

export const test = base
  .extend("tasks", ({}, { onCleanup }) => {
    const tasks = benchmarkTasks();
    onCleanup(() => tasks[Symbol.dispose]());
    return tasks;
  })
  .extend("hiddenTests", () => fakeHiddenTests())
  .extend("repository", () => fakeRepository())
  .extend("trials", () => fakeTrials())
  .extend("folders", () => ({ filesUnder, fileText, isGitRoot }))
  .extend("harbor", () => fakeHarbor())
  .extend("workFolder", ({}, { onCleanup }) => {
    const folder = mkdtempSync(join(tmpdir(), "benchmark-trial-"));
    onCleanup(() => rmSync(folder, { recursive: true, force: true }));
    return folder;
  });
