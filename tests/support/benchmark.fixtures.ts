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

type HarborCall = { command: string; args: string[]; env: Record<string, string> };

type TrialOutput = {
  startedAt: string;
  finishedAt: string;
  claudeResult: Record<string, unknown>;
};

// The process call that starts `harbor run`. It records its arguments and writes Harbor's
// output layout (`<jobs>/<job>/<trial>/result.json`, `agent/`) under the `-o` folder.
function fakeHarborProcess() {
  const calls: HarborCall[] = [];
  let output: TrialOutput | undefined;

  function writeTrialOutput(
    jobsFolder: string,
    { startedAt, finishedAt, claudeResult }: TrialOutput,
  ) {
    const trialFolder = join(jobsFolder, "2026-11-09__14-00-00", "widgets__k7Qp2Xa");
    mkdirSync(join(trialFolder, "agent"), { recursive: true });
    mkdirSync(join(trialFolder, "verifier"), { recursive: true });
    writeFileSync(
      join(trialFolder, "result.json"),
      JSON.stringify({
        task_name: "widgets",
        trial_name: "widgets__k7Qp2Xa",
        started_at: startedAt,
        finished_at: finishedAt,
        exception_info: null,
        agent_result: { n_input_tokens: 0, n_cache_tokens: 0, n_output_tokens: 0 },
        verifier_result: null,
      }),
    );
    writeFileSync(join(trialFolder, "agent", "claude.json"), JSON.stringify(claudeResult));
  }

  return {
    calls,
    /** What the next `harbor run` leaves in its output folder. */
    producesTrial(trialOutput: TrialOutput) {
      output = trialOutput;
    },
    run(command: string, args: string[], env: Record<string, string>) {
      calls.push({ command, args, env });
      const jobsFolder = args[args.indexOf("-o") + 1];
      if (output !== undefined && jobsFolder !== undefined) writeTrialOutput(jobsFolder, output);
      return { exitCode: 0 };
    },
    /** The task folder the trial handed to `harbor run -p`. */
    taskFolder(): string {
      return this.calls[0]?.args[this.calls[0].args.indexOf("-p") + 1] ?? "";
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
  .extend("harbor", () => fakeHarborProcess())
  .extend("workFolder", ({}, { onCleanup }) => {
    const folder = mkdtempSync(join(tmpdir(), "benchmark-trial-"));
    onCleanup(() => rmSync(folder, { recursive: true, force: true }));
    return folder;
  });
