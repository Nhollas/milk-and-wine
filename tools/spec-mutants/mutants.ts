import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { z } from "zod";
import { workingTree } from "../specs/repository.ts";
import { readSubjects, type Scenario } from "../specs/specs.ts";

export const mutant = z.object({
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

type ScenarioMutants = z.infer<typeof mutantsFile>[string];

export type SubjectMutants = {
  scenarios: Scenario[];
  mutantsPath: string;
  mutantsByScenario: Map<string, ScenarioMutants>;
};

export function readSubjectMutants(subject: string, root: string): SubjectMutants | string {
  const spec = readSubjects(workingTree(root)).subjects.find(({ name }) => name === subject);
  if (!spec) return `unknown subject: ${subject}`;

  const mutantsPath = posix.join(posix.dirname(spec.path), "mutants.json");
  if (!existsSync(join(root, mutantsPath)))
    return `no mutants for ${subject}: expected ${mutantsPath}`;

  const parsed = mutantsFile.safeParse(parseJson(readFileSync(join(root, mutantsPath), "utf8")));
  if (!parsed.success) return `${mutantsPath} is not valid: ${z.prettifyError(parsed.error)}`;
  return {
    scenarios: spec.scenarios,
    mutantsPath,
    mutantsByScenario: new Map(Object.entries(parsed.data)),
  };
}

export function isStale(planted: Mutant, root: string): boolean {
  const path = join(root, planted.file);
  return (
    !existsSync(path) || readFileSync(path, "utf8").split(planted.find.join("\n")).length !== 2
  );
}

export function plant(planted: Mutant, source: string): string {
  return source.replace(planted.find.join("\n"), () => planted.replace.join("\n"));
}

export function withMutantPlanted<T>(planted: Mutant, root: string, run: () => T): T {
  const path = join(root, planted.file);
  const original = readFileSync(path, "utf8");
  writeFileSync(path, plant(planted, original));
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

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
