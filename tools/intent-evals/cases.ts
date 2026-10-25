import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { workingTree } from "../spec-status/repository.ts";
import { readSubjects, type TestLevel } from "../spec-status/specs.ts";

const CASES_FOLDER = "tools/intent-evals/cases";

const edit = z.object({
  file: z.string(),
  find: z.array(z.string()).min(1),
  replace: z.array(z.string()),
});

const caseFile = z.object({
  gap: z.string(),
  split: z.enum(["dev", "heldout"]),
  row: z.string().regex(/^B\d+$/u),
  part: z.string().min(1),
  weaken: z.array(edit).min(1),
  bug: edit,
});

export type Edit = z.infer<typeof edit>;

export type EvalCase = z.infer<typeof caseFile> & { id: string; subject: string };

export function readCases(root: string): EvalCase[] {
  const folder = join(root, CASES_FOLDER);
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap(({ name: subject }) =>
      readdirSync(join(folder, subject))
        .filter((file) => file.endsWith(".json"))
        .toSorted()
        .map((file) => {
          const path = join(CASES_FOLDER, subject, file);
          const parsed = caseFile.safeParse(JSON.parse(readFileSync(join(root, path), "utf8")));
          if (!parsed.success)
            throw new Error(`${path} is not valid: ${z.prettifyError(parsed.error)}`);
          return { ...parsed.data, id: file.replace(/\.json$/u, ""), subject };
        }),
    );
}

export type CaseFilter = { subject: string | undefined; id: string | undefined };

export function matching(cases: EvalCase[], { subject, id }: CaseFilter): EvalCase[] {
  return cases.filter(
    (evalCase) =>
      (subject === undefined || evalCase.subject === subject) &&
      (id === undefined || evalCase.id === id),
  );
}

/** The rows of a subject that a test proves, with the level of that test. */
export function testedRows(root: string, subject: string): Map<string, TestLevel> {
  const found = readSubjects(workingTree(root)).subjects.find(({ name }) => name === subject);
  if (!found) throw new Error(`unknown subject: ${subject}`);
  return new Map(
    found.rows.flatMap((row) =>
      row.verified.kind === "test" ? [[row.id, row.verified.level]] : [],
    ),
  );
}
