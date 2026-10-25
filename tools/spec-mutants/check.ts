import { spawnSync } from "node:child_process";
import { readSubjectMutants, stopOnInterrupt, withMutantPlanted } from "./mutants.ts";

const SRC_ONLY_TSCONFIG = "tools/spec-mutants/src.tsconfig.json";

function check(args: string[], root: string): number {
  const [subject] = args;
  if (!subject || args.length !== 1) {
    process.stdout.write("usage: pnpm spec:mutants:check <subject>\n");
    return 1;
  }
  const loaded = readSubjectMutants(subject, root);
  if (typeof loaded === "string") {
    process.stdout.write(`${loaded}\n`);
    return 1;
  }
  const unmutated = typeErrors(root);
  if (unmutated) {
    process.stdout.write(`src/ must typecheck before any mutant is planted:\n${unmutated}`);
    return 1;
  }

  const interrupted = stopOnInterrupt();
  let problems = 0;
  for (const [id, rowMutants] of loaded.mutantsByRow) {
    const row = loaded.rows.find((specRow) => specRow.id === id);
    if (!row) {
      problems++;
      process.stdout.write(`${id}  not a row in the spec\n`);
      continue;
    }
    if (rowMutants.then !== row.thenText) {
      problems++;
      process.stdout.write(`${id}  then differs from the spec; copy the row's Then exactly\n`);
    }
    for (const mutant of rowMutants.mutants) {
      if (interrupted()) return 1;
      const errors = withMutantPlanted(mutant, root, () => typeErrors(root));
      if (errors === "stale") {
        problems++;
        process.stdout.write(
          `${id}  stale   ${mutant.breaks}: find must appear exactly once in ${mutant.file}\n`,
        );
      } else if (errors) {
        problems++;
        process.stdout.write(`${id}  broken  ${mutant.breaks}: it doesn't typecheck\n${errors}`);
      } else {
        process.stdout.write(`${id}  ok      ${mutant.breaks}\n`);
      }
    }
  }

  const unmutatedRows = loaded.rows.filter(
    (row) => row.verified.kind === "test" && !loaded.mutantsByRow.has(row.id),
  );
  if (unmutatedRows.length > 0) {
    process.stdout.write(`no mutants yet for ${unmutatedRows.map((row) => row.id).join(", ")}\n`);
  }
  process.stdout.write(
    problems === 0
      ? "spec:mutants:check passed\n"
      : `spec:mutants:check failed · ${problems} problems\n`,
  );
  return problems === 0 ? 0 : 1;
}

function typeErrors(root: string): string {
  const result = spawnSync("pnpm", ["exec", "tsc", "-p", SRC_ONLY_TSCONFIG], {
    cwd: root,
    encoding: "utf8",
  });
  return result.status === 0 ? "" : result.stdout;
}

if (import.meta.main) process.exitCode = check(process.argv.slice(2), process.cwd());
