import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const CASES_FOLDER = "tools/intent-evals/cases";

/** What a case's tests do to its scenario, or that they are right. */
export const KINDS = [
  "misses-requirement",
  "checks-something-else",
  "setup-hides-requirement",
  "contradicts-requirement",
  "adds-requirement",
  "tests-are-right",
] as const;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

/** `judge-003-setup-hides-every-line`: a number that never changes, then what the case tests. */
const FOLDER_NAME = /^judge-(?<number>\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const edit = z.strictObject({
  file: z.string().min(1),
  find: z.array(z.string()).min(1),
  replace: z.array(z.string()),
});

const target = {
  example: z.string().min(1),
  scenario: z.string().regex(/^B\d+$/u),
  difficulty: z.enum(DIFFICULTIES),
};

const planted = { ...target, plant: z.array(edit).min(1) };

// A bug shows a planted gap is real: the tests catch it until the gap is planted. A contradiction
// needs none, and an added requirement can't be shown by one; its README says why it's added.
const caseFile = z.discriminatedUnion("kind", [
  z.strictObject({
    ...planted,
    kind: z.enum(["misses-requirement", "checks-something-else", "setup-hides-requirement"]),
    quote: z.string().min(1),
    bug: edit,
  }),
  z.strictObject({
    ...planted,
    kind: z.literal("contradicts-requirement"),
    quote: z.string().min(1),
  }),
  z.strictObject({ ...planted, kind: z.literal("adds-requirement") }),
  // The tests are right, so the judge should report nothing. The plant, if any, changes the tests
  // while keeping them right.
  z.strictObject({
    ...target,
    kind: z.literal("tests-are-right"),
    plant: z.array(edit).default([]),
  }),
]);

export type Edit = z.infer<typeof edit>;

/** A case: its folder name as `id`, its number, and its README's heading as `title`. */
export type EvalCase = z.infer<typeof caseFile> & { id: string; number: string; title: string };

export type CaseFile =
  | { path: string; evalCase: EvalCase }
  | { path: string; evalCase: undefined; invalid: string };

/** Every case folder under `cases/`, parsed or with why it isn't valid. */
export function readCaseFiles(root: string): CaseFile[] {
  const folder = join(root, CASES_FOLDER);
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .toSorted()
    .map((id) => readCaseFolder(root, id));
}

function readCaseFolder(root: string, id: string): CaseFile {
  const path = `${CASES_FOLDER}/${id}`;
  const number = FOLDER_NAME.exec(id)?.groups?.["number"];
  if (number === undefined) {
    return { path, evalCase: undefined, invalid: "the folder must be named judge-<number>-<slug>" };
  }
  const title = readmeTitle(join(root, path, "README.md"));
  if (title === undefined) {
    return { path, evalCase: undefined, invalid: "README.md must start with a # heading" };
  }
  const jsonPath = join(root, path, "case.json");
  const json = existsSync(jsonPath) ? parseJson(readFileSync(jsonPath, "utf8")) : undefined;
  const parsed = caseFile.safeParse(json);
  if (!parsed.success) {
    return { path, evalCase: undefined, invalid: `case.json: ${z.prettifyError(parsed.error)}` };
  }
  return { path, evalCase: { ...parsed.data, id, number, title } };
}

/** The text of the README's first line, after its `# `. */
function readmeTitle(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const heading = /^# (?<title>\S.*)$/u.exec(readFileSync(path, "utf8").split("\n")[0] ?? "");
  return heading?.groups?.["title"]?.trim();
}

export type CaseFilter = { example: string | undefined; id: string | undefined };

/** Cases of `example`, and the case whose id or number is `id`. */
export function matching(cases: EvalCase[], { example, id }: CaseFilter): EvalCase[] {
  return cases.filter(
    (evalCase) =>
      (example === undefined || evalCase.example === example) &&
      (id === undefined || evalCase.id === id || evalCase.number === id.padStart(3, "0")),
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
