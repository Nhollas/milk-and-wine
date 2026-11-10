import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUG_VERDICT, readTaskFiles, type Task } from "./task-files.ts";
import {
  filesUnder,
  fixtureFolder,
  FIXTURES_FOLDER,
  inWorkspace,
  outcomeOf,
  runTests,
  testedScenarios,
} from "./workspace.ts";

type CheckResult = { exitCode: number; output: string };

/** A line of the report: one task's verdict, or a message about a folder or a fixture. */
type Line = { id?: string; label?: string; text: string; problem: boolean };

const LABEL_WIDTH = "not a gap".length;

const PARALLEL = 4;

/** Files in a task's environment that only build its image. */
const IMAGE_FILES = new Set(["Dockerfile"]);

const TEST_FILE = /\.test\.ts$/u;

/** Checks every task is a real gap in its fixture's tests, or right, without running the judge. */
export async function check(root: string): Promise<CheckResult> {
  const files = readTaskFiles(root);
  const lines: Line[] = files.flatMap((file) =>
    "invalid" in file ? [problem(`${file.path} is not valid:\n${file.invalid}`)] : [],
  );
  const tasks = files.flatMap((file) => ("task" in file ? [file.task] : []));
  lines.push(...duplicates(tasks));

  for (const fixture of new Set(tasks.map((task) => task.fixture))) {
    const own = tasks.filter((task) => task.fixture === fixture);
    lines.push(...(await checkFixture(fixture, own, root)));
  }

  const problems = lines.filter((line) => line.problem).length;
  const verdict = problems === 0 ? "eval:check passed" : `eval:check failed · ${problems} problems`;
  return {
    exitCode: problems === 0 ? 0 : 1,
    output: `${[...render(lines), verdict].join("\n")}\n`,
  };
}

async function checkFixture(fixture: string, tasks: Task[], root: string): Promise<Line[]> {
  const tested = testedScenarios(root, fixture);
  if (tested === undefined) {
    return tasks.map((task) =>
      taskLine(task, "unknown", `no fixture at ${FIXTURES_FOLDER}/${fixture}`, true),
    );
  }

  const asTheyAre = await inWorkspace(root, fixture, [], runTests);
  const failing = asTheyAre.filter((test) => test.status === "failed").map((test) => test.title);
  const untested = tested.filter((id) => outcomeOf(asTheyAre, id) === "found no test");
  if (failing.length > 0 || untested.length > 0) {
    const reasons = [
      ...failing.map((title) => `"${title}" fails`),
      ...untested.map((id) => `${id} has no test`),
    ];
    return [problem(`${fixture}: tests must pass as they are, but ${reasons.join(", ")}`)];
  }

  const lines: Line[] = [];
  const queue = tasks.entries();
  const worker = async () => {
    for (const [index, task] of queue) lines[index] = await checkTask(task, tested, root);
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, tasks.length) }, worker));
  return lines;
}

async function checkTask(task: Task, tested: string[], root: string): Promise<Line> {
  const { fixture, expected, title } = task;
  if (!tested.includes(expected.scenario)) {
    return taskLine(
      task,
      "unknown",
      `${fixture} has no scenario ${expected.scenario} verified by a test`,
      true,
    );
  }
  const leaked = filesUnder(join(task.folder, "environment")).find((file) => isCodeUnderTest(file));
  if (leaked) return taskLine(task, "leaks", `environment/${leaked} is code under test`, true);
  const copyProblem = staleCopy(task, root);
  if (copyProblem) return taskLine(task, "stale", copyProblem, true);

  const environment = join(task.folder, "environment");
  const bug = join(task.folder, "bug");
  const scenarioTests = (overlays: string[]) =>
    inWorkspace(root, fixture, overlays, async (directory) =>
      outcomeOf(await runTests(directory), expected.scenario),
    );
  if (expected.verdict === BUG_VERDICT) {
    if ((await scenarioTests([bug])) === "passed") {
      return taskLine(task, "not a gap", "the tests pass with the bug alone", true);
    }
    if ((await scenarioTests([bug, environment])) !== "passed") {
      return taskLine(task, "not a gap", "the tests still fail once the gap is planted", true);
    }
  } else if (
    expected.verdict === "contradicts_requirement" &&
    (await scenarioTests([environment])) !== "failed"
  ) {
    return taskLine(task, "not a gap", "the tests don't fail with the contradiction planted", true);
  } else if (expected.verdict === "aligned" && (await scenarioTests([environment])) !== "passed") {
    return taskLine(task, "fails", "the tests fail against the fixture's code", true);
  }
  return taskLine(task, "ok", `${expected.verdict}: ${title}`, false);
}

/**
 * What's wrong with a task's copies of its fixture: its environment holds the fixture's files with
 * only tests changed, and its bug holds the fixture's code with only code changed.
 */
function staleCopy(task: Task, root: string): string | undefined {
  const fixture = fixtureFolder(root, task.fixture);
  const fixtureFiles = new Set(filesUnder(fixture));
  for (const file of filesUnder(join(task.folder, "environment"))) {
    if (IMAGE_FILES.has(file)) continue;
    if (!fixtureFiles.has(file)) return `environment/${file} is not in ${task.fixture}`;
    if (TEST_FILE.test(file)) continue;
    const copy = readFileSync(join(task.folder, "environment", file), "utf8");
    if (copy !== readFileSync(join(fixture, file), "utf8")) {
      return `environment/${file} differs from ${task.fixture}'s`;
    }
  }
  for (const file of filesUnder(join(task.folder, "bug"))) {
    if (!fixtureFiles.has(file) || !isCodeUnderTest(file)) {
      return `bug/${file} is not code under test in ${task.fixture}`;
    }
  }
  return undefined;
}

function isCodeUnderTest(file: string): boolean {
  return file.startsWith("src/") && !TEST_FILE.test(file);
}

/** Two tasks with one number would be told apart by their slugs alone, which may change. */
function duplicates(tasks: Task[]): Line[] {
  const numbers = new Set(tasks.map((task) => task.number));
  return [...numbers].flatMap((number) => {
    const sharing = tasks.filter((task) => task.number === number);
    return sharing.length < 2
      ? []
      : sharing.map((task) => taskLine(task, "duplicate", `number ${number} is used twice`, true));
  });
}

function taskLine(task: Task, label: string, text: string, isProblem: boolean): Line {
  return { id: task.id, label, text, problem: isProblem };
}

function render(lines: Line[]): string[] {
  const idWidth = Math.max(0, ...lines.map((line) => line.id?.length ?? 0));
  return lines.map((line) =>
    line.id === undefined || line.label === undefined
      ? line.text
      : `${line.id.padEnd(idWidth)}  ${line.label.padEnd(LABEL_WIDTH)}  ${line.text}`,
  );
}

function problem(text: string): Line {
  return { text, problem: true };
}

if (import.meta.main) {
  const { exitCode, output } = await check(process.cwd());
  process.stdout.write(output);
  process.exitCode = exitCode;
}
