import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { z } from "zod";
import { workingTree } from "../specs/repository.ts";
import { readSubjects, type Row } from "../specs/specs.ts";

const mutant = z.object({
  breaks: z.string(),
  file: z.string(),
  find: z.array(z.string()).min(1),
  replace: z.array(z.string()),
});

const mutantsFile = z.record(
  z.string().regex(/^B\d+$/u),
  z.object({
    // oxlint-disable-next-line unicorn/no-thenable -- the key names the spec's Then column
    then: z.string(),
    mutants: z.array(mutant),
  }),
);

export type Mutant = z.infer<typeof mutant>;

type RowMutants = z.infer<typeof mutantsFile>[string];

export type SubjectMutants = {
  rows: Row[];
  mutantsPath: string;
  mutantsByRow: Map<string, RowMutants>;
};

export function readSubjectMutants(subject: string, root: string): SubjectMutants | string {
  const spec = readSubjects(workingTree(root)).subjects.find(({ name }) => name === subject);
  if (!spec) return `unknown subject: ${subject}`;

  const mutantsPath = posix.join(posix.dirname(spec.path), "mutants.json");
  if (!existsSync(join(root, mutantsPath)))
    return `no mutants for ${subject}: expected ${mutantsPath}`;

  const parsed = mutantsFile.safeParse(JSON.parse(readFileSync(join(root, mutantsPath), "utf8")));
  if (!parsed.success) return `${mutantsPath} is not valid: ${z.prettifyError(parsed.error)}`;
  return { rows: spec.rows, mutantsPath, mutantsByRow: new Map(Object.entries(parsed.data)) };
}

export function withMutantPlanted<T>(planted: Mutant, root: string, run: () => T): T | "stale" {
  const path = join(root, planted.file);
  if (!existsSync(path)) return "stale";
  const original = readFileSync(path, "utf8");
  const find = planted.find.join("\n");
  if (original.split(find).length !== 2) return "stale";

  writeFileSync(
    path,
    original.replace(find, () => planted.replace.join("\n")),
  );
  try {
    return run();
  } finally {
    writeFileSync(path, original);
  }
}

export function stopOnInterrupt(): () => boolean {
  let interrupted = false;
  process.on("SIGINT", () => {
    interrupted = true;
  });
  return () => interrupted;
}
