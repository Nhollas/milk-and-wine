import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { z } from "zod";
import { EVALS_FOLDER } from "./workspace.ts";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

/** The verdict that says the tests don't show a requirement, and so needs a bug to prove it. */
export const BUG_VERDICT = "misses_requirement";

/** `judge-003-setup-hides-every-line`: a number that never changes, then what the task tests. */
const FOLDER_NAME = /^judge-(?<number>\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const taskToml = z.object({
  metadata: z.strictObject({ fixture: z.string().min(1), difficulty: z.enum(DIFFICULTIES) }),
});

const scenario = z.string().regex(/^B\d+$/u);

const requirement = z.string().min(1);
const testLine = z.int().positive();

const requirementVerdict = z.enum([BUG_VERDICT, "contradicts_requirement"]);

// Something else the planted tests get wrong, which the judge may report without it counting as a
// false alarm: a requirement's words with the verdict that is true of it, or the line of a check
// the scenario doesn't ask for.
const fair = z
  .array(
    z.union([
      z.strictObject({ requirement, verdict: requirementVerdict }),
      z.strictObject({ test_line: testLine }),
    ]),
  )
  .optional();

// What the judge should report on the task's scenario, in its own verdicts.
const expectedFile = z.discriminatedUnion("verdict", [
  z.strictObject({ scenario, verdict: z.literal("aligned") }),
  z.strictObject({
    scenario,
    verdict: requirementVerdict,
    requirement,
    fair,
  }),
  z.strictObject({ scenario, verdict: z.literal("adds_requirement"), test_line: testLine, fair }),
]);

/** A task: its folder name as `id`, its number, its README's heading as `title`, and its parts. */
export type Task = z.infer<typeof taskToml>["metadata"] & {
  id: string;
  number: string;
  title: string;
  folder: string;
  expected: z.infer<typeof expectedFile>;
};

export type TaskFile = { path: string; task: Task } | { path: string; invalid: string };

/** The folders beside the tasks: the fixtures, and the results Harbor writes. */
const OWN_FOLDERS = new Set(["fixtures", "results"]);

/** Every task folder under the evals folder, parsed or with why it isn't valid. */
export function readTaskFiles(root: string): TaskFile[] {
  const folder = join(root, EVALS_FOLDER);
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !OWN_FOLDERS.has(entry.name))
    .map(({ name }) => name)
    .toSorted()
    .map((id) => readTaskFolder(root, id));
}

function readTaskFolder(root: string, id: string): TaskFile {
  const path = `${EVALS_FOLDER}/${id}`;
  const folder = join(root, path);
  const invalid = (reason: string) => ({ path, invalid: reason });

  const number = FOLDER_NAME.exec(id)?.groups?.["number"];
  if (number === undefined) return invalid("the folder must be named judge-<number>-<slug>");
  const title = readmeTitle(join(folder, "README.md"));
  if (title === undefined) return invalid("README.md must start with a # heading");

  const toml = taskToml.safeParse(parsed(join(folder, "task.toml"), parseToml));
  if (!toml.success) return invalid(`task.toml: ${z.prettifyError(toml.error)}`);
  const expected = expectedFile.safeParse(parsed(join(folder, "tests/expected.json"), JSON.parse));
  if (!expected.success) return invalid(`tests/expected.json: ${z.prettifyError(expected.error)}`);
  if (expected.data.verdict === BUG_VERDICT && !existsSync(join(folder, "bug"))) {
    return invalid(`bug/ must hold the code change that ${BUG_VERDICT} lets through`);
  }

  return {
    path,
    task: { ...toml.data.metadata, id, number, title, folder, expected: expected.data },
  };
}

/** The text of the README's first line, after its `# `. */
function readmeTitle(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const heading = /^# (?<title>\S.*)$/u.exec(readFileSync(path, "utf8").split("\n")[0] ?? "");
  return heading?.groups?.["title"]?.trim();
}

function parsed(path: string, parse: (text: string) => unknown): unknown {
  if (!existsSync(path)) return undefined;
  try {
    return parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}
