import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test as base } from "vitest";

type TaskPart = "spec" | "issue" | "ticket" | "starter code" | "hidden tests" | "solution";

type FolderPart = Exclude<TaskPart, "spec" | "issue">;

type TaskOptions = {
  scenarios?: string[];
  hiddenTests?: string[];
  without?: TaskPart[];
  emptied?: FolderPart[];
};

type HiddenTestResult = { title: string; passed: boolean };

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

function hiddenTestsSource(titles: string[]): string {
  return [
    `import { test } from "vitest";`,
    "",
    ...titles.map((title) => `test("${title}", () => {});`),
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
    addTask(
      name: string,
      {
        scenarios = ["B1"],
        hiddenTests = ["B1: costs 2 each"],
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
        write(`${folder}/starter/src/widgets.ts`, `export {};\n`);
      if (has("hidden tests") && !emptied.includes("hidden tests")) {
        write(`${folder}/tests/widgets.service.test.ts`, hiddenTestsSource(hiddenTests));
      }
      if (has("solution") && !emptied.includes("solution"))
        write(`${folder}/solution/src/widgets.ts`, `export {};\n`);
    },
    [Symbol.dispose]() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function fakeHiddenTests() {
  let solution: HiddenTestResult[] = [];

  return {
    onSolution(solutionResults: HiddenTestResult[]) {
      solution = solutionResults;
    },
    run(_taskFolder: string): HiddenTestResult[] {
      return solution;
    },
  };
}

export const test = base
  .extend("tasks", ({}, { onCleanup }) => {
    const tasks = benchmarkTasks();
    onCleanup(() => tasks[Symbol.dispose]());
    return tasks;
  })
  .extend("hiddenTests", () => fakeHiddenTests());
